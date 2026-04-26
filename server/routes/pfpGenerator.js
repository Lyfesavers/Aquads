const express = require('express');
const mongoose = require('mongoose');
const sharp = require('sharp');
const User = require('../models/User');
const PfpGeneration = require('../models/PfpGeneration');
const auth = require('../middleware/auth');

const router = express.Router();

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Hard cap on the number of stored PFPs per user. When a user is at this
// number, they must delete one before they can generate another. This keeps
// our MongoDB storage predictable (~5 × 500KB JPEG = ~2.5 MB per active user).
const STORAGE_CAP = 5;
// JPEG quality used when re-encoding OpenAI's PNG output before storage.
// 88 is the standard "visually indistinguishable from PNG" sweet spot for
// illustrations with flat backgrounds; produces ~300–500 KB per 1024×1024.
const JPEG_QUALITY = 88;

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

  const backgroundIsYellow = Math.random() < 0.5;
  const backgroundColor = backgroundIsYellow ? '#febc10' : '#51159d';
  const textColor = backgroundIsYellow ? '#51159d' : '#febc10';
  const backgroundName = backgroundIsYellow ? 'bright Aquads yellow' : 'deep Aquads purple';
  const textName = backgroundIsYellow ? 'deep Aquads purple' : 'bright Aquads yellow';

  return [
    'ultra high quality anthropomorphic TURTLE mascot for AQUADS branding identity',
    genderModifiers,
    `AQUADS logo and any AQUADS text MUST ALWAYS be rendered in solid ${textName} color hex ${textColor}, no other color, no gradient, no shading on the text, must contrast strongly with the background`,
    'AQUADS wordmark clearly visible, centered, sharp, legible, spelled exactly as A-Q-U-A-D-S',
    `logo curved like a smile at bottom in the same ${textName} ${textColor}`,
    'centered circular profile portrait',
    'pencil sketch style illustration',
    'monochrome graphite shading with clean linework',
    `PRIMARY COLORED ELEMENT: ${coloredTrait} (${t[coloredTrait]}), plus subtle secondary accent colors allowed ONLY for aura effects (low saturation glow), all other traits remain grayscale pencil sketch`,
    'STRICT: include ALL traits exactly as described',
    'safe margins, no cropping, fully visible face shell and body',
    `shell=${t.shell}, accessory=${t.accessory}, expression=${t.expression}, aura=${t.aura}`,
    `solid background color ONLY: ${backgroundName} ${backgroundColor}, no gradients, no white, no patterns, clean flat background. The AQUADS branding text MUST be the opposite color (${textColor}) so it contrasts strongly and stays clearly readable.`
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
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    const userId = req.user.userId;
    const [user, slotsUsed] = await Promise.all([
      User.findById(userId).select('pfpGeneratorLastAt'),
      PfpGeneration.countDocuments({ userId })
    ]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const last = user.pfpGeneratorLastAt;
    const cooldownActive = !!last && (Date.now() - last.getTime()) < WEEK_MS;
    const nextAvailableAt = cooldownActive
      ? new Date(last.getTime() + WEEK_MS).toISOString()
      : null;
    const storageFull = slotsUsed >= STORAGE_CAP;

    return res.json({
      canGenerate: !cooldownActive && !storageFull,
      nextAvailableAt,
      slotsUsed,
      slotsLimit: STORAGE_CAP,
      storageFull,
      cooldownActive
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
    // Storage cap: refuse to generate if the user already has STORAGE_CAP
    // PFPs stored. They must delete one before generating another. We check
    // this BEFORE claiming the weekly cooldown so a "storage full" rejection
    // doesn't burn the user's weekly slot.
    const slotsUsed = await PfpGeneration.countDocuments({ userId });
    if (slotsUsed >= STORAGE_CAP) {
      return res.status(403).json({
        code: 'STORAGE_FULL',
        error: `Your PFP collection is full (${STORAGE_CAP}/${STORAGE_CAP}). Delete one to make room for a new generation.`,
        slotsUsed,
        slotsLimit: STORAGE_CAP
      });
    }

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
        code: 'COOLDOWN',
        error: 'You can generate one PFP per week. Try again later.',
        nextAvailableAt: next
      });
    }

    const gender = req.body?.gender === 'female' ? 'female' : 'male';
    const t = generateTraits();
    const traitKeys = Object.keys(t);
    const coloredTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
    const prompt = buildPrompt(t, coloredTrait, gender);

    // OpenAI returns PNG bytes as base64.
    const { base64: pngBase64 } = await openaiGenerateImage(prompt);

    // Re-encode PNG → JPEG (quality 88) to cut storage by 4–5×. JPEG is
    // perfect for these PFPs because the prompt forces solid backgrounds and
    // the illustration style compresses cleanly without visible artifacts.
    let jpegBase64;
    try {
      const pngBuffer = Buffer.from(pngBase64, 'base64');
      const jpegBuffer = await sharp(pngBuffer)
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      jpegBase64 = jpegBuffer.toString('base64');
    } catch (encodeErr) {
      console.error('[pfp-generator] sharp jpeg encode failed', encodeErr);
      throw new Error('Failed to encode image. Please try again.');
    }

    const traitsForStorage = { ...t, coloredTrait, gender };

    // Persist to MongoDB. Wrapped so a save failure doesn't lose the user's
    // weekly slot — we roll back the cooldown in the outer catch.
    const saved = await PfpGeneration.create({
      userId,
      jpegBase64,
      traits: traitsForStorage,
      createdAt: new Date()
    });

    return res.json({
      id: saved._id.toString(),
      // Return the JPEG base64 so the client can display the image
      // immediately without an extra round-trip.
      imageBase64: jpegBase64,
      mimeType: 'image/jpeg',
      traits: traitsForStorage,
      createdAt: saved.createdAt.toISOString()
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

// Returns the user's stored PFP collection (newest first). We do not include
// the base64 bytes here — the client uses /image/:id to render each tile,
// which lets the browser cache them and keeps this list response small.
router.get('/list', auth, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    const userId = req.user.userId;
    const items = await PfpGeneration
      .find({ userId })
      .select('_id traits createdAt')
      .sort({ createdAt: -1 })
      .limit(STORAGE_CAP)
      .lean();

    return res.json({
      items: items.map(d => ({
        id: d._id.toString(),
        traits: d.traits || {},
        createdAt: d.createdAt ? d.createdAt.toISOString() : null
      })),
      slotsUsed: items.length,
      slotsLimit: STORAGE_CAP
    });
  } catch (e) {
    console.error('[pfp-generator] list', e);
    res.status(500).json({ error: 'Failed to load collection' });
  }
});

// Streams a stored JPEG inline (for use as <img src="/api/pfp-generator/image/:id">).
// Public so the <img> tag works without auth headers; the id is a Mongo
// ObjectId which is effectively unguessable. Cached for 1 day client-side.
router.get('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const doc = await PfpGeneration.findById(id).select('jpegBase64').lean();
    if (!doc || !doc.jpegBase64) {
      return res.status(404).json({ error: 'Not found' });
    }
    const buf = Buffer.from(doc.jpegBase64, 'base64');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.end(buf);
  } catch (e) {
    console.error('[pfp-generator] image', e);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

// Streams a stored JPEG with Content-Disposition: attachment so the browser
// will reliably download instead of opening it inline. This is the bullet-
// proof download path for mobile/iOS where blob downloads are flaky.
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const doc = await PfpGeneration.findById(id).select('jpegBase64 createdAt').lean();
    if (!doc || !doc.jpegBase64) {
      return res.status(404).json({ error: 'Not found' });
    }
    const buf = Buffer.from(doc.jpegBase64, 'base64');
    const stamp = doc.createdAt
      ? new Date(doc.createdAt).toISOString().replace(/[:.]/g, '-')
      : Date.now().toString();
    const filename = `aquads-pfp-${stamp}.jpg`;
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-cache');
    return res.end(buf);
  } catch (e) {
    console.error('[pfp-generator] download', e);
    res.status(500).json({ error: 'Failed to download' });
  }
});

// Deletes a single PFP from the user's collection, freeing one storage slot.
// Ownership is enforced by combining { _id, userId } in the delete filter.
router.delete('/pfp/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const result = await PfpGeneration.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return res.status(404).json({ error: 'PFP not found in your collection' });
    }
    const slotsUsed = await PfpGeneration.countDocuments({ userId });
    return res.json({
      success: true,
      slotsUsed,
      slotsLimit: STORAGE_CAP
    });
  } catch (e) {
    console.error('[pfp-generator] delete', e);
    res.status(500).json({ error: 'Failed to delete PFP' });
  }
});

module.exports = router;
