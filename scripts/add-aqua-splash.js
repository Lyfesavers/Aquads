const mongoose = require('mongoose');
const Game = require('../server/models/Game');
const User = require('../server/models/User');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aquads', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const addAquaSplashGame = async () => {
  try {
    await connectDB();
    
    // Find or create an admin user to be the owner
    let adminUser = await User.findOne({ username: 'AquadsTeam' });
    
    if (!adminUser) {
      // Create a system user for in-house games
      adminUser = new User({
        username: 'AquadsTeam',
        email: 'team@aquads.com',
        password: 'system_generated_password',
        isAdmin: true,
        isVerified: true
      });
      await adminUser.save();
      console.log('Created AquadsTeam user');
    }
    
    // Check if game already exists
    const existingGame = await Game.findOne({ title: 'Aqua Splash' });
    
    if (existingGame) {
      console.log('Aqua Splash game already exists in database');
      return;
    }
    
    // Create the game entry
    const aquaSplashGame = new Game({
      title: 'Aqua Splash',
      description: 'Dive into the ultimate water droplet puzzle experience! Match colorful water droplets to create spectacular splash effects and chain reactions. With stunning visual effects, progressive difficulty, and mesmerizing water physics, Aqua Splash will keep you hooked for hours. Perfect your strategy to achieve massive combos and climb the leaderboards!',
      bannerType: 'image',
      bannerUrl: '/aqua-splash-banner.svg',
      gameUrl: '/aqua-splash.html',
      projectName: 'Aqua Splash',
      category: 'puzzle',
      tags: ['puzzle', 'match-3', 'water', 'strategy', 'casual', 'aquads-original'],
      owner: adminUser._id,
      votes: 0,
      blockchain: 'other', // HTML5 game, not blockchain specific
      status: 'active'
    });
    
    await aquaSplashGame.save();
    console.log('✅ Aqua Splash game added to database successfully!');
    console.log('Game ID:', aquaSplashGame._id);
    console.log('Title:', aquaSplashGame.title);
    console.log('Game URL:', aquaSplashGame.gameUrl);
    console.log('Banner URL:', aquaSplashGame.bannerUrl);
    
  } catch (error) {
    console.error('Error adding Aqua Splash game:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run if called directly
if (require.main === module) {
  addAquaSplashGame();
}

module.exports = { addAquaSplashGame }; 