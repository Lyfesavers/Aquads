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
    
    generateDailyChallenge() {
        // Generate a unique daily challenge based on current date
        const today = new Date().toDateString();
        const seed = this.hashCode(today);
        
        // Create a challenging level with specific objectives
        this.currentLevel = 1;
        this.challengeObjective = {
            type: 'score', // score, combos, specific_droplets
            target: 10000 + (seed % 5000),
            moves: 20 + (seed % 10),
            description: `Score ${this.challengeObjective?.target || 10000} points in ${this.challengeObjective?.moves || 25} moves!`
        };
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
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
    
    updatePowerupUI() {
        Object.keys(this.powerups).forEach(key => {
            const powerup = this.powerups[key];
            const button = document.getElementById(`${key}Powerup`);
            const cooldownElement = document.getElementById(`${key}Cooldown`);
            
            if (button) {
                // Update button state
                if (powerup.cooldown > 0 || powerup.uses <= 0) {
                    button.classList.add('disabled');
                } else {
                    button.classList.remove('disabled');
                }
                
                // Update cooldown display
                if (cooldownElement) {
                    if (powerup.cooldown > 0) {
                        cooldownElement.style.display = 'flex';
                        cooldownElement.textContent = Math.ceil(powerup.cooldown);
                    } else {
                        cooldownElement.style.display = 'none';
                    }
                }
            }
        });
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
    
    activateLightningPowerup() {
        // Clear entire columns and rows with lightning
        const targetRow = Math.floor(Math.random() * this.gridHeight);
        const targetCol = Math.floor(Math.random() * this.gridWidth);
        
        // Clear row
        for (let x = 0; x < this.gridWidth; x++) {
            if (this.grid[targetRow][x]) {
                if (effectsSystem) {
                    effectsSystem.createPowerupEffect(
                        this.offsetX + x * this.cellSize + this.cellSize / 2,
                        this.offsetY + targetRow * this.cellSize + this.cellSize / 2,
                        'lightning'
                    );
                }
                this.grid[targetRow][x] = null;
            }
        }
        
        // Clear column  
        for (let y = 0; y < this.gridHeight; y++) {
            if (this.grid[y][targetCol]) {
                if (effectsSystem) {
                    effectsSystem.createPowerupEffect(
                        this.offsetX + targetCol * this.cellSize + this.cellSize / 2,
                        this.offsetY + y * this.cellSize + this.cellSize / 2,
                        'lightning'
                    );
                }
                this.grid[y][targetCol] = null;
            }
        }
        
        this.screenShake = 15;
        setTimeout(() => this.processMatches(), 300);
    }
    
    activateFreezePowerup() {
        // Slow down time for a few seconds
        this.timeScale = 0.3;
        this.flashEffect = 0.2;
        
        setTimeout(() => {
            this.timeScale = 1.0;
        }, 3000);
    }
    
    activateRainbowPowerup() {
        // Transform random droplets into rainbow droplets that match everything
        const transformCount = 5;
        const positions = [];
        
        // Find all droplet positions
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) {
                    positions.push({x, y});
                }
            }
        }
        
        // Transform random droplets
        for (let i = 0; i < Math.min(transformCount, positions.length); i++) {
            const randomIndex = Math.floor(Math.random() * positions.length);
            const pos = positions.splice(randomIndex, 1)[0];
            
            if (this.grid[pos.y][pos.x]) {
                this.grid[pos.y][pos.x].type = -1; // Special rainbow type
                this.grid[pos.y][pos.x].isRainbow = true;
                
                if (effectsSystem) {
                    effectsSystem.createPowerupEffect(
                        this.offsetX + pos.x * this.cellSize + this.cellSize / 2,
                        this.offsetY + pos.y * this.cellSize + this.cellSize / 2,
                        'rainbow'
                    );
                }
            }
        }
    }
    
    createExplosionEffect(x, y) {
        if (effectsSystem) {
            effectsSystem.createSplashEffect(x, y, '#ff4444', 3);
        }
    }
    
    createSelectionEffect(x, y) {
        if (effectsSystem) {
            effectsSystem.createSplashEffect(x, y, '#ffffff', 0.5);
        }
    }
    
    createPowerupEffect(type) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (effectsSystem) {
            effectsSystem.createPowerupEffect(centerX, centerY, type);
        }
        
        if (audioSystem) {
            audioSystem.playSound('powerup');
        }
    }
    
    processMatches() {
        this.dropDroplets();
        setTimeout(() => this.checkMatches(), 300);
    }
    
    dropDroplets() {
        // Make droplets fall down to fill empty spaces
        for (let x = 0; x < this.gridWidth; x++) {
            let writeY = this.gridHeight - 1;
            
            for (let y = this.gridHeight - 1; y >= 0; y--) {
                if (this.grid[y][x]) {
                    if (y !== writeY) {
                        this.grid[writeY][x] = this.grid[y][x];
                        this.grid[writeY][x].y = writeY;
                        this.grid[y][x] = null;
                    }
                    writeY--;
                }
            }
        }
        
        this.spawnNewDroplets();
    }
    
    spawnNewDroplets() {
        // Fill empty spaces with new droplets
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (!this.grid[y][x]) {
                    const dropletType = this.getRandomDropletType();
                    this.grid[y][x] = {
                        type: dropletType,
                        x: x,
                        y: y,
                        scale: 0,
                        rotation: Math.random() * Math.PI * 2,
                        glowIntensity: 0.5 + Math.random() * 0.5,
                        id: Math.random().toString(36).substr(2, 9)
                    };
                    
                    // Animate appearance
                    this.animateDropletAppear(this.grid[y][x]);
                }
            }
        }
    }
    
    animateDropletAppear(droplet) {
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            droplet.scale = this.easeOutBounce(progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    easeOutBounce(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }
    
    checkMatches() {
        const matches = this.findMatches();
        if (matches.length > 0) {
            this.removeMatches(matches);
            this.combo++;
            this.score += matches.length * 10 * this.combo;
            
            if (effectsSystem) {
                effectsSystem.createComboEffect(
                    this.canvas.width / 2,
                    this.canvas.height / 2,
                    this.combo
                );
            }
            
            if (audioSystem) {
                audioSystem.playSound('combo');
            }
            
            setTimeout(() => this.processMatches(), 500);
        } else {
            this.combo = 0;
        }
        this.updateUI();
    }
    
    findMatches() {
        const matches = [];
        const visited = new Set();
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] && !visited.has(`${x},${y}`)) {
                    const group = this.findConnectedGroup(x, y, this.grid[y][x].type, visited);
                    if (group.length >= 3) {
                        matches.push(...group);
                    }
                }
            }
        }
        
        return matches;
    }
    
    findConnectedGroup(startX, startY, type, visited) {
        const group = [];
        const stack = [{ x: startX, y: startY }];
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (!this.isValidPosition(x, y)) continue;
            if (!this.grid[y][x]) continue;
            
            // Rainbow droplets match everything
            if (this.grid[y][x].type !== type && 
                !this.grid[y][x].isRainbow && 
                !this.grid[startY][startX].isRainbow) continue;
            
            visited.add(key);
            group.push({ x, y });
            
            // Check 4 directions
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
        
        return group;
    }
    
    removeMatches(matches) {
        matches.forEach(match => {
            const { x, y } = match;
            if (this.grid[y][x]) {
                const dropletType = this.dropletTypes[this.grid[y][x].type] || this.dropletTypes[0];
                
                if (effectsSystem) {
                    effectsSystem.createSplashEffect(
                        this.offsetX + x * this.cellSize + this.cellSize / 2,
                        this.offsetY + y * this.cellSize + this.cellSize / 2,
                        dropletType.color
                    );
                }
                
                this.grid[y][x] = null;
            }
        });
        
        if (audioSystem) {
            audioSystem.playSound('splash');
        }
    }
    
    startLevel() {
        this.initializeGrid();
        this.gameRunning = true;
        this.updateUI();
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
    
    updateCooldowns() {
        Object.keys(this.powerups).forEach(key => {
            if (this.powerups[key].cooldown > 0) {
                this.powerups[key].cooldown -= 1/60;
                if (this.powerups[key].cooldown <= 0) {
                    this.powerups[key].cooldown = 0;
                }
            }
        });
        this.updatePowerupUI();
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            // Update particle physics
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.gravity) {
                particle.vy += particle.gravity;
            }
            
            // Apply bounce if particle hits boundaries
            if (particle.bounce) {
                if (particle.x < 0 || particle.x > this.canvas.width) {
                    particle.vx *= -particle.bounce;
                    particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
                }
                if (particle.y > this.canvas.height) {
                    particle.vy *= -particle.bounce;
                    particle.y = this.canvas.height;
                }
            }
            
            particle.life -= particle.decay;
            
            // Draw particle using effects system
            if (particle.life > 0 && effectsSystem) {
                effectsSystem.drawParticle(particle);
                return true;
            }
            return false;
        });
    }
    
    updateAnimations() {
        this.animations = this.animations.filter(animation => {
            animation.life -= animation.decay;
            
            if (animation.life > 0 && effectsSystem) {
                effectsSystem.drawAnimation(animation);
                return true;
            }
            return false;
        });
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