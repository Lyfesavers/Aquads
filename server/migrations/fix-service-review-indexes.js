/**
 * Migration: Fix ServiceReview indexes to allow multiple reviews per service
 * 
 * This migration:
 * 1. Drops the old unique index on (serviceId, userId) that blocks multiple reviews
 * 2. Recreates it with a partial filter to only apply to legacy reviews without bookingId
 * 3. Ensures the bookingId unique index exists
 * 
 * Safe to run multiple times (idempotent)
 * Safe to run on live production database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquads';

async function migrateIndexes() {
  console.log('🚀 Starting ServiceReview index migration...\n');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('servicereviews');

    // Get existing indexes
    console.log('🔍 Checking existing indexes...');
    const existingIndexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(existingIndexes, null, 2));
    console.log('');

    // Check for the problematic index
    const oldUniqueIndex = existingIndexes.find(
      idx => idx.key.serviceId === 1 && 
             idx.key.userId === 1 && 
             idx.unique === true &&
             !idx.partialFilterExpression
    );

    if (oldUniqueIndex) {
      console.log('⚠️  Found old unique index that needs updating:', oldUniqueIndex.name);
      console.log('   This index prevents multiple reviews per service\n');

      // Drop the old index
      console.log(`🗑️  Dropping old index: ${oldUniqueIndex.name}...`);
      await collection.dropIndex(oldUniqueIndex.name);
      console.log('✅ Old index dropped successfully\n');

      // Create new NON-UNIQUE index for query performance only
      // (uniqueness is now enforced by bookingId index)
      console.log('🔨 Creating new non-unique index for query performance...');
      await collection.createIndex(
        { serviceId: 1, userId: 1 },
        {
          name: 'serviceId_1_userId_1_nonunique'
        }
      );
      console.log('✅ New non-unique index created successfully\n');
    } else {
      console.log('✅ No problematic index found - either already migrated or doesn\'t exist\n');
    }

    // Ensure bookingId unique index exists
    console.log('🔍 Checking bookingId unique index...');
    const bookingIdIndex = existingIndexes.find(
      idx => idx.key.bookingId === 1 && idx.unique === true && idx.sparse === true
    );

    if (!bookingIdIndex) {
      console.log('🔨 Creating bookingId unique sparse index...');
      await collection.createIndex(
        { bookingId: 1 },
        {
          unique: true,
          sparse: true,
          name: 'bookingId_1_unique_sparse'
        }
      );
      console.log('✅ BookingId index created successfully\n');
    } else {
      console.log('✅ BookingId unique index already exists\n');
    }

    // Verify final state
    console.log('🔍 Verifying final index state...');
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', JSON.stringify(finalIndexes, null, 2));
    console.log('');

    // Count existing reviews
    const totalReviews = await collection.countDocuments();
    const reviewsWithBookingId = await collection.countDocuments({ bookingId: { $exists: true } });
    const reviewsWithoutBookingId = await collection.countDocuments({ bookingId: { $exists: false } });

    console.log('📊 Database statistics:');
    console.log(`   Total reviews: ${totalReviews}`);
    console.log(`   Reviews with bookingId (new system): ${reviewsWithBookingId}`);
    console.log(`   Reviews without bookingId (legacy): ${reviewsWithoutBookingId}`);
    console.log('');

    console.log('✅ Migration completed successfully!');
    console.log('🎉 Users can now leave multiple reviews for the same service if they have multiple bookings\n');

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
  migrateIndexes()
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateIndexes;

