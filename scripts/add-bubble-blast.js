const mongoose = require('mongoose');
require('dotenv').config();

// Game model
const gameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    thumbnail: { type: String, required: true },
    gameUrl: { type: String, required: true },
    rating: { type: Number, default: 0 },
    plays: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    tags: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', gameSchema);

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aquads');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Add Aqua Bubble Blast game
async function addBubbleBlastGame() {
    try {
        const gameData = {
            title: "Aqua Bubble Blast",
            description: "🎯 Aim, shoot, and match colorful bubbles in this addictive puzzle game! Use strategic bounces off walls to clear challenging levels. Match 3 or more bubbles of the same color to make them pop and earn points. Progressive difficulty with stunning aqua-themed visuals and smooth animations. Perfect for quick gaming sessions!",
            category: "Puzzle",
            thumbnail: "/api/placeholder/300/200", // You can update this with an actual thumbnail
            gameUrl: "/aqua-bubble-blast.html",
            rating: 4.8,
            plays: 0,
            featured: true,
            tags: [
                "bubble shooter",
                "puzzle",
                "match-3",
                "arcade",
                "strategy",
                "aqua theme",
                "single player",
                "casual",
                "addictive",
                "colorful"
            ]
        };

        // Check if game already exists
        const existingGame = await Game.findOne({ title: "Aqua Bubble Blast" });
        
        if (existingGame) {
            console.log('Game already exists, updating...');
            await Game.findByIdAndUpdate(existingGame._id, gameData);
            console.log('✅ Aqua Bubble Blast updated successfully!');
        } else {
            const newGame = new Game(gameData);
            await newGame.save();
            console.log('✅ Aqua Bubble Blast added successfully!');
        }

        console.log('\n🎮 Game Details:');
        console.log(`Title: ${gameData.title}`);
        console.log(`Category: ${gameData.category}`);
        console.log(`URL: ${gameData.gameUrl}`);
        console.log(`Featured: ${gameData.featured ? 'Yes' : 'No'}`);
        console.log(`Tags: ${gameData.tags.join(', ')}`);

    } catch (error) {
        console.error('Error adding game:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
async function main() {
    console.log('🚀 Adding Aqua Bubble Blast to GameHub...\n');
    await connectDB();
    await addBubbleBlastGame();
}

main().catch(console.error); 