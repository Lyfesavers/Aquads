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
      title: 'Aqua Splash - Ultimate Water Odyssey',
      description: '🌊 Dive into the most advanced water droplet puzzle experience ever created! Features: ⚡ Campaign Mode with 50+ levels and boss battles, ♾️ Endless Mode for infinite gameplay, 🏆 Achievement system with unlockables, 💥 Four epic power-ups (Tsunami Bomb, Lightning Strike, Time Freeze, Rainbow Drop), 🎮 Multiple game modes and daily challenges, 💎 8 rare droplet types with unique properties, ✨ Spectacular particle effects and modern UI. Master the art of water manipulation and become the ultimate Aqua Champion!',
      bannerType: 'image',
      bannerUrl: '/aqua-splash-banner.svg',
      gameUrl: '/aqua-splash.html',
      projectName: 'Aqua Splash',
      category: 'puzzle',
      tags: ['puzzle', 'match-3', 'water', 'strategy', 'campaign', 'powerups', 'achievements', 'modern', 'aquads-original'],
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