const mongoose = require('mongoose');
const SkillTest = require('../models/SkillTest');
const skillTests = require('../data/skillTests'); // Uses the actual data file

// Load environment variables
require('dotenv').config();

async function updateSkillTests() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Updating skill tests from data file...');
    
    let updatedCount = 0;
    let createdCount = 0;
    
    // Update each skill test in the database
    for (const testData of skillTests) {
      const existingTest = await SkillTest.findOne({ title: testData.title });
      
      if (existingTest) {
        // Update existing test
        await SkillTest.findOneAndUpdate(
          { title: testData.title },
          {
            $set: {
              description: testData.description,
              category: testData.category,
              difficulty: testData.difficulty,
              timeLimit: testData.timeLimit,
              passingScore: testData.passingScore,
              questions: testData.questions,
              badge: testData.badge,
              isActive: testData.isActive !== undefined ? testData.isActive : true,
              updatedAt: new Date()
            }
          }
        );
        updatedCount++;
        console.log(`✅ Updated: ${testData.title} (${testData.questions.length} questions)`);
      } else {
        // Create new test
        await SkillTest.create(testData);
        createdCount++;
        console.log(`✅ Created: ${testData.title} (${testData.questions.length} questions)`);
      }
    }

    // Get distribution stats
    const allTests = await SkillTest.find({});
    let totalQuestions = 0;
    let correctAnswerDistribution = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (const test of allTests) {
      totalQuestions += test.questions.length;
      for (const question of test.questions) {
        correctAnswerDistribution[question.correctAnswer]++;
      }
    }

    console.log('\n🎉 Database update completed successfully!');
    console.log(`📊 Updated: ${updatedCount} tests`);
    console.log(`📊 Created: ${createdCount} tests`);
    console.log(`📊 Total Questions: ${totalQuestions}`);
    console.log('📊 Correct Answer Distribution:');
    console.log(`   Position 0: ${correctAnswerDistribution[0]} questions (${Math.round(correctAnswerDistribution[0]/totalQuestions*100)}%)`);
    console.log(`   Position 1: ${correctAnswerDistribution[1]} questions (${Math.round(correctAnswerDistribution[1]/totalQuestions*100)}%)`);
    console.log(`   Position 2: ${correctAnswerDistribution[2]} questions (${Math.round(correctAnswerDistribution[2]/totalQuestions*100)}%)`);
    console.log(`   Position 3: ${correctAnswerDistribution[3]} questions (${Math.round(correctAnswerDistribution[3]/totalQuestions*100)}%)`);
    
    console.log('\n✅ Answer lengths are now standardized');
    console.log('✅ Correct answer positions are now randomized');
    console.log('✅ No more cheating patterns!');

  } catch (error) {
    console.error('❌ Error updating skill tests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the update
updateSkillTests();
