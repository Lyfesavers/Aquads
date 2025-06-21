// Advanced Visual Effects System for Aqua Splash
class EffectsSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
    }
    
    createSplashEffect(x, y, color, intensity = 1) {
        // Advanced particle splash with physics
        const particleCount = Math.floor(20 * intensity);
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 3 + Math.random() * 5 * intensity;
            const size = 2 + Math.random() * 4 * intensity;
            
            this.game.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: size,
                color: color,
                type: 'splash',
                gravity: 0.1,
                bounce: 0.6,
                trail: []
            });
        }
        
        // Create ripple waves
        this.createRippleWaves(x, y, intensity);
        
        // Screen effect
        this.game.screenShake += intensity * 5;
        this.game.flashEffect = Math.min(0.3, intensity * 0.1);
    }
    
    createRippleWaves(x, y, intensity) {
        for (let i = 0; i < 3; i++) {
            this.game.animations.push({
                type: 'ripple',
                x: x,
                y: y,
                radius: 0,
                maxRadius: 100 * intensity,
                life: 1,
                decay: 0.015,
                opacity: 0.6,
                delay: i * 200
            });
        }
    }
    
    createComboEffect(x, y, comboCount) {
        // Spectacular combo effects
        const colors = ['#ffff00', '#ff6600', '#ff0066', '#9900ff', '#0099ff'];
        const color = colors[Math.min(comboCount - 1, colors.length - 1)];
        
        // Create energy burst
        for (let i = 0; i < comboCount * 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            
            this.game.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.01,
                size: 3 + Math.random() * 5,
                color: color,
                type: 'energy',
                glow: true,
                spiral: true,
                spiralSpeed: 0.1
            });
        }
        
        // Create text effect
        this.createFloatingText(x, y, `${comboCount}X COMBO!`, color, 24);
        
        // Screen effects
        this.game.screenShake += comboCount * 3;
        this.game.flashEffect = Math.min(0.5, comboCount * 0.05);
    }
    
    createFloatingText(x, y, text, color, size) {
        this.game.animations.push({
            type: 'floatingText',
            x: x,
            y: y,
            text: text,
            color: color,
            size: size,
            life: 1,
            decay: 0.02,
            vx: 0,
            vy: -2,
            bounce: true
        });
    }
    
    createPowerupEffect(x, y, type) {
        const effects = {
            bomb: { color: '#ff4444', particles: 50, size: 8 },
            lightning: { color: '#ffff44', particles: 30, size: 6 },
            freeze: { color: '#44ffff', particles: 40, size: 5 },
            rainbow: { color: '#ff44ff', particles: 60, size: 10 }
        };
        
        const effect = effects[type];
        if (!effect) return;
        
        // Create powerup particles
        for (let i = 0; i < effect.particles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            
            this.game.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.015,
                size: Math.random() * effect.size,
                color: effect.color,
                type: 'powerup',
                glow: true,
                sparkle: true
            });
        }
        
        // Create shockwave
        this.game.animations.push({
            type: 'shockwave',
            x: x,
            y: y,
            radius: 0,
            maxRadius: 200,
            life: 1,
            decay: 0.05,
            color: effect.color
        });
    }
    
    createLevelUpEffect() {
        const centerX = this.game.canvas.width / 2;
        const centerY = this.game.canvas.height / 2;
        
        // Create celebration particles
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            const colors = ['#ffff00', '#ff6600', '#ff0066', '#9900ff', '#00ff66'];
            
            this.game.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.01,
                size: 2 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                type: 'celebration',
                glow: true,
                twinkle: true
            });
        }
        
        // Create level up text
        this.createFloatingText(centerX, centerY - 50, 'LEVEL UP!', '#ffff00', 36);
        
        // Full screen flash
        this.game.flashEffect = 0.7;
        this.game.screenShake = 30;
    }
    
    drawParticle(particle) {
        this.ctx.save();
        
        // Set particle properties
        this.ctx.globalAlpha = particle.life;
        
        if (particle.glow) {
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 15;
        }
        
        if (particle.type === 'splash') {
            // Water droplet effect
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            gradient.addColorStop(0, particle.color + 'AA');
            gradient.addColorStop(0.7, particle.color + '66');
            gradient.addColorStop(1, particle.color + '00');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
        } else if (particle.type === 'energy') {
            // Energy particle with spiral motion
            if (particle.spiral) {
                particle.spiralAngle = (particle.spiralAngle || 0) + particle.spiralSpeed;
                particle.vx += Math.cos(particle.spiralAngle) * 0.5;
                particle.vy += Math.sin(particle.spiralAngle) * 0.5;
            }
            
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
        } else if (particle.type === 'powerup') {
            // Sparkling powerup particle
            if (particle.sparkle) {
                const sparkleSize = particle.size * (0.5 + Math.sin(Date.now() * 0.01) * 0.5);
                this.ctx.fillStyle = particle.color;
                this.ctx.fillRect(
                    particle.x - sparkleSize/2,
                    particle.y - sparkleSize/2,
                    sparkleSize,
                    sparkleSize
                );
            } else {
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
        } else {
            // Default particle
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawAnimation(animation) {
        this.ctx.save();
        this.ctx.globalAlpha = animation.opacity || animation.life;
        
        if (animation.type === 'ripple') {
            if (animation.delay && animation.delay > 0) {
                animation.delay -= 16; // Assume 60fps
                this.ctx.restore();
                return;
            }
            
            animation.radius += 3;
            this.ctx.strokeStyle = '#00ccff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(animation.x, animation.y, animation.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
        } else if (animation.type === 'shockwave') {
            animation.radius += 8;
            const gradient = this.ctx.createRadialGradient(
                animation.x, animation.y, animation.radius - 20,
                animation.x, animation.y, animation.radius
            );
            gradient.addColorStop(0, animation.color + '00');
            gradient.addColorStop(0.5, animation.color + '88');
            gradient.addColorStop(1, animation.color + '00');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 10;
            this.ctx.beginPath();
            this.ctx.arc(animation.x, animation.y, animation.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
        } else if (animation.type === 'floatingText') {
            animation.y += animation.vy;
            if (animation.bounce && animation.y < 100) {
                animation.vy = Math.abs(animation.vy) * 0.5;
            }
            
            this.ctx.font = `bold ${animation.size}px Orbitron`;
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = animation.color;
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(animation.text, animation.x, animation.y);
            this.ctx.fillText(animation.text, animation.x, animation.y);
        }
        
        this.ctx.restore();
    }
}

// Audio System
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = false;
        this.masterVolume = 0.3;
    }
    
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;
        } catch (e) {
            console.warn('Audio not supported');
        }
    }
    
    playSound(type, volume = 1) {
        if (!this.enabled || !this.audioContext) return;
        
        const sounds = {
            splash: () => this.createSplashSound(),
            combo: () => this.createComboSound(),
            powerup: () => this.createPowerupSound(),
            levelup: () => this.createLevelUpSound(),
            select: () => this.createSelectSound()
        };
        
        const soundFunction = sounds[type];
        if (soundFunction) {
            soundFunction();
        }
    }
    
    createSplashSound() {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
        
        gain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }
    
    createComboSound() {
        const frequencies = [440, 554, 659, 784]; // C, D#, E, G
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.2);
            }, index * 50);
        });
    }
    
    createPowerupSound() {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.3);
        
        gain.gain.setValueAtTime(this.masterVolume * 0.7, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }
    
    createLevelUpSound() {
        // Triumphant ascending melody
        const notes = [261, 329, 392, 523]; // C, E, G, C (octave)
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'square';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.4);
            }, index * 100);
        });
    }
    
    createSelectSound() {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 600;
        
        gain.gain.setValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);
    }
}

// Effects and Audio systems are used globally
// Variables are declared in the main engine file 