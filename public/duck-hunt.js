// Duck Hunt Background Game
(function() {
  // Completely prevent duck hunt from running on AquaSwap page
  function isAquaSwapPage() {
    // Check multiple ways the AquaSwap page could be identified
    const path = window.location.pathname;
    const hash = window.location.hash;
    const url = window.location.href;
    
    // Check for various AquaSwap page indicators
    if (path === '/aquaswap' || 
        hash === '#/aquaswap' || 
        hash.includes('/aquaswap') ||
        url.includes('/aquaswap') ||
        path.includes('aquaswap')) {
      return true;
    }
    
    // Also check if we're in a React Router environment and the current route is AquaSwap
    if (window.location.hash.startsWith('#/') && window.location.hash.includes('aquaswap')) {
      return true;
    }
    
    return false;
  }
  
  // Exit immediately if on AquaSwap page
  if (isAquaSwapPage()) {
    console.log('Duck Hunt: Skipping initialization on AquaSwap page');
    return;
  }
  
  // Also listen for route changes and disable if navigating to AquaSwap
  let routeCheckInterval = setInterval(() => {
    if (isAquaSwapPage()) {
      console.log('Duck Hunt: AquaSwap page detected, stopping game');
      if (typeof stopGame === 'function') {
        stopGame();
      }
      // Remove all duck hunt elements
      const gameContainer = document.querySelector('[style*="z-index: 9998"]');
      if (gameContainer) {
        gameContainer.remove();
      }
      const soundButton = document.getElementById('duck-hunt-sound-button');
      if (soundButton) {
        soundButton.remove();
      }
      const scoreDisplay = document.getElementById('duck-score');
      if (scoreDisplay) {
        scoreDisplay.remove();
      }
      clearInterval(routeCheckInterval);
    }
  }, 1000);
  
  // Game container
  const gameContainer = document.createElement('div');
  
  // Game state
  let ducks = [];
  let score = 0;
  let ducksCreated = 0;
  const maxDucks = 5; // Maximum number of ducks on screen - increased for more action
  let feathers = []; // Track all feather particles
  let bullets = []; // Track all bullet projectiles
  let cursorX = 0; // Track cursor X position for bullet origin
  let cursorY = 0; // Track cursor Y position for bullet origin
  let soundEnabled = false; // Track if sounds are enabled
  let soundsCreated = false; // Track if sounds are created
  let gameStarted = false; // Track if game has been started
  let duckSpawningInterval = null; // Track interval for spawning ducks
  let isGameRunning = false; // Track if game animation is running
  
  // Create a silent logger that only logs in development
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.includes('dev');
  
  // Create a silent logger
  const logger = {
    log: isDev ? console.log.bind(console) : function(){},
    error: isDev ? console.error.bind(console) : function(){},
    warn: isDev ? console.warn.bind(console) : function(){}
  };
  
  // Duck species (classic Duck Hunt color palettes)
  const duckSpecies = [
    {
      // Black duck (classic primary duck)
      bodyColor: '#000000', // Black body
      headColor: '#000000', // Black head
      beakColor: '#FF6600', // Orange beak
      wingColor: '#000000', // Black wings
      accentColor: '#FFFFFF', // White accent
      points: 10, // Standard points
      isSpecial: false
    },
    {
      // Red duck (classic alternate duck)
      bodyColor: '#CC0000', // Red body
      headColor: '#CC0000', // Red head
      beakColor: '#FF6600', // Orange beak
      wingColor: '#CC0000', // Red wings
      accentColor: '#FFFFFF', // White accent
      points: 10, // Standard points
      isSpecial: false
    },
    {
      // Blue duck (NES color palette inspired)
      bodyColor: '#0000CC', // Blue body
      headColor: '#0000CC', // Blue head
      beakColor: '#FF6600', // Orange beak
      wingColor: '#0000CC', // Blue wings
      accentColor: '#FFFFFF', // White accent
      points: 10, // Standard points
      isSpecial: false
    },
    {
      // Golden bonus duck (rare, worth more points)
      bodyColor: '#FFD700', // Gold body
      headColor: '#FFD700', // Gold head
      beakColor: '#FF6600', // Orange beak
      wingColor: '#FFA500', // Orange wings
      accentColor: '#FFFFFF', // White accent
      points: 50, // Bonus points!
      isSpecial: true
    }
  ];
  
  const duckSizes = {
    width: 48,  // More pixel-proportioned size
    height: 40
  };
  
  // Create HTML audio elements directly in the DOM
  function createSoundElements() {
    // No longer needed since we're using Web Audio API
    soundsCreated = true;
    return true;
  }

  // Audio context for sound generation
  let audioContext = null;
  
  // Initialize audio context on first use
  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // Play a sound by its ID
  function playSound(soundName) {
    if (!soundEnabled) return;
    
    try {
      const ctx = getAudioContext();
      logger.log('Playing sound:', soundName, 'using Web Audio API');
      
      // Create different sounds based on name
      switch(soundName) {
        case 'shot':
          playShot(ctx);
          break;
        case 'quack':
          playQuack(ctx);
          break;
        case 'fall':
          playFall(ctx);
          break;
        case 'gameStart':
          playGameStart(ctx);
          break;
        case 'dogLaugh':
          playDogLaugh(ctx);
          break;
        default:
          logger.error('Unknown sound:', soundName);
      }
    } catch (error) {
      logger.error('Failed to play sound:', soundName, error);
    }
  }
  
  // Gunshot sound
  function playShot(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
  
  // Duck quack sound
  function playQuack(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    
    // Set up LFO
    lfo.frequency.value = 15;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    // Main oscillator
    osc.type = 'triangle';
    osc.frequency.value = 300;
    
    // Volume envelope
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    lfo.start();
    osc.start();
    
    lfo.stop(ctx.currentTime + 0.2);
    osc.stop(ctx.currentTime + 0.2);
  }
  
  // Falling sound
  function playFall(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }
  
  // Game start sound
  function playGameStart(ctx) {
    const noteLength = 0.1;
    const notes = [
      { note: 440, time: 0 },      // A4
      { note: 554.37, time: 0.1 }, // C#5
      { note: 659.25, time: 0.2 }, // E5
      { note: 880, time: 0.3 }     // A5
    ];
    
    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = note.note;
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime + note.time);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.time + noteLength);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + noteLength);
    });
  }
  
  // Dog laugh sound
  function playDogLaugh(ctx) {
    const iterations = 3;
    const iterationDuration = 0.15;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = ctx.currentTime + (i * iterationDuration);
      
      // Main oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, startTime);
      osc.frequency.setValueAtTime(400, startTime + 0.05);
      osc.frequency.setValueAtTime(300, startTime + 0.1);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.01, startTime + iterationDuration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + iterationDuration);
    }
  }
  
  // Initialize game
  function init() {
    // Don't run duck hunt on AquaSwap page as it interferes with mobile wallet interactions
    if (window.location.pathname === '/aquaswap' || window.location.hash === '#/aquaswap') {
      return;
    }
    
    // Don't run if already initialized
    if (gameStarted) {
      return;
    }
    
    // Style game container
    gameContainer.style.position = 'fixed';
    gameContainer.style.top = '0';
    gameContainer.style.left = '0';
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    gameContainer.style.pointerEvents = 'auto'; // Enable clicks for shooting
    gameContainer.style.zIndex = '9998'; // High z-index but below modals
    gameContainer.style.overflow = 'hidden';
    
    // Add pixel art styling
    const pixelArtStyle = document.createElement('style');
    pixelArtStyle.textContent = `
      .pixel-art {
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        box-shadow: none !important;
        transition: none !important;
      }
      
      .game-duck {
        image-rendering: pixelated;
        transform-origin: center center;
        will-change: transform;
      }
      
      /* Disable antialiasing for pixel-perfect edges */
      .game-duck * {
        transform-style: flat;
        backface-visibility: hidden;
      }
    `;
    document.head.appendChild(pixelArtStyle);
    
    // Create sounds in advance to ensure they're loaded
    createSoundElements();
    
    // Initialize audio context on first user interaction
    function unlockAudio() {
      logger.log('Attempting to unlock audio...');
      
      // Create and initialize audio context
      const ctx = getAudioContext();
      
      // Play a silent sound to unlock audio
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime); // Virtually silent
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      
      oscillator.start(0);
      oscillator.stop(ctx.currentTime + 0.1);
      
      // Remove the event listeners
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      
      logger.log('Audio unlock attempt complete');
    }
    
    // Add event listeners to unlock audio
    if (window.location.pathname !== '/aquaswap' && window.location.hash !== '#/aquaswap') {
      document.addEventListener('click', unlockAudio);
      document.addEventListener('touchstart', unlockAudio);
      document.addEventListener('keydown', unlockAudio);
    }
    
    // Add debug mode that can be activated with Shift+D
    let debugMode = false;
    document.addEventListener('keydown', function(e) {
      // Shift+D to enter debug mode
      if (e.shiftKey && e.key === 'D') {
        debugMode = !debugMode;
        logger.log('Duck hunt debug mode:', debugMode ? 'ON' : 'OFF');
        
        // Show/hide debug controls
        const debugControls = document.getElementById('duck-hunt-debug');
        if (debugMode) {
          if (!debugControls) {
            const debug = document.createElement('div');
            debug.id = 'duck-hunt-debug';
            debug.style.position = 'fixed';
            debug.style.bottom = '200px';
            debug.style.right = '20px';
            debug.style.backgroundColor = 'rgba(0,0,0,0.8)';
            debug.style.color = 'white';
            debug.style.padding = '10px';
            debug.style.borderRadius = '5px';
            debug.style.zIndex = '10003';
            debug.style.width = '250px';
            debug.style.fontFamily = 'monospace';
            
            debug.innerHTML = `
              <h3>Duck Hunt Debug</h3>
              <div>Sound Enabled: <span id="debug-sound-status">${soundEnabled ? 'YES' : 'NO'}</span></div>
              <div>Sounds Created: <span id="debug-sounds-created">${soundsCreated ? 'YES' : 'NO'}</span></div>
              <div>Test Sounds:</div>
              <div id="debug-sound-buttons"></div>
            `;
            
            document.body.appendChild(debug);
            
            // Create test sound buttons
            const soundButtonContainer = document.getElementById('debug-sound-buttons');
            const sounds = ['shot', 'quack', 'fall', 'gameStart', 'dogLaugh'];
            
            sounds.forEach(name => {
              const btn = document.createElement('button');
              btn.textContent = `Play ${name}`;
              btn.style.margin = '5px';
              btn.style.padding = '5px';
              btn.style.display = 'block';
              btn.style.width = '100%';
              
              btn.onclick = function() {
                // Force enable sounds temporarily if disabled
                const wasEnabled = soundEnabled;
                soundEnabled = true;
                
                // Ensure sounds are created
                if (!soundsCreated) {
                  createSoundElements();
                }
                
                // Play the sound
                playSound(name);
                
                // Reset sound enabled to previous state
                soundEnabled = wasEnabled;
              };
              
              soundButtonContainer.appendChild(btn);
            });
            
            // Add button to reload sounds
            const reloadBtn = document.createElement('button');
            reloadBtn.textContent = 'Reload All Sounds';
            reloadBtn.style.margin = '5px';
            reloadBtn.style.padding = '5px';
            reloadBtn.style.width = '100%';
            reloadBtn.style.backgroundColor = '#ff5555';
            
            reloadBtn.onclick = function() {
              soundsCreated = false;
              createSoundElements();
              document.getElementById('debug-sounds-created').textContent = 'RELOADED';
            };
            
            soundButtonContainer.appendChild(reloadBtn);
          } else {
            debugControls.style.display = 'block';
          }
        } else if (debugControls) {
          debugControls.style.display = 'none';
        }
      }
    });
    
    // Add gun sight cursor
    const gunSight = document.createElement('div');
    gunSight.style.position = 'fixed';
    gunSight.style.width = '24px';
    gunSight.style.height = '24px';
    gunSight.style.borderRadius = '50%';
    gunSight.style.border = '2px solid red';
    gunSight.style.boxShadow = '0 0 5px rgba(255,0,0,0.5)';
    gunSight.style.pointerEvents = 'none';
    gunSight.style.zIndex = '10001';
    gunSight.style.display = 'none';
    
    // Add crosshair to gun sight
    const crosshairH = document.createElement('div');
    crosshairH.style.position = 'absolute';
    crosshairH.style.top = '50%';
    crosshairH.style.left = '0';
    crosshairH.style.width = '100%';
    crosshairH.style.height = '2px';
    crosshairH.style.backgroundColor = 'red';
    crosshairH.style.transform = 'translateY(-50%)';
    gunSight.appendChild(crosshairH);
    
    const crosshairV = document.createElement('div');
    crosshairV.style.position = 'absolute';
    crosshairV.style.top = '0';
    crosshairV.style.left = '50%';
    crosshairV.style.width = '2px';
    crosshairV.style.height = '100%';
    crosshairV.style.backgroundColor = 'red';
    crosshairV.style.transform = 'translateX(-50%)';
    gunSight.appendChild(crosshairV);
    
    document.body.appendChild(gunSight);
    
    // Show gun sight on mousemove when over ducks
    document.addEventListener('mousemove', e => {
      const x = e.clientX;
      const y = e.clientY;
      
      // Track cursor position for bullet origin
      cursorX = x;
      cursorY = y;
      
      gunSight.style.left = `${x - 12}px`;
      gunSight.style.top = `${y - 12}px`;
      
      // Check if mouse is over a duck
      const isDuckUnder = e.target && e.target.classList && e.target.classList.contains('game-duck');
      gunSight.style.display = isDuckUnder ? 'block' : 'none';
    });
    
    // Add score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'duck-score';
    scoreDisplay.style.position = 'fixed';
    scoreDisplay.style.top = '20px'; // Increased top margin
    scoreDisplay.style.right = '80px'; // Increased right margin to avoid menu icon
    scoreDisplay.style.background = 'rgba(0, 0, 0, 0.7)';
    scoreDisplay.style.color = '#fff';
    scoreDisplay.style.padding = '8px 12px';
    scoreDisplay.style.borderRadius = '20px';
    scoreDisplay.style.fontSize = '16px';
    scoreDisplay.style.fontFamily = 'Arial, sans-serif';
    scoreDisplay.style.fontWeight = 'bold';
    scoreDisplay.style.zIndex = '10000';
    scoreDisplay.style.display = 'none'; // Initially hidden

    // Add responsive positioning for mobile
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    function handleMobileLayout(e) {
        if (e.matches) {
            // Mobile layout
            scoreDisplay.style.top = '70px'; // Move below the header
            scoreDisplay.style.right = '10px';
        } else {
            // Desktop layout
            scoreDisplay.style.top = '20px';
            scoreDisplay.style.right = '80px';
        }
    }
    mediaQuery.addListener(handleMobileLayout);
    handleMobileLayout(mediaQuery); // Initial check

    scoreDisplay.textContent = 'Ducks: 0';
    document.body.appendChild(scoreDisplay);
    
    // Add to document
    document.body.appendChild(gameContainer);
    
    // Start animation loop
    isGameRunning = true;
    requestAnimationFrame(updateGame);
    
    // Game is now started
    gameStarted = true;
    
    // Start spawning ducks occasionally
    startDuckSpawning();
  }
  
  // Start duck spawning
  function startDuckSpawning() {
    // Clear any existing interval to avoid duplicates
    if (duckSpawningInterval) {
      clearInterval(duckSpawningInterval);
    }
    
    // Start spawning duck groups more frequently (3-6 seconds for more action)
    duckSpawningInterval = setInterval(spawnDuckGroup, 3000 + Math.random() * 3000);
    
    // Spawn first duck group immediately
    spawnDuckGroup();
  }
  
  // Spawn a group of 2-3 ducks at once
  function spawnDuckGroup() {
    // Don't spawn ducks if the game hasn't been started
    if (!gameStarted) return;
    
    // Determine how many ducks to spawn (2-3 ducks)
    const numDucks = Math.random() < 0.6 ? 2 : 3; // 60% chance for 2 ducks, 40% chance for 3 ducks
    
    // Calculate how many ducks we can actually spawn without exceeding maxDucks
    const availableSlots = maxDucks - ducks.length;
    const ducksToSpawn = Math.min(numDucks, availableSlots);
    
    if (ducksToSpawn <= 0) return;
    
    // Choose a spawn pattern for the group
    const groupPattern = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < ducksToSpawn; i++) {
      // Add slight delays between duck spawns for a more natural flock appearance
      setTimeout(() => {
        createSingleDuck(groupPattern, i, ducksToSpawn);
      }, i * 200); // 200ms delay between each duck in the group
    }
  }

  // Create a single duck (renamed from spawnDuck)
  function createSingleDuck(groupPattern = 0, duckIndex = 0, totalDucks = 1) {
    // Don't spawn ducks if the game hasn't been started
    if (!gameStarted) return;
    
    // Limit number of ducks
    if (ducks.length >= maxDucks) return;
    
    // Choose a random duck species with weighted probability (golden duck is rare)
    let species;
    const specialChance = Math.random();
    if (specialChance < 0.85) {
      // 85% chance for regular ducks (black, red, blue)
      species = duckSpecies[Math.floor(Math.random() * 3)];
    } else {
      // 15% chance for golden bonus duck
      species = duckSpecies[3]; // Golden duck
    }
    
    // Size with slight variation
    const size = {
      width: duckSizes.width + Math.random() * 20,
      height: duckSizes.height + Math.random() * 10
    };
    
    // Group spawn positioning based on pattern
    let x, y, speedX, speedY, startFromLeft;
    
    // Calculate spacing for group formations
    const verticalSpacing = 80; // Vertical spacing between ducks
    const horizontalSpacing = 100; // Horizontal spacing between ducks
    
    switch (groupPattern) {
      case 0: // Left side formation
        x = -size.width - (duckIndex * 50); // Stagger horizontal position slightly
        y = 100 + Math.random() * (window.innerHeight - 400) + (duckIndex * verticalSpacing);
        speedX = 4 + Math.random() * 4;
        speedY = (Math.random() - 0.5) * 1.5;
        startFromLeft = true;
        break;
        
      case 1: // Right side formation
        x = window.innerWidth + (duckIndex * 50); // Stagger horizontal position slightly
        y = 100 + Math.random() * (window.innerHeight - 400) + (duckIndex * verticalSpacing);
        speedX = -(4 + Math.random() * 4);
        speedY = (Math.random() - 0.5) * 1.5;
        startFromLeft = false;
        break;
        
      case 2: // Bottom formation (flying up in a line)
        x = (window.innerWidth / (totalDucks + 1)) * (duckIndex + 1) - size.width/2;
        y = window.innerHeight + (duckIndex * 60); // Stagger vertical position
        speedX = (Math.random() - 0.5) * 2;
        speedY = -(4 + Math.random() * 3);
        startFromLeft = speedX >= 0;
        break;
        
      case 3: // V-formation from top
        const centerX = window.innerWidth / 2;
        const vSpread = duckIndex * horizontalSpacing - ((totalDucks - 1) * horizontalSpacing / 2);
        x = centerX + vSpread;
        y = -size.height - (Math.abs(vSpread) * 0.3); // V-shape: outer ducks higher
        speedX = (vSpread > 0 ? 1 : -1) * (2 + Math.random() * 2); // Slight inward movement
        speedY = 3 + Math.random() * 2;
        startFromLeft = speedX >= 0;
        break;
        
      default: // Fallback to random positioning
        x = Math.random() * (window.innerWidth - size.width);
        y = 100 + Math.random() * (window.innerHeight - 300);
        speedX = (Math.random() - 0.5) * 6;
        speedY = (Math.random() - 0.5) * 4;
        startFromLeft = speedX >= 0;
    }
    
    // Add slight wave motion
    const waveAmplitude = Math.random() * 1.5 + 0.5; // Random amplitude between 0.5 and 2
    const waveFrequency = Math.random() * 0.01 + 0.005; // Random frequency
    
    // Make golden ducks faster and more challenging
    if (species.isSpecial) {
      speedX *= 1.4; // 40% faster
      speedY *= 1.3; // 30% faster vertical movement
    }
    
    // Create duck container
    const duck = document.createElement('div');
    duck.className = 'game-duck';
    duck.style.position = 'absolute';
    duck.style.left = `${x}px`;
    duck.style.top = `${y}px`;
    duck.style.width = `${size.width}px`;
    duck.style.height = `${size.height}px`;
    duck.style.transform = startFromLeft ? 'scaleX(1)' : 'scaleX(-1)';
    duck.style.zIndex = '9999';
    duck.style.pointerEvents = 'auto';
    duck.style.cursor = 'crosshair';
    duck.style.imageRendering = 'pixelated'; // Add pixel rendering style
    
    // Add special glow effect for golden ducks
    if (species.isSpecial) {
      duck.style.filter = 'drop-shadow(0 0 8px #FFD700) drop-shadow(0 0 16px #FFD700)';
      duck.style.animation = 'goldenGlow 2s ease-in-out infinite';
      
      // Add golden glow animation keyframes
      const glowStyle = document.createElement('style');
      glowStyle.textContent = `
        @keyframes goldenGlow {
          0%, 100% { filter: drop-shadow(0 0 8px #FFD700) drop-shadow(0 0 16px #FFD700); }
          50% { filter: drop-shadow(0 0 12px #FFD700) drop-shadow(0 0 24px #FFD700) drop-shadow(0 0 8px #FFA500); }
        }
      `;
      document.head.appendChild(glowStyle);
    }
    
    // Create duck body (main part)
    const body = document.createElement('div');
    body.className = 'pixel-art';
    body.style.position = 'absolute';
    body.style.width = '80%';
    body.style.height = '60%';
    body.style.top = '30%';
    body.style.left = '10%';
    body.style.backgroundColor = species.bodyColor;
    body.style.borderRadius = '0'; // Sharp corners for pixel look
    duck.appendChild(body);
    
    // Create duck head
    const head = document.createElement('div');
    head.className = 'pixel-art';
    head.style.position = 'absolute';
    head.style.width = '40%';
    head.style.height = '35%';
    head.style.backgroundColor = species.headColor;
    head.style.borderRadius = '0'; // Sharp corners for pixel look
    head.style.left = startFromLeft ? '45%' : '15%';
    head.style.top = '5%';
    head.style.zIndex = '2';
    duck.appendChild(head);
    
    // Create duck bill (more accurately shaped)
    const bill = document.createElement('div');
    bill.className = 'pixel-art';
    bill.style.position = 'absolute';
    bill.style.width = '30%';
    bill.style.height = '15%';
    bill.style.backgroundColor = species.beakColor;
    bill.style.borderRadius = '0'; // Sharp corners
    bill.style.top = '15%';
    bill.style.left = startFromLeft ? '80%' : '-10%';
    bill.style.zIndex = '3';
    duck.appendChild(bill);
    
    // Create duck eye (placed correctly on head)
    const eye = document.createElement('div');
    eye.className = 'pixel-art';
    eye.style.position = 'absolute';
    eye.style.width = '10%';
    eye.style.height = '10%';
    eye.style.backgroundColor = '#000000'; // Black eye like original
    eye.style.borderRadius = '0';
    eye.style.top = '15%';
    eye.style.left = startFromLeft ? '70%' : '20%';
    eye.style.zIndex = '4';
    duck.appendChild(eye);

    // Create duck wing (positioned better)
    const wing = document.createElement('div');
    wing.className = 'pixel-art wing-element';
    wing.style.position = 'absolute';
    wing.style.width = '40%';
    wing.style.height = '25%';
    wing.style.backgroundColor = species.wingColor;
    wing.style.borderRadius = '0';
    wing.style.top = '40%';
    wing.style.left = '20%';
    wing.style.transformOrigin = 'top center';
    // No default animation - we'll control it via frames
    wing.style.zIndex = '3';
    duck.appendChild(wing);
    
    // Add second wing for layered look when flapping
    const wingBack = document.createElement('div');
    wingBack.className = 'pixel-art';
    wingBack.style.position = 'absolute';
    wingBack.style.width = '30%';
    wingBack.style.height = '20%';
    wingBack.style.backgroundColor = darkenColor(species.wingColor, -15); // Slightly brighter
    wingBack.style.borderRadius = '0';
    wingBack.style.top = '45%';
    wingBack.style.left = '25%';
    wingBack.style.zIndex = '2';
    duck.appendChild(wingBack);
    
    // Create tail feathers (new element)
    const tail = document.createElement('div');
    tail.className = 'pixel-art';
    tail.style.position = 'absolute';
    tail.style.width = '20%';
    tail.style.height = '20%';
    tail.style.backgroundColor = species.bodyColor;
    tail.style.borderRadius = '0';
    tail.style.top = '40%';
    tail.style.left = startFromLeft ? '0%' : '80%';
    tail.style.zIndex = '1';
    duck.appendChild(tail);
    
    // Add feet (new element)
    const feet = document.createElement('div');
    feet.className = 'pixel-art';
    feet.style.position = 'absolute';
    feet.style.width = '25%';
    feet.style.height = '10%';
    feet.style.backgroundColor = species.beakColor; // Same color as beak
    feet.style.borderRadius = '0';
    feet.style.top = '90%';
    feet.style.left = '40%';
    feet.style.zIndex = '1';
    duck.appendChild(feet);
    
    // Add white belly patch (characteristic of ducks)
    const belly = document.createElement('div');
    belly.className = 'pixel-art';
    belly.style.position = 'absolute';
    belly.style.width = '50%';
    belly.style.height = '30%';
    belly.style.backgroundColor = species.accentColor; // White for the belly
    belly.style.borderRadius = '0';
    belly.style.top = '60%';
    belly.style.left = '25%';
    belly.style.zIndex = '2';
    duck.appendChild(belly);
    
    // Add flapping animation - just like NES version
    const keyframes = `
      @keyframes pixelFlapWings {
        0% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
        100% { transform: translateY(0); }
      }
    `;
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    // Add click handler to shoot duck - creates bullet projectile
    duck.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Only shoot if game is running
      if (!isGameRunning) return;
      
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      // Use cursor position or click position as bullet origin
      const startX = cursorX || clickX;
      const startY = cursorY || clickY;
      
      // Create bullet projectile from cursor to click position
      createBullet(startX, startY, clickX, clickY);
      
      // Play shot sound immediately
      if (soundEnabled) {
        playSound('shot');
      }
      
      // Show score when first shot is fired
      const scoreDisplay = document.getElementById('duck-score');
      if (scoreDisplay) {
        scoreDisplay.style.display = 'block';
      }
      
      // If sound button is visible but sound not enabled yet, flash it
      if (!soundEnabled) {
        const soundButton = document.getElementById('duck-hunt-sound-button');
        if (soundButton) {
          soundButton.style.animation = 'pulsate 0.5s 3';
          const animationKeyframes = `
            @keyframes pulsate {
              0% { transform: scale(1); }
              50% { transform: scale(1.2); background-color: #ff0000; }
              100% { transform: scale(1); }
            }
          `;
          const animStyle = document.createElement('style');
          animStyle.textContent = animationKeyframes;
          document.head.appendChild(animStyle);
        }
      }
    });
    
    // Also add click handler to game container for shooting anywhere
    gameContainer.addEventListener('click', (e) => {
      // Only shoot if game is running
      if (!isGameRunning) return;
      
      // Don't shoot if clicking on UI elements or ducks (ducks have their own handler)
      if (e.target.id === 'duck-hunt-sound-button' || 
          e.target.id === 'duck-score' ||
          e.target.closest('#duck-hunt-sound-button') ||
          e.target.closest('#duck-score') ||
          e.target.classList.contains('game-duck')) {
        return;
      }
      
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      // Use cursor position or click position as bullet origin
      const startX = cursorX || clickX;
      const startY = cursorY || clickY;
      
      // Create bullet projectile from cursor to click position
      createBullet(startX, startY, clickX, clickY);
      
      // Play shot sound immediately
      if (soundEnabled) {
        playSound('shot');
      }
      
      // Show score when first shot is fired
      const scoreDisplay = document.getElementById('duck-score');
      if (scoreDisplay) {
        scoreDisplay.style.display = 'block';
      }
    });
    
    // Track duck data
    const duckData = {
      element: duck,
      x,
      y,
      speedX,
      speedY,
      startY: y,
      waveAmplitude,
      waveFrequency,
      time: 0,
      size,
      startFromLeft,
      shot: false,
      fallSpeed: 0,
      rotationSpeed: 0,
      quackTimer: Math.random() * 5000,
      species
    };
    
    // Add to game
    gameContainer.appendChild(duck);
    ducks.push(duckData);
    ducksCreated++;
    
    // Occasionally play quack sound when a new duck appears
    if (soundEnabled && Math.random() < 0.4) {
      playSound('quack');
    }
  }
  
  // Create bullet projectile
  function createBullet(startX, startY, targetX, targetY) {
    const bullet = document.createElement('div');
    bullet.className = 'bullet-projectile';
    bullet.style.position = 'absolute';
    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;
    bullet.style.width = '6px';
    bullet.style.height = '6px';
    bullet.style.backgroundColor = '#FFD700'; // Gold bullet
    bullet.style.borderRadius = '50%';
    bullet.style.boxShadow = '0 0 6px #FFD700, 0 0 12px rgba(255, 215, 0, 0.8), 0 0 18px rgba(255, 215, 0, 0.4)';
    bullet.style.pointerEvents = 'none';
    bullet.style.zIndex = '9996';
    bullet.style.transition = 'none'; // No CSS transitions for smooth animation
    
    // Calculate direction and distance
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Prevent division by zero
    if (distance === 0) {
      return;
    }
    
    const speed = 18; // pixels per frame - smooth and visible
    const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 1.5; // Travel up to 1.5x screen size
    
    // Normalize direction
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Track bullet data
    const bulletData = {
      element: bullet,
      x: startX,
      y: startY,
      dirX,
      dirY,
      speed,
      distanceTraveled: 0,
      maxDistance,
      hit: false
    };
    
    // Add to game
    gameContainer.appendChild(bullet);
    bullets.push(bulletData);
  }
  
  // Check if bullet hits a duck (with larger hit area for better accuracy)
  function checkBulletHit(bullet, duck) {
    if (duck.shot || bullet.hit) return false;
    
    // Get duck center and size
    const duckCenterX = duck.x + duck.size.width / 2;
    const duckCenterY = duck.y + duck.size.height / 2;
    
    // Calculate distance from bullet to duck center
    const dx = bullet.x - duckCenterX;
    const dy = bullet.y - duckCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Larger hit area - 80% of the duck size for more forgiving accuracy
    const hitRadius = Math.max(duck.size.width, duck.size.height) * 0.8;
    
    return distance <= hitRadius;
  }
  
  // Shoot a duck (called when bullet hits or direct click)
  function shootDuck(duckIndex) {
    if (duckIndex === -1 || duckIndex >= ducks.length || ducks[duckIndex].shot) return;
    
    const duck = ducks[duckIndex];
    duck.shot = true;
    duck.fallSpeed = 2 + Math.random() * 3;
    duck.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 10);
    
    // Change color to white when hit (like in original Duck Hunt)
    Array.from(duck.element.querySelectorAll('div')).forEach(el => {
      el.style.backgroundColor = '#FFFFFF';
    });
    
    // Create pixel feather particles at duck center
    createFeathers(duck.x + duck.size.width / 2, duck.y + duck.size.height / 2, 8);
    
    // Update score based on duck species
    const pointsEarned = duck.species.points;
    score += pointsEarned;
    updateScore();
    
    // Show special bonus message for golden ducks
    if (duck.species.isSpecial) {
      showBonusMessage(pointsEarned);
    }
    
    // Play sound effects if enabled (shot sound already played when bullet created)
    if (soundEnabled) {
      // Play fall sound after a short delay
      setTimeout(() => {
        playSound('fall');
      }, 300);
      
      // Rarely play dog laugh when duck is shot (25% chance)
      if (Math.random() < 0.25) {
        setTimeout(() => {
          playSound('dogLaugh');
          showLaughingDog(); // Show the laughing dog visual
        }, 800);
      }
    }
  }
  
  // Create feather particles when duck is shot
  function createFeathers(x, y, count) {
    // Classic NES color palette for feathers
    const featherColors = [
      '#FFFFFF', // White
      '#FF0000', // Red
      '#0000FF', // Blue
    ];
    
    for (let i = 0; i < count; i++) {
      // Create pixel square particles
      const feather = document.createElement('div');
      feather.className = 'pixel-art feather-particle';
      feather.style.position = 'absolute';
      feather.style.left = `${x + Math.random() * 40}px`;
      feather.style.top = `${y + Math.random() * 20}px`;
      feather.style.width = '6px'; // Larger pixel blocks
      feather.style.height = '6px';
      feather.style.backgroundColor = featherColors[Math.floor(Math.random() * featherColors.length)];
      feather.style.borderRadius = '0'; // Sharp corners for pixel look
      feather.style.opacity = '1';
      feather.style.pointerEvents = 'none';
      feather.style.zIndex = '9997';
      
      // Set random movement - more exaggerated
      const speedX = Math.random() * 8 - 4;
      const speedY = -4 - Math.random() * 4; // Stronger upward movement
      
      // Track feather data
      const featherData = {
        element: feather,
        x: parseFloat(feather.style.left),
        y: parseFloat(feather.style.top),
        speedX,
        speedY,
        opacity: 1,
        gravity: 0.2,
        // Move in 8 directions (like NES games) instead of smooth curves
        rotation: Math.floor(Math.random() * 8) * 45,
        rotationDir: Math.random() < 0.5 ? 1 : -1
      };
      
      // Add to game
      gameContainer.appendChild(feather);
      feathers.push(featherData);
    }
  }
  
  // Update score display
  function updateScore() {
    const scoreDisplay = document.getElementById('duck-score');
    if (scoreDisplay) {
      scoreDisplay.textContent = `Score: ${score}`;
    }
  }
  
  // Show bonus message for special ducks
  function showBonusMessage(points) {
    const bonusMsg = document.createElement('div');
    bonusMsg.textContent = `BONUS! +${points} points!`;
    bonusMsg.style.position = 'fixed';
    bonusMsg.style.top = '50%';
    bonusMsg.style.left = '50%';
    bonusMsg.style.transform = 'translate(-50%, -50%)';
    bonusMsg.style.color = '#FFD700';
    bonusMsg.style.fontSize = '24px';
    bonusMsg.style.fontWeight = 'bold';
    bonusMsg.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    bonusMsg.style.zIndex = '10001';
    bonusMsg.style.pointerEvents = 'none';
    bonusMsg.style.fontFamily = 'Courier New, monospace';
    
    document.body.appendChild(bonusMsg);
    
    // Animate and remove the message
    setTimeout(() => {
      bonusMsg.style.transition = 'opacity 1s, transform 1s';
      bonusMsg.style.opacity = '0';
      bonusMsg.style.transform = 'translate(-50%, -70%) scale(1.2)';
      
      setTimeout(() => {
        if (bonusMsg.parentNode) {
          document.body.removeChild(bonusMsg);
        }
      }, 1000);
    }, 1500);
  }
  
  // Show laughing dog (classic Duck Hunt style)
  function showLaughingDog() {
    // Remove any existing dog first
    const existingDog = document.getElementById('laughing-dog');
    if (existingDog) {
      existingDog.remove();
    }
    
    // Create dog container
    const dog = document.createElement('div');
    dog.id = 'laughing-dog';
    dog.style.position = 'fixed';
    dog.style.bottom = '20%';
    dog.style.left = '50%';
    dog.style.transform = 'translateX(-50%)';
    dog.style.width = '120px';
    dog.style.height = '100px';
    dog.style.zIndex = '10002';
    dog.style.pointerEvents = 'none';
    dog.style.imageRendering = 'pixelated';
    
    // Dog body (main brown rectangle)
    const body = document.createElement('div');
    body.style.position = 'absolute';
    body.style.width = '80px';
    body.style.height = '60px';
    body.style.backgroundColor = '#8B4513'; // Brown
    body.style.bottom = '0px';
    body.style.left = '20px';
    body.style.border = '2px solid #000000';
    dog.appendChild(body);
    
    // Dog head (overlapping circle)
    const head = document.createElement('div');
    head.style.position = 'absolute';
    head.style.width = '50px';
    head.style.height = '45px';
    head.style.backgroundColor = '#8B4513'; // Brown
    head.style.borderRadius = '50%';
    head.style.top = '10px';
    head.style.left = '35px';
    head.style.border = '2px solid #000000';
    dog.appendChild(head);
    
    // Dog snout
    const snout = document.createElement('div');
    snout.style.position = 'absolute';
    snout.style.width = '25px';
    snout.style.height = '20px';
    snout.style.backgroundColor = '#D2B48C'; // Lighter brown
    snout.style.borderRadius = '50%';
    snout.style.top = '25px';
    snout.style.left = '75px';
    snout.style.border = '2px solid #000000';
    dog.appendChild(snout);
    
    // Dog nose
    const nose = document.createElement('div');
    nose.style.position = 'absolute';
    nose.style.width = '8px';
    nose.style.height = '6px';
    nose.style.backgroundColor = '#000000';
    nose.style.borderRadius = '50%';
    nose.style.top = '28px';
    nose.style.left = '85px';
    dog.appendChild(nose);
    
    // Dog eyes (closed/laughing)
    const leftEye = document.createElement('div');
    leftEye.style.position = 'absolute';
    leftEye.style.width = '12px';
    leftEye.style.height = '3px';
    leftEye.style.backgroundColor = '#000000';
    leftEye.style.top = '20px';
    leftEye.style.left = '45px';
    leftEye.style.borderRadius = '50%';
    dog.appendChild(leftEye);
    
    const rightEye = document.createElement('div');
    rightEye.style.position = 'absolute';
    rightEye.style.width = '12px';
    rightEye.style.height = '3px';
    rightEye.style.backgroundColor = '#000000';
    rightEye.style.top = '20px';
    rightEye.style.left = '60px';
    rightEye.style.borderRadius = '50%';
    dog.appendChild(rightEye);
    
    // Dog mouth (laughing smile)
    const mouth = document.createElement('div');
    mouth.style.position = 'absolute';
    mouth.style.width = '20px';
    mouth.style.height = '10px';
    mouth.style.backgroundColor = '#000000';
    mouth.style.borderRadius = '0 0 20px 20px';
    mouth.style.top = '32px';
    mouth.style.left = '50px';
    dog.appendChild(mouth);
    
    // Dog tongue
    const tongue = document.createElement('div');
    tongue.style.position = 'absolute';
    tongue.style.width = '8px';
    tongue.style.height = '6px';
    tongue.style.backgroundColor = '#FF69B4'; // Pink
    tongue.style.borderRadius = '50%';
    tongue.style.top = '36px';
    tongue.style.left = '56px';
    dog.appendChild(tongue);
    
    // Dog ears
    const leftEar = document.createElement('div');
    leftEar.style.position = 'absolute';
    leftEar.style.width = '18px';
    leftEar.style.height = '25px';
    leftEar.style.backgroundColor = '#654321'; // Darker brown
    leftEar.style.borderRadius = '50%';
    leftEar.style.top = '8px';
    leftEar.style.left = '25px';
    leftEar.style.border = '2px solid #000000';
    leftEar.style.transform = 'rotate(-20deg)';
    dog.appendChild(leftEar);
    
    const rightEar = document.createElement('div');
    rightEar.style.position = 'absolute';
    rightEar.style.width = '18px';
    rightEar.style.height = '25px';
    rightEar.style.backgroundColor = '#654321'; // Darker brown
    rightEar.style.borderRadius = '50%';
    rightEar.style.top = '8px';
    rightEar.style.left = '75px';
    rightEar.style.border = '2px solid #000000';
    rightEar.style.transform = 'rotate(20deg)';
    dog.appendChild(rightEar);
    
    // Dog paws sticking up
    const leftPaw = document.createElement('div');
    leftPaw.style.position = 'absolute';
    leftPaw.style.width = '15px';
    leftPaw.style.height = '8px';
    leftPaw.style.backgroundColor = '#8B4513';
    leftPaw.style.borderRadius = '50%';
    leftPaw.style.top = '45px';
    leftPaw.style.left = '10px';
    leftPaw.style.border = '2px solid #000000';
    dog.appendChild(leftPaw);
    
    const rightPaw = document.createElement('div');
    rightPaw.style.position = 'absolute';
    rightPaw.style.width = '15px';
    rightPaw.style.height = '8px';
    rightPaw.style.backgroundColor = '#8B4513';
    rightPaw.style.borderRadius = '50%';
    rightPaw.style.top = '45px';
    rightPaw.style.right = '10px';
    rightPaw.style.border = '2px solid #000000';
    dog.appendChild(rightPaw);
    
    // Add laughing animation
    dog.style.animation = 'dogLaugh 0.3s ease-in-out 6'; // Shake 6 times
    
    // Add animation keyframes
    const dogLaughStyle = document.createElement('style');
    dogLaughStyle.textContent = `
      @keyframes dogLaugh {
        0%, 100% { transform: translateX(-50%) rotate(0deg); }
        25% { transform: translateX(-50%) rotate(-2deg) scale(1.05); }
        75% { transform: translateX(-50%) rotate(2deg) scale(1.05); }
      }
    `;
    document.head.appendChild(dogLaughStyle);
    
    // Add to screen
    document.body.appendChild(dog);
    
    // Remove dog after animation completes (about 2.5 seconds total)
    setTimeout(() => {
      if (dog.parentNode) {
        // Fade out
        dog.style.transition = 'opacity 0.5s';
        dog.style.opacity = '0';
        setTimeout(() => {
          if (dog.parentNode) {
            document.body.removeChild(dog);
          }
        }, 500);
      }
    }, 2500);
  }
  
  // Game loop
  function updateGame() {
    // Update each duck
    for (let i = ducks.length - 1; i >= 0; i--) {
      const duck = ducks[i];
      
      if (duck.shot) {
        // Update shot duck (falling)
        duck.fallSpeed += 0.15;
        duck.y += duck.fallSpeed;
        // For pixel art look, round rotation to increments of 90 degrees (4-directional)
        const rotation = Math.round(duck.rotationSpeed / 90) * 90;
        duck.element.style.transform = `rotate(${rotation}deg)`;
        
        // NES-style shot duck white flash effect
        const flashFrame = Math.floor(duck.fallSpeed * 2) % 2; // Flash between white and normal
        if (flashFrame === 0) {
          Array.from(duck.element.querySelectorAll('div')).forEach(el => {
            el.style.backgroundColor = '#FFFFFF';
          });
        }
        
        // Remove duck when it falls off-screen
        if (duck.y > window.innerHeight) {
          gameContainer.removeChild(duck.element);
          ducks.splice(i, 1);
        }
      } else {
        // Update flying duck - round to whole pixels for pixel perfect movement
        duck.x += duck.speedX;
        // Apply vertical movement
        duck.y += duck.speedY;
        duck.time += 0.016; // Approximately 16ms per frame
        
        // NES-style flight animation with distinct wing positions
        const wingFrame = Math.floor(duck.time * 8) % 3; // Cycle through 3 frames like NES game
        if (wingFrame === 0) {
          duck.element.querySelector('.wing-element').style.transform = 'translateY(0)';
        } else if (wingFrame === 1) {
          duck.element.querySelector('.wing-element').style.transform = 'translateY(-5px)';
        } else {
          duck.element.querySelector('.wing-element').style.transform = 'translateY(-10px)';
        }
        
        // Wave motion with 8-bit style jumping coordinates - only apply if duck is not flying up
        if (Math.abs(duck.speedY) < 1) {
          const waveAmount = Math.round(Math.sin(duck.time * 2) * 4) * 2; 
          duck.y += waveAmount / 10; // Reduced wave effect since we have direct vertical movement
        }
        
        // Occasional quacking
        duck.quackTimer -= 16;
        if (soundEnabled && duck.quackTimer <= 0) {
          playSound('quack');
          duck.quackTimer = 5000 + Math.random() * 8000;
        }
        
        // Don't change direction at screen edges - let ducks fly across screen
        // Increased chance to change direction randomly for more unpredictable movement
        if (Math.random() < 0.001) { // Doubled the chance for more erratic movement
          duck.speedX *= -1;
          duck.element.style.transform = duck.speedX > 0 ? 'scaleX(1)' : 'scaleX(-1)';
        }
        
        // Occasionally change vertical direction for more dynamic flight patterns
        if (Math.random() < 0.0008) {
          duck.speedY *= -0.7; // Change direction but reduce speed slightly
        }
        
        // Remove duck if it flies too far off-screen (increased distance to ensure they cross full screen)
        if (duck.x < -duck.size.width * 3 || 
            duck.x > window.innerWidth + duck.size.width * 3 ||
            duck.y < -duck.size.height * 3 || 
            duck.y > window.innerHeight + duck.size.height * 3) {
          gameContainer.removeChild(duck.element);
          ducks.splice(i, 1);
          continue;
        }
      }
      
      // Update duck position - use Math.round for pixel-perfect positioning
      // NES style - positions snap to 2px grid
      duck.element.style.left = `${Math.round(duck.x / 2) * 2}px`;
      duck.element.style.top = `${Math.round(duck.y / 2) * 2}px`;
    }
    
    // Update each bullet projectile
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      
      if (bullet.hit) {
        // Remove hit bullets
        if (bullet.element.parentNode === gameContainer) {
          gameContainer.removeChild(bullet.element);
        }
        bullets.splice(i, 1);
        continue;
      }
      
      // Move bullet
      bullet.x += bullet.dirX * bullet.speed;
      bullet.y += bullet.dirY * bullet.speed;
      bullet.distanceTraveled += bullet.speed;
      
      // Check collision with ducks
      for (let j = 0; j < ducks.length; j++) {
        const duck = ducks[j];
        if (checkBulletHit(bullet, duck)) {
          // Hit! Mark bullet as hit and shoot the duck
          bullet.hit = true;
          shootDuck(j);
          break;
        }
      }
      
      // Update bullet position
      bullet.element.style.left = `${bullet.x}px`;
      bullet.element.style.top = `${bullet.y}px`;
      
      // Remove bullet if it traveled too far or went off-screen
      if (bullet.distanceTraveled >= bullet.maxDistance ||
          bullet.x < -20 || bullet.x > window.innerWidth + 20 ||
          bullet.y < -20 || bullet.y > window.innerHeight + 20) {
        if (bullet.element.parentNode === gameContainer) {
          gameContainer.removeChild(bullet.element);
        }
        bullets.splice(i, 1);
      }
    }
    
    // Update each feather particle
    for (let i = feathers.length - 1; i >= 0; i--) {
      const feather = feathers[i];
      
      // Update movement
      feather.speedY += feather.gravity;
      feather.x += feather.speedX;
      feather.y += feather.speedY;
      feather.opacity -= 0.005; // Slower fade out for longer visible feathers
      
      // More realistic feather falling - add some oscillation
      feather.speedX += Math.sin(Date.now() * 0.001) * 0.05;
      
      // Rotate feather while falling - with more natural tumble
      const rotationAmount = feather.rotationDir * (feather.rotation + Math.sin(Date.now() * 0.002) * 2);
      feather.element.style.transform = `rotate(${parseFloat(feather.element.style.transform.replace(/[^0-9.-]/g, '') || 0) + rotationAmount}deg)`;
      
      // Update position
      feather.element.style.left = `${feather.x}px`;
      feather.element.style.top = `${feather.y}px`;
      feather.element.style.opacity = feather.opacity.toString();
      
      // Remove feather when invisible or off-screen
      if (feather.opacity <= 0 || 
          feather.y > window.innerHeight || 
          feather.x < 0 || 
          feather.x > window.innerWidth) {
        if (feather.element.parentNode === gameContainer) {
          gameContainer.removeChild(feather.element);
        }
        feathers.splice(i, 1);
      }
    }
    
    // Continue game loop only if game is running
    if (isGameRunning) {
      requestAnimationFrame(updateGame);
    }
  }
  
  // Utility: Darken or lighten a color
  function darkenColor(color, percent) {
    // Handle rgb format
    if (color.startsWith('rgb')) {
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        let [, r, g, b] = rgbMatch.map(Number);
        r = Math.max(0, Math.min(255, r + percent * 2.55));
        g = Math.max(0, Math.min(255, g + percent * 2.55));
        b = Math.max(0, Math.min(255, b + percent * 2.55));
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      }
    }
    
    // Handle hex format
    try {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.max(0, Math.min(255, (num >> 16) - amt));
      const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amt));
      const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
      return `rgb(${R}, ${G}, ${B})`;
    } catch (e) {
      return color; // Return original if parsing fails
    }
  }
  
  // Initialize only the sound button first
  function initSoundButton() {
    // Add a sound toggle button that also acts as a game starter
    const soundButton = document.createElement('button');
    soundButton.id = 'duck-hunt-sound-button';
    soundButton.style.position = 'fixed';
    soundButton.style.bottom = '80px'; // Higher position to be more visible
    soundButton.style.right = '20px';
    soundButton.style.backgroundColor = '#e74c3c'; // Red to grab attention
    soundButton.style.color = 'white';
    soundButton.style.border = 'none';
    soundButton.style.borderRadius = '50%';
    soundButton.style.width = '40px'; // Smaller button (was 60px)
    soundButton.style.height = '40px'; // Smaller button (was 60px)
    soundButton.style.fontSize = '16px'; // Smaller font (was 24px)
    soundButton.style.display = 'flex';
    soundButton.style.alignItems = 'center';
    soundButton.style.justifyContent = 'center';
    soundButton.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
    soundButton.style.cursor = 'pointer';
    soundButton.style.zIndex = '10002';
    soundButton.innerHTML = '🔇'; // Start with sound off
    soundButton.title = "Click to Start Duck Hunt Game with Sound";
    
    // Add pulsating animation to draw attention
    const pulsateKeyframes = `
      @keyframes soundButtonPulsate {
        0% { transform: scale(1); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(231, 76, 60, 0.8); }
        100% { transform: scale(1); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
      }
    `;
    const pulsateStyle = document.createElement('style');
    pulsateStyle.textContent = pulsateKeyframes;
    document.head.appendChild(pulsateStyle);
    
    // Add the pulsating animation initially to draw attention
    soundButton.style.animation = 'soundButtonPulsate 1.5s infinite';
    
    // Add text label under the button
    const soundLabel = document.createElement('div');
    soundLabel.style.position = 'fixed';
    soundLabel.style.bottom = '60px';
    soundLabel.style.right = '0px';
    soundLabel.style.width = '100px';
    soundLabel.style.textAlign = 'center';
    soundLabel.style.color = 'white';
    soundLabel.style.fontFamily = 'Arial, sans-serif';
    soundLabel.style.fontSize = '12px';
    soundLabel.style.fontWeight = 'bold';
    soundLabel.style.backgroundColor = 'rgba(0,0,0,0.7)';
    soundLabel.style.padding = '3px';
    soundLabel.style.borderRadius = '4px';
    soundLabel.style.zIndex = '10002';
    soundLabel.textContent = "Start Duck Hunt";
    
    // Toggle sound on/off when clicked
    soundButton.onclick = function() {
      if (!soundEnabled) {
        // First enable - ensure audio elements are created
        if (!soundsCreated) {
          createSoundElements();
        }
        
        soundEnabled = true;
        soundButton.innerHTML = '🔊';
        soundButton.title = "Disable Duck Hunt Sounds";
        soundLabel.textContent = "Sound enabled!";
        soundButton.style.backgroundColor = '#2ecc71'; // Green when enabled
        
        // Stop the pulsating animation once clicked
        soundButton.style.animation = 'none';
        
        // Start the game if not already started
        if (!gameStarted) {
          init();
          // Play game start sound
          setTimeout(() => {
            playSound('gameStart');
          }, 100);
        } else if (!isGameRunning) {
          // Restart the game if it was stopped
          isGameRunning = true;
          requestAnimationFrame(updateGame);
          startDuckSpawning();
          // Play game start sound
          setTimeout(() => {
            playSound('gameStart');
          }, 100);
        } else {
          // Just play the sound if game is already running
          playSound('gameStart');
        }
        
        // Hide the label after 2 seconds
        setTimeout(() => {
          soundLabel.style.display = 'none';
        }, 2000);
      } else {
        // Toggle sound off and stop the game
        soundEnabled = false;
        soundButton.innerHTML = '🔇';
        soundButton.title = "Click to Start Duck Hunt Game with Sound";
        soundLabel.textContent = "Game paused";
        soundLabel.style.display = 'block'; // Show the label
        soundButton.style.backgroundColor = '#e74c3c'; // Red when disabled
        
        // Stop the game
        stopGame();
        
        // Hide the label after 2 seconds
        setTimeout(() => {
          soundLabel.style.display = 'none';
        }, 2000);
      }
    };
    
    document.body.appendChild(soundButton);
    document.body.appendChild(soundLabel);
  }
  
  // Initialize on load - but only create the sound button
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSoundButton);
  } else {
    initSoundButton();
  }

  // Function to stop the game
  function stopGame() {
    // Stop spawning new ducks
    if (duckSpawningInterval) {
      clearInterval(duckSpawningInterval);
      duckSpawningInterval = null;
    }
    
    // Stop the game animation
    isGameRunning = false;
    
    // Remove all existing ducks from the screen
    ducks.forEach(duck => {
      if (duck.element && duck.element.parentNode) {
        duck.element.parentNode.removeChild(duck.element);
      }
    });
    
    // Clear the ducks array
    ducks = [];
    
    // Clear all bullets
    bullets.forEach(bullet => {
      if (bullet.element && bullet.element.parentNode) {
        bullet.element.parentNode.removeChild(bullet.element);
      }
    });
    bullets = [];
    
    // Hide the score display
    const scoreDisplay = document.getElementById('duck-score');
    if (scoreDisplay) {
      scoreDisplay.style.display = 'none';
    }
    
    // Reset score
    score = 0;
  }
})(); 