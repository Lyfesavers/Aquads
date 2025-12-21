/**
 * Migration: Fix googleSub unique index duplicate key error
 * 
 * This migration:
 * 1. Removes googleSub field from all users where it's null
 * 2. This allows the sparse unique index to work correctly
 * 
 * Safe to run multiple times (idempotent)
 * Safe to run on live production database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquads';

async function fixGoogleSubIndex() {
  console.log('🚀 Starting googleSub index fix migration...\n');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Count users with googleSub: null
    console.log('🔍 Checking for users with googleSub: null...');
    const usersWithNullGoogleSub = await collection.countDocuments({ googleSub: null });
    console.log(`Found ${usersWithNullGoogleSub} users with googleSub: null\n`);

    if (usersWithNullGoogleSub > 0) {
      console.log('🔧 Removing googleSub field from users where it\'s null...');
      const result = await collection.updateMany(
        { googleSub: null },
        { $unset: { googleSub: "" } }
      );
      console.log(`✅ Updated ${result.modifiedCount} users\n`);
    } else {
      console.log('✅ No users with googleSub: null found\n');
    }

    // Verify the fix
    console.log('🔍 Verifying fix...');
    const remainingNullUsers = await collection.countDocuments({ googleSub: null });
    const usersWithGoogleSub = await collection.countDocuments({ googleSub: { $exists: true, $ne: null } });
    const totalUsers = await collection.countDocuments();

    console.log('📊 Database statistics:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Users with googleSub (not null): ${usersWithGoogleSub}`);
    console.log(`   Users with googleSub: null: ${remainingNullUsers}`);
    console.log(`   Users without googleSub field: ${totalUsers - usersWithGoogleSub - remainingNullUsers}`);
    console.log('');

    if (remainingNullUsers === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('🎉 googleSub sparse unique index should now work correctly\n');
    } else {
      console.log('⚠️  Warning: Some users still have googleSub: null');
      console.log('   This might indicate an issue with the migration\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
  }
}

// Run the migration
if (require.main === module) {
  fixGoogleSubIndex()
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = fixGoogleSubIndex;

