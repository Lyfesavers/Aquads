const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const traitPool = {
  shell: [
    'Classic Shell',
    'Armored Shell',
    'Neon Shell',
    'Crystal Shell',
    'Titan Shell',
    'Diamond Shell',
    'Stealth Carbon Shell'
  ],
  accessory: [
    'None',
    'Generate random cyberpunk accessories',
    'Gold Chain',
    'Cyber Visor',
    'Small Crown',
    'Plasma Gauntlet',
    'Neon Wrist Tech',
    'Pyramid Hologram Badge',
    'Stone Amulet',
    'Laser Eyes',
    'Cyborg Eyes',
    'Augmented Neon Eyes',
    'Mutant Bioluminescent Eyes',
    'Android Eye Implant',
    'Bio-Cyber Hybrid Mutation',
    'Nano Tech Eye Upgrade'
  ],
  expression: [
    'Calm',
    'Focused',
    'Happy',
    'Mysterious',
    'Battle Ready',
    'Smirk'
  ],
  aura: [
    'None',
    'Soft Glow',
    'Energy Glow',
    'Cosmic Hint',
    'Electric Pulse',
    'Golden Radiance'
  ]
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateTraits = () => ({
  shell: pick(traitPool.shell),
  accessory: pick(traitPool.accessory),
  expression: pick(traitPool.expression),
  aura: pick(traitPool.aura)
});

const buildPrompt = (t, coloredTrait, gender) => {
  const genderModifiers =
    gender === 'female'
      ? 'sleek athletic female turtle warrior, agile powerful stance, elegant but strong physique'
      : 'muscular male turtle bodybuilder, heavy powerful physique, broad shoulders, strong stance';

  return [
    'ultra high quality anthropomorphic TURTLE mascot for AQUADS branding identity',
    genderModifiers,
    'AQUADS logo clearly visible and centered',
    'logo curved like a smile at bottom',
    'centered circular profile portrait',
    'pencil sketch style illustration',
    'monochrome graphite shading with clean linework',
    `PRIMARY COLORED ELEMENT: ${coloredTrait} (${t[coloredTrait]}), plus subtle secondary accent colors allowed ONLY for aura effects (low saturation glow), all other traits remain grayscale pencil sketch`,
    'STRICT: include ALL traits exactly as described',
    'safe margins, no cropping, fully visible face shell and body',
    `shell=${t.shell}, accessory=${t.accessory}, expression=${t.expression}, aura=${t.aura}`,
    'solid background color ONLY: either bright yellow #febc10 OR deep purple #51159d, no gradients, no white, no patterns, clean flat background'
  ].join(', ');
};

async function openaiGenerateImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    const err = new Error('Image generation is not configured');
    err.code = 'MISSING_KEY';
    throw err;
  }

  const payload = {
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    response_format: 'b64_json'
  };

  let res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(payload)
  });

  let data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || '';
    if (payload.response_format && /response_format|b64/i.test(msg)) {
      delete payload.response_format;
      res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error?.message || 'OpenAI image generation failed');
    err.status = res.status;
    throw err;
  }

  const item = data?.data?.[0];
  if (item?.b64_json) {
    return { base64: item.b64_json, mimeType: 'image/png' };
  }

  if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) {
      throw new Error('Failed to fetch generated image URL');
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const mime =
      imgRes.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
    return { base64: buf.toString('base64'), mimeType: mime };
  }

  throw new Error('Invalid image response from OpenAI');
}

router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('pfpGeneratorLastAt');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const last = user.pfpGeneratorLastAt;
    if (!last) {
      return res.json({ canGenerate: true, nextAvailableAt: null });
    }
    const elapsed = Date.now() - last.getTime();
    if (elapsed >= WEEK_MS) {
      return res.json({ canGenerate: true, nextAvailableAt: null });
    }
    return res.json({
      canGenerate: false,
      nextAvailableAt: new Date(last.getTime() + WEEK_MS).toISOString()
    });
  } catch (e) {
    console.error('[pfp-generator] status', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/generate', auth, async (req, res) => {
  const userId = req.user.userId;
  let prevLast = null;

  try {
    const userDoc = await User.findById(userId).select('pfpGeneratorLastAt');
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }
    prevLast = userDoc.pfpGeneratorLastAt || null;

    const eligibleQuery = {
      _id: userId,
      $or: [
        { pfpGeneratorLastAt: null },
        { pfpGeneratorLastAt: { $exists: false } },
        { pfpGeneratorLastAt: { $lte: new Date(Date.now() - WEEK_MS) } }
      ]
    };

    const claimed = await User.findOneAndUpdate(
      eligibleQuery,
      { $set: { pfpGeneratorLastAt: new Date() } },
      { new: true }
    );

    if (!claimed) {
      const u = await User.findById(userId).select('pfpGeneratorLastAt');
      const next = u?.pfpGeneratorLastAt
        ? new Date(u.pfpGeneratorLastAt.getTime() + WEEK_MS).toISOString()
        : null;
      return res.status(429).json({
        error: 'You can generate one PFP per week. Try again later.',
        nextAvailableAt: next
      });
    }

    const gender = req.body?.gender === 'female' ? 'female' : 'male';
    const t = generateTraits();
    const traitKeys = Object.keys(t);
    const coloredTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
    const prompt = buildPrompt(t, coloredTrait, gender);

    const { base64, mimeType } = await openaiGenerateImage(prompt);

    return res.json({
      imageBase64: base64,
      mimeType,
      traits: { ...t, coloredTrait }
    });
  } catch (err) {
    try {
      if (prevLast) {
        await User.findByIdAndUpdate(userId, { $set: { pfpGeneratorLastAt: prevLast } });
      } else {
        await User.findByIdAndUpdate(userId, { $unset: { pfpGeneratorLastAt: 1 } });
      }
    } catch (rollbackErr) {
      console.error('[pfp-generator] rollback failed', rollbackErr);
    }

    console.error('[pfp-generator] generate', err);
    const status = err.status && Number(err.status) >= 400 ? err.status : 500;
    const message =
      err.code === 'MISSING_KEY'
        ? 'Image generation is not configured on the server.'
        : err.message || 'Generation failed';
    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  }
});

module.exports = router;
