/**
 * Migrate legacy Railway uploads → DigitalOcean Spaces CDN.
 *
 * Covers:
 *  1. Disk files under server/uploads/ and server/uploads/bookings/
 *  2. MongoDB media blobs (UserImage, ServiceImage, BlogImage)
 *  3. DB URL fields that still point at /uploads/... or Railway /api/.../media/:id
 *
 * Usage (from server/):
 *   node migrations/migrate-uploads-to-spaces.js --dry-run
 *   node migrations/migrate-uploads-to-spaces.js
 *
 * Requires env: MONGODB_URI, DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_BUCKET,
 *               DO_SPACES_ENDPOINT, DO_SPACES_CDN_URL
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const spaces = require('../utils/spaces');
const { normalizeBlogContentMediaUrls } = require('../utils/blogContentUrls');

const DRY_RUN = process.argv.includes('--dry-run');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquads';
const UPLOADS_ROOT = path.join(__dirname, '../uploads');

const stats = {
  diskScanned: 0,
  diskUploaded: 0,
  diskSkipped: 0,
  diskErrors: 0,
  dbRefsUpdated: 0,
  mongoImagesUploaded: 0,
  mongoImagesSkipped: 0,
  mongoImagesErrors: 0
};

// oldPathOrUrl -> new CDN URL
const pathMap = new Map();

const log = (...args) => console.log(DRY_RUN ? '[DRY-RUN]' : '', ...args);

const railwayBases = [
  'https://aquads-production.up.railway.app',
  process.env.PUBLIC_UPLOAD_BASE_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null
].filter(Boolean).map((b) => b.replace(/\/$/, ''));

const normalizeUploadPath = (value) => {
  if (!value || typeof value !== 'string') return null;
  let v = value.trim();
  for (const base of railwayBases) {
    if (v.startsWith(base)) v = v.slice(base.length);
  }
  if (!v.startsWith('/uploads/')) return null;
  return v;
};

const resolveMappedUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  if (spaces.isSpacesUrl(value)) return value;

  const normalized = normalizeUploadPath(value);
  if (normalized && pathMap.has(normalized)) return pathMap.get(normalized);

  // Also try matching by filename for booking paths
  if (value.includes('/uploads/')) {
    const filename = path.basename(value.split('?')[0]);
    for (const [oldPath, newUrl] of pathMap.entries()) {
      if (path.basename(oldPath) === filename) return newUrl;
    }
  }
  return null;
};

const objectExists = (key) => spaces.objectExists(key);

const walkFiles = (dir, baseDir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, baseDir, acc);
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      acc.push({ full, rel });
    }
  }
  return acc;
};

const migrateDiskFiles = async () => {
  log('\n📁 Phase 1: Disk uploads → Spaces');
  if (!fs.existsSync(UPLOADS_ROOT)) {
    log('   No local uploads/ directory (normal on fresh clone — run on Railway or copy files first).');
    return;
  }

  const files = walkFiles(UPLOADS_ROOT, UPLOADS_ROOT);
  stats.diskScanned = files.length;
  log(`   Found ${files.length} file(s) under uploads/`);

  for (const { full, rel } of files) {
    const oldPath = `/uploads/${rel}`;
    const key = `migrated/${rel}`;

    try {
      if (await objectExists(key)) {
        const url = spaces.toPublicUrl(key);
        pathMap.set(oldPath, url);
        stats.diskSkipped++;
        log(`   skip (exists): ${oldPath}`);
        continue;
      }

      const buffer = fs.readFileSync(full);
      const ext = path.extname(rel).toLowerCase();
      const mime = ext === '.png' ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : ext === '.gif' ? 'image/gif'
        : ext === '.webp' ? 'image/webp'
        : ext === '.pdf' ? 'application/pdf'
        : ext === '.webm' ? 'audio/webm'
        : 'application/octet-stream';

      if (DRY_RUN) {
        const fakeUrl = `${spaces.toPublicUrl(key)}`;
        pathMap.set(oldPath, fakeUrl);
        stats.diskUploaded++;
        log(`   would upload: ${oldPath} → ${key}`);
        continue;
      }

      const url = await spaces.uploadBuffer(buffer, { key, contentType: mime });
      pathMap.set(oldPath, url);
      stats.diskUploaded++;
      log(`   uploaded: ${oldPath} → ${url}`);
    } catch (err) {
      stats.diskErrors++;
      console.error(`   ERROR ${oldPath}:`, err.message);
    }
  }
};

const replaceIfMapped = (value) => {
  const mapped = resolveMappedUrl(value);
  return mapped && mapped !== value ? mapped : null;
};

const updateCollectionField = async (collection, field, extraFilter = {}) => {
  const cursor = collection.find({
    ...extraFilter,
    [field]: { $regex: /\/uploads\// }
  });

  let count = 0;
  for await (const doc of cursor) {
    const oldVal = doc[field];
    const newVal = replaceIfMapped(oldVal);
    if (!newVal) continue;

    if (DRY_RUN) {
      log(`   would update ${collection.collectionName} ${doc._id}: ${oldVal} → ${newVal}`);
      count++;
      continue;
    }

    await collection.updateOne({ _id: doc._id }, { $set: { [field]: newVal } });
    log(`   updated ${collection.collectionName} ${doc._id}`);
    count++;
  }
  stats.dbRefsUpdated += count;
  return count;
};

const migrateDbUploadPaths = async (db) => {
  log('\n🗄️  Phase 2: Update DB references (/uploads/...)');

  const targets = [
    { name: 'bookingmessages', field: 'attachment' },
    { name: 'services', field: 'image' },
    { name: 'users', field: 'image' },
    { name: 'ads', field: 'logo' },
    { name: 'blogs', field: 'bannerImage' },
    { name: 'bounties', field: 'projectLogo' },
    { name: 'bounties', field: 'posterImage' },
    { name: 'games', field: 'image' },
    { name: 'games', field: 'thumbnail' },
    { name: 'bannerads', field: 'image' },
    { name: 'bannerads', field: 'gif' }
  ];

  for (const { name, field } of targets) {
    try {
      const col = db.collection(name);
      const n = await col.countDocuments({ [field]: { $regex: /\/uploads\// } });
      if (n === 0) continue;
      log(`   ${name}.${field}: ${n} document(s)`);
      await updateCollectionField(col, field);
    } catch (err) {
      if (err.codeName !== 'NamespaceNotFound') {
        console.error(`   ERROR ${name}.${field}:`, err.message);
      }
    }
  }
};

const toBuffer = (data) => {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  if (data.buffer) return Buffer.from(data.buffer);
  return Buffer.from(data);
};

const extractMediaId = (url, apiPath) => {
  if (!url || typeof url !== 'string') return null;
  const re = new RegExp(`${apiPath}/([a-f0-9]{24})`, 'i');
  const m = url.match(re);
  return m ? m[1] : null;
};

const migrateMongoImageCollection = async (db, {
  collectionName,
  urlPrefix,
  spacesFolder,
  refCollection,
  refField,
  contentType = 'image/webp'
}) => {
  const imageCol = db.collection(collectionName);
  const refCol = db.collection(refCollection);
  const images = await imageCol.find({ data: { $exists: true, $ne: null } }).toArray();

  log(`\n   ${collectionName}: ${images.length} blob(s)`);

  for (const img of images) {
    const key = `migrated/${spacesFolder}/${img._id}.webp`;
    const cdnUrl = spaces.toPublicUrl(key);

    try {
      const exists = await objectExists(key);

      if (!exists) {
        if (DRY_RUN) {
          log(`   would upload ${collectionName}/${img._id} → ${key}`);
          stats.mongoImagesUploaded++;
        } else {
          await spaces.uploadBuffer(toBuffer(img.data), {
            key,
            contentType: img.contentType || contentType
          });
          log(`   uploaded ${collectionName}/${img._id} → ${cdnUrl}`);
          stats.mongoImagesUploaded++;
        }
      } else {
        stats.mongoImagesSkipped++;
        log(`   skip upload (exists): ${key}`);
      }

      const filter = {
        [refField]: { $regex: new RegExp(`${img._id.toString()}$`, 'i') }
      };
      const toUpdate = await refCol.countDocuments(filter);
      if (toUpdate > 0) {
        if (DRY_RUN) {
          log(`   would repoint ${toUpdate} ${refCollection}.${refField} → ${cdnUrl}`);
        } else {
          await refCol.updateMany(filter, { $set: { [refField]: cdnUrl } });
          log(`   repointed ${toUpdate} ${refCollection}.${refField}`);
        }
        stats.dbRefsUpdated += toUpdate;
      }
    } catch (err) {
      stats.mongoImagesErrors++;
      console.error(`   ERROR ${collectionName}/${img._id}:`, err.message);
    }
  }
};

const migrateMongoMediaBlobs = async (db) => {
  log('\n🖼️  Phase 3: MongoDB media blobs → Spaces');

  const apiBase = railwayBases[0] || 'https://aquads-production.up.railway.app';

  await migrateMongoImageCollection(db, {
    collectionName: 'userimages',
    urlPrefix: `${apiBase}/api/users/media`,
    spacesFolder: 'users',
    refCollection: 'users',
    refField: 'image'
  });

  await migrateMongoImageCollection(db, {
    collectionName: 'serviceimages',
    urlPrefix: `${apiBase}/api/services/media`,
    spacesFolder: 'services',
    refCollection: 'services',
    refField: 'image'
  });

  await migrateMongoImageCollection(db, {
    collectionName: 'blogimages',
    urlPrefix: `${apiBase}/api/blogs/media`,
    spacesFolder: 'blogs',
    refCollection: 'blogs',
    refField: 'bannerImage'
  });

  // Blog inline content may embed media URLs
  const blogs = db.collection('blogs');
  const blogsWithMedia = await blogs.find({
    content: { $regex: /\/api\/blogs\/media\/[a-f0-9]{24}/i }
  }).toArray();

  for (const blog of blogsWithMedia) {
    const content = normalizeBlogContentMediaUrls(blog.content);
    if (content === blog.content) continue;

    if (DRY_RUN) {
      log(`   would update blog content embeds: ${blog._id}`);
    } else {
      await blogs.updateOne({ _id: blog._id }, { $set: { content } });
      log(`   updated blog content embeds: ${blog._id}`);
    }
    stats.dbRefsUpdated++;
  }
};

const migrateRailwayMediaUrls = async (db) => {
  log('\n🔗 Phase 4: Repoint remaining Railway /api/*/media URLs');

  const mappings = [
    { col: 'users', field: 'image', apiPath: '/api/users/media', folder: 'users' },
    { col: 'services', field: 'image', apiPath: '/api/services/media', folder: 'services' },
    { col: 'blogs', field: 'bannerImage', apiPath: '/api/blogs/media', folder: 'blogs' },
    { col: 'bounties', field: 'posterImage', apiPath: '/api/users/media', folder: 'users' }
  ];

  for (const { col, field, apiPath, folder } of mappings) {
    const collection = db.collection(col);
    const docs = await collection.find({
      [field]: { $regex: new RegExp(apiPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
    }).toArray();

    for (const doc of docs) {
      const id = extractMediaId(doc[field], apiPath);
      if (!id) continue;
      const cdnUrl = spaces.toPublicUrl(`migrated/${folder}/${id}.webp`);
      if (doc[field] === cdnUrl) continue;

      if (DRY_RUN) {
        log(`   would update ${col} ${doc._id}: ${doc[field]} → ${cdnUrl}`);
      } else {
        await collection.updateOne({ _id: doc._id }, { $set: { [field]: cdnUrl } });
      }
      stats.dbRefsUpdated++;
    }
  }
};

async function run() {
  console.log('🚀 Migrate uploads to DigitalOcean Spaces');
  if (DRY_RUN) console.log('   (dry-run — no writes)\n');

  if (!spaces.isConfigured()) {
    throw new Error('DO Spaces env vars are not configured. Set DO_SPACES_* in Railway first.');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;

  await migrateDiskFiles();
  await migrateDbUploadPaths(db);
  await migrateMongoMediaBlobs(db);
  await migrateRailwayMediaUrls(db);

  console.log('\n📊 Summary');
  console.log(`   Disk scanned:        ${stats.diskScanned}`);
  console.log(`   Disk uploaded:       ${stats.diskUploaded}`);
  console.log(`   Disk skipped:        ${stats.diskSkipped}`);
  console.log(`   Disk errors:         ${stats.diskErrors}`);
  console.log(`   Mongo blobs uploaded:${stats.mongoImagesUploaded}`);
  console.log(`   Mongo blobs skipped: ${stats.mongoImagesSkipped}`);
  console.log(`   Mongo blob errors:   ${stats.mongoImagesErrors}`);
  console.log(`   DB refs updated:     ${stats.dbRefsUpdated}`);
  console.log(DRY_RUN ? '\n✅ Dry-run complete. Re-run without --dry-run to apply.' : '\n✅ Migration complete.');
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error('\n❌ Migration failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await mongoose.connection.close().catch(() => {});
    });
}

module.exports = run;
