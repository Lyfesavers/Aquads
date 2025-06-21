// Modern Aqua Splash Game Engine
class AquaSplashEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game State
        this.gameMode = 'campaign'; // campaign, endless, challenge
        this.currentLevel = 1;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.lives = 3;
        this.experience = 0;
        this.playerLevel = 1;
        
        // Grid System
        this.gridWidth = 10;
        this.gridHeight = 12;
        this.cellSize = Math.min(70, (this.canvas.width - 100) / this.gridWidth);
        this.offsetX = (this.canvas.width - this.gridWidth * this.cellSize) / 2;
        this.offsetY = 150;
        
        // Advanced Droplet System
        this.dropletTypes = [
            { id: 0, color: '#00ccff', name: 'Crystal', rarity: 'common', power: 1, glow: '#66d9ff' },
            { id: 1, color: '#0099ff', name: 'Ocean', rarity: 'common', power: 1, glow: '#66b3ff' },
            { id: 2, color: '#3366ff', name: 'Deep', rarity: 'common', power: 1, glow: '#8099ff' },
            { id: 3, color: '#00ffcc', name: 'Mint', rarity: 'uncommon', power: 2, glow: '#66ffdd' },
            { id: 4, color: '#ff6600', name: 'Coral', rarity: 'uncommon', power: 2, glow: '#ff9966' },
            { id: 5, color: '#9900ff', name: 'Mystic', rarity: 'rare', power: 3, glow: '#b366ff' },
            { id: 6, color: '#ffdd00', name: 'Golden', rarity: 'epic', power: 5, glow: '#ffee66' },
            { id: 7, color: '#ff0066', name: 'Plasma', rarity: 'legendary', power: 10, glow: '#ff6699' }
        ];
        
        // Power-up System
        this.powerups = {
            bomb: { cooldown: 0, maxCooldown: 5, uses: 3 },
            lightning: { cooldown: 0, maxCooldown: 8, uses: 2 },
            freeze: { cooldown: 0, maxCooldown: 3, uses: 5 },
            rainbow: { cooldown: 0, maxCooldown: 12, uses: 1 }
        };
        
        // Achievement System
        this.achievements = [
            { id: 'first_match', name: 'First Splash', desc: 'Make your first match', unlocked: false },
            { id: 'combo_master', name: 'Combo Master', desc: 'Achieve a 10x combo', unlocked: false },
            { id: 'level_10', name: 'Deep Dive', desc: 'Reach level 10', unlocked: false },
            { id: 'score_master', name: 'Score Master', desc: 'Score 100,000 points', unlocked: false },
            { id: 'powerup_master', name: 'Power User', desc: 'Use all powerups in one level', unlocked: false }
        ];
        
        // Campaign Levels
        this.campaignLevels = [
            { id: 1, name: 'Shallow Waters', objective: 'Score 5,000 points', target: 5000, moves: 30 },
            { id: 2, name: 'Coral Gardens', objective: 'Clear 50 droplets', target: 50, moves: 25 },
            { id: 3, name: 'Deep Current', objective: 'Achieve 5x combo', target: 5, moves: 20 },
            { id: 4, name: 'Tsunami Challenge', objective: 'Use 3 power-ups', target: 3, moves: 35 },
            { id: 5, name: 'Abyss Guardian', objective: 'Defeat the boss', target: 1, moves: 40, boss: true }
        ];
        
        // Game Systems
        this.grid = [];
        this.particles = [];
        this.animations = [];
        this.selectedDroplet = null;
        this.gameRunning = false;
        this.paused = false;
        this.time = 0;
        
        // Input handling
        this.mousePos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        this.touchSupport = 'ontouchstart' in window;
        
        // Visual effects
        this.screenShake = 0;
        this.flashEffect = 0;
        this.backgroundWaves = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeBackgroundEffects();
        this.loadPlayerData();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events
        if (this.touchSupport) {
            this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        }
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    
    initializeBackgroundEffects() {
        // Create animated background waves
        for (let i = 0; i < 5; i++) {
            this.backgroundWaves.push({
                y: Math.random() * this.canvas.height,
                amplitude: 20 + Math.random() * 30,
                frequency: 0.01 + Math.random() * 0.02,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1,
                opacity: 0.1 + Math.random() * 0.2
            });
        }
    }
    
    startCampaignMode() {
        this.gameMode = 'campaign';
        this.currentLevel = 1;
        this.resetGame();
        this.hideMainMenu();
        this.startLevel();
    }
    
    startEndlessMode() {
        this.gameMode = 'endless';
        this.resetGame();
        this.hideMainMenu();
        this.initializeGrid();
        this.gameRunning = true;
    }
    
    startChallengeMode() {
        this.gameMode = 'challenge';
        this.generateDailyChallenge();
        this.hideMainMenu();
        this.startLevel();
    }
    
    hideMainMenu() {
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameHud').style.display = 'flex';
    }
    
    showMainMenu() {
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('gameHud').style.display = 'none';
        this.gameRunning = false;
    }
    
    resetGame() {
        this.score = 0;
        this.combo = 0;
        this.lives = 3;
        this.grid = [];
        this.particles = [];
        this.animations = [];
        this.selectedDroplet = null;
        this.resetPowerups();
        this.updateUI();
    }
    
    resetPowerups() {
        Object.keys(this.powerups).forEach(key => {
            this.powerups[key].cooldown = 0;
            if (this.gameMode === 'campaign') {
                this.powerups[key].uses = this.powerups[key].maxUses || 3;
            }
        });
        this.updatePowerupUI();
    }
    
    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                if (y < this.gridHeight - 4) {
                    this.grid[y][x] = null;
                } else {
                    // Create droplet with weighted rarity
                    const dropletType = this.getRandomDropletType();
                    this.grid[y][x] = {
                        type: dropletType,
                        x: x,
                        y: y,
                        scale: 1,
                        rotation: Math.random() * Math.PI * 2,
                        glowIntensity: 0.5 + Math.random() * 0.5,
                        id: Math.random().toString(36).substr(2, 9)
                    };
                }
            }
        }
    }
    
    getRandomDropletType() {
        const weights = [40, 35, 25, 15, 10, 5, 2, 1]; // Weighted by rarity
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return Math.min(i, this.getAvailableDropletTypes() - 1);
            }
        }
        return 0;
    }
    
    getAvailableDropletTypes() {
        // Unlock more droplet types as player progresses
        return Math.min(3 + Math.floor(this.playerLevel / 2), this.dropletTypes.length);
    }
    
    handleMouseDown(e) {
        if (!this.gameRunning) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.mousePos = { x, y };
        this.selectDroplet(x, y);
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.mousePos = { x, y };
    }
    
    handleMouseUp(e) {
        if (!this.selectedDroplet) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.dropDroplet(x, y);
    }
    
    selectDroplet(x, y) {
        const gridX = Math.floor((x - this.offsetX) / this.cellSize);
        const gridY = Math.floor((y - this.offsetY) / this.cellSize);
        
        if (this.isValidPosition(gridX, gridY) && this.grid[gridY][gridX]) {
            this.selectedDroplet = { x: gridX, y: gridY };
            const droplet = this.grid[gridY][gridX];
            droplet.scale = 1.3;
            this.createSelectionEffect(x, y);
            
            // Add haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }
    }
    
    usePowerup(type) {
        if (this.powerups[type].cooldown > 0 || this.powerups[type].uses <= 0) return;
        
        switch(type) {
            case 'bomb':
                this.activateBombPowerup();
                break;
            case 'lightning':
                this.activateLightningPowerup();
                break;
            case 'freeze':
                this.activateFreezePowerup();
                break;
            case 'rainbow':
                this.activateRainbowPowerup();
                break;
        }
        
        this.powerups[type].uses--;
        this.powerups[type].cooldown = this.powerups[type].maxCooldown;
        this.updatePowerupUI();
        this.createPowerupEffect(type);
    }
    
    activateBombPowerup() {
        // Create explosion that clears a 3x3 area
        const centerX = Math.floor(this.gridWidth / 2);
        const centerY = Math.floor(this.gridHeight / 2);
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (this.isValidPosition(x, y) && this.grid[y][x]) {
                    this.createExplosionEffect(
                        this.offsetX + x * this.cellSize + this.cellSize / 2,
                        this.offsetY + y * this.cellSize + this.cellSize / 2
                    );
                    this.grid[y][x] = null;
                }
            }
        }
        
        this.screenShake = 20;
        setTimeout(() => this.processMatches(), 500);
    }
    
    draw() {
        // Clear canvas with animated background
        this.drawAnimatedBackground();
        
        // Apply screen shake
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            this.ctx.save();
            this.ctx.translate(shakeX, shakeY);
            this.screenShake *= 0.9;
        }
        
        // Draw grid and droplets
        this.drawGrid();
        this.drawDroplets();
        this.drawParticles();
        this.drawAnimations();
        
        // Apply flash effect
        if (this.flashEffect > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashEffect})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.flashEffect *= 0.9;
        }
        
        if (this.screenShake > 0) {
            this.ctx.restore();
        }
    }
    
    drawAnimatedBackground() {
        const time = Date.now() * 0.001;
        
        // Gradient background with animation
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, `hsl(220, 100%, ${15 + Math.sin(time * 0.5) * 5}%)`);
        gradient.addColorStop(0.5, `hsl(200, 100%, ${25 + Math.cos(time * 0.3) * 8}%)`);
        gradient.addColorStop(1, `hsl(180, 100%, ${35 + Math.sin(time * 0.7) * 10}%)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw animated waves
        this.backgroundWaves.forEach(wave => {
            this.ctx.strokeStyle = `rgba(0, 204, 255, ${wave.opacity})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            for (let x = 0; x < this.canvas.width; x += 5) {
                const y = wave.y + Math.sin((x * wave.frequency) + (time * wave.speed) + wave.phase) * wave.amplitude;
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        });
    }
    
    gameLoop() {
        if (this.gameRunning) {
            this.update();
            this.draw();
        }
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.time += 1/60;
        this.updateCooldowns();
        this.updateParticles();
        this.updateAnimations();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('level').textContent = this.currentLevel;
        document.getElementById('combo').textContent = this.combo;
        
        // Update progress bar based on game mode
        let progress = 0;
        if (this.gameMode === 'campaign') {
            const levelData = this.campaignLevels[this.currentLevel - 1];
            if (levelData) {
                progress = Math.min(100, (this.score / levelData.target) * 100);
            }
        }
        document.getElementById('levelProgress').style.width = progress + '%';
    }
    
    // Utility methods
    isValidPosition(x, y) {
        return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
    }
    
    loadPlayerData() {
        // Load from localStorage or default values
        const data = localStorage.getItem('aquaSplashData');
        if (data) {
            const parsed = JSON.parse(data);
            this.playerLevel = parsed.playerLevel || 1;
            this.experience = parsed.experience || 0;
            this.achievements = parsed.achievements || this.achievements;
        }
    }
    
    savePlayerData() {
        const data = {
            playerLevel: this.playerLevel,
            experience: this.experience,
            achievements: this.achievements
        };
        localStorage.setItem('aquaSplashData', JSON.stringify(data));
    }
}

// Global game instance
let game; 