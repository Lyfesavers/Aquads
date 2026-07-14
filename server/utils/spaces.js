const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

let client = null;

const isConfigured = () => Boolean(
  process.env.DO_SPACES_KEY &&
  process.env.DO_SPACES_SECRET &&
  process.env.DO_SPACES_BUCKET &&
  process.env.DO_SPACES_ENDPOINT
);

const getCdnBase = () => {
  const base = (process.env.DO_SPACES_CDN_URL || process.env.DO_SPACES_ENDPOINT || '').replace(/\/$/, '');
  return base;
};

const getClient = () => {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.DO_SPACES_ENDPOINT,
      region: process.env.DO_SPACES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET
      },
      forcePathStyle: false
    });
  }
  return client;
};

const buildKey = (folder, originalName) => {
  const ext = path.extname(originalName || '').toLowerCase() || '';
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${folder}/${unique}${ext}`;
};

const toPublicUrl = (key) => `${getCdnBase()}/${key}`;

const objectExists = async (key) => {
  if (!isConfigured()) return false;
  try {
    await getClient().send(new HeadObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key
    }));
    return true;
  } catch {
    return false;
  }
};

const uploadBuffer = async (buffer, { key, contentType }) => {
  if (!isConfigured()) {
    throw new Error('DigitalOcean Spaces is not configured');
  }

  await getClient().send(new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
    ACL: 'public-read',
    CacheControl: 'public, max-age=31536000, immutable'
  }));

  return toPublicUrl(key);
};

const getObjectBuffer = async (key) => {
  if (!isConfigured()) return null;
  try {
    const res = await getClient().send(new GetObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key
    }));
    const chunks = [];
    for await (const chunk of res.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.error('[Spaces] getObjectBuffer failed:', key, err.message);
    return null;
  }
};

const isSpacesUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http')) return false;
  const cdn = getCdnBase();
  return (cdn && url.startsWith(cdn)) || url.includes('digitaloceanspaces.com');
};

const keyFromUrl = (url) => {
  if (!isSpacesUrl(url)) return null;
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
};

const filenameFromAttachment = (attachment) => {
  if (!attachment) return '';
  if (attachment.startsWith('http')) {
    return path.basename(new URL(attachment).pathname);
  }
  return path.basename(attachment);
};

module.exports = {
  isConfigured,
  buildKey,
  uploadBuffer,
  getObjectBuffer,
  objectExists,
  isSpacesUrl,
  keyFromUrl,
  filenameFromAttachment,
  toPublicUrl,
  getClient
};
