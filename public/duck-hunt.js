// Duck Hunt Background Game
(function() {
  // Game container
  const gameContainer = document.createElement('div');
  
  // Game state
  let ducks = [];
  let score = 0;
  let ducksCreated = 0;
  const maxDucks = 3; // Maximum number of ducks on screen
  let feathers = []; // Track all feather particles
  let soundEnabled = false; // Track if sounds are enabled
  let soundsCreated = false; // Track if sounds are created
  
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
      accentColor: '#FFFFFF' // White accent
    },
    {
      // Red duck (classic alternate duck)
      bodyColor: '#CC0000', // Red body
      headColor: '#CC0000', // Red head
      beakColor: '#FF6600', // Orange beak
      wingColor: '#CC0000', // Red wings
      accentColor: '#FFFFFF' // White accent
    },
    {
      // Blue duck (NES color palette inspired)
      bodyColor: '#0000CC', // Blue body
      headColor: '#0000CC', // Blue head
      beakColor: '#FF6600', // Orange beak
      wingColor: '#0000CC', // Blue wings
      accentColor: '#FFFFFF' // White accent
    }
  ];
  
  const duckSizes = {
    width: 48,  // More pixel-proportioned size
    height: 40
  };
  
  // Add throttling/debouncing utility functions at the top
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Create audio elements lazily
  let audioElements = null;
  let audioContext = null;
  let audioInitialized = false;

  function createSoundElements() {
    if (audioElements) return audioElements;
    
    audioElements = {
      shot: document.createElement('audio'),
      quack: document.createElement('audio'),
      fall: document.createElement('audio'),
      gameStart: document.createElement('audio'),
      dogLaugh: document.createElement('audio')
    };

    // Set sources lazily
    return audioElements;
  }

  // Lazy initialize audio context
  function getAudioContext() {
    if (!audioContext && window.AudioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // Optimize audio playback
  function playSound(soundName) {
    // Skip audio on low-end devices or if disabled
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    
    if (!audioInitialized) {
      initAudio();
      audioInitialized = true;
    }

    const elements = createSoundElements();
    const soundElement = elements[soundName];

    if (!soundElement || !soundElement.src) {
      setSoundSource(soundName);
    }

    // Only try to play if the element exists and has a source
    if (soundElement && soundElement.src) {
      // Reset the audio to the beginning if it's already playing
      soundElement.currentTime = 0;
      
      // Use a Promise to handle play() failures gracefully
      const playPromise = soundElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // Auto-play was prevented, we'll just silently fail
          console.log('Audio playback was prevented by the browser');
        });
      }
    }
  }

  // Lazy initialization of audio sources
  function setSoundSource(soundName) {
    const elements = createSoundElements();
    const soundElement = elements[soundName];
    
    if (!soundElement) return;
    
    // Set source based on sound name
    switch (soundName) {
      case 'shot':
        soundElement.src = 'https://www.myinstants.com/media/sounds/shotgun.mp3';
        break;
      case 'quack':
        soundElement.src = 'https://www.myinstants.com/media/sounds/duck-quack.mp3';
        break;
      case 'fall':
        soundElement.src = 'https://www.myinstants.com/media/sounds/fall.mp3';
        break;
      case 'gameStart':
        soundElement.src = 'https://www.myinstants.com/media/sounds/duck-hunt-intro.mp3';
        break;
      case 'dogLaugh':
        soundElement.src = 'https://www.myinstants.com/media/sounds/dog-laugh.mp3';
        break;
    }
    
    // Set common properties
    soundElement.preload = 'none'; // Don't preload until needed
    soundElement.volume = 0.3;
  }

  // Initialize audio only when needed
  function initAudio() {
    const elements = createSoundElements();
    Object.keys(elements).forEach(key => {
      setSoundSource(key);
    });
  }

  // Initialize game
  function init() {
    // Style game container
    gameContainer.style.position = 'fixed';
    gameContainer.style.top = '0';
    gameContainer.style.left = '0';
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    gameContainer.style.pointerEvents = 'none';
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
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    
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
    
    // Add a sound toggle button
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
    soundButton.title = "Enable Duck Hunt Sounds";
    
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
    soundLabel.textContent = "Click for sound";
    
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
        
        // Play game start sound
        setTimeout(() => {
          playSound('gameStart');
        }, 100);
        
        // Hide the label after 2 seconds
        setTimeout(() => {
          soundLabel.style.display = 'none';
        }, 2000);
      } else {
        // Toggle sound off
        soundEnabled = false;
        soundButton.innerHTML = '🔇';
        soundButton.title = "Enable Duck Hunt Sounds";
        soundLabel.textContent = "Sound disabled";
        soundButton.style.backgroundColor = '#e74c3c'; // Red when disabled
        
        // Hide the label after 2 seconds
        setTimeout(() => {
          soundLabel.style.display = 'none';
        }, 2000);
      }
    };
    
    document.body.appendChild(soundButton);
    document.body.appendChild(soundLabel);
    
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
    
    // Start spawning ducks occasionally - less frequently (8-12 seconds)
    setInterval(spawnDuck, 8000 + Math.random() * 4000);
    
    // Start animation loop
    requestAnimationFrame(updateGame);

    // Throttle window resize event
    const throttledResize = throttle(handleResize, 150);
    window.addEventListener('resize', throttledResize);

    // Debounce mobile layout changes
    const debouncedMobileLayout = debounce(handleMobileLayout, 200);
    window.addEventListener('resize', debouncedMobileLayout);
  }
  
  // Create a new duck
  function spawnDuck() {
    // Limit number of ducks
    if (ducks.length >= maxDucks) return;
    
    // Choose a random duck species
    const species = duckSpecies[Math.floor(Math.random() * duckSpecies.length)];
    
    // Size with slight variation
    const size = {
      width: duckSizes.width + Math.random() * 20,
      height: duckSizes.height + Math.random() * 10
    };
    
    // New spawn positioning - random locations and directions
    const spawnMode = Math.floor(Math.random() * 10); // Weight probabilities
    let x, y, speedX, speedY, startFromLeft;
    
    // Mostly spawn from sides to ensure ducks cross the screen (60% chance)
    if (spawnMode < 3) { // Left side - 30% chance
      x = -size.width;
      y = 100 + Math.random() * (window.innerHeight - 300);
      speedX = 3 + Math.random() * 3; // Faster horizontal speed
      speedY = (Math.random() - 0.5) * 1; // Reduced vertical component
      startFromLeft = true;
    } 
    else if (spawnMode < 6) { // Right side - 30% chance
      x = window.innerWidth;
      y = 100 + Math.random() * (window.innerHeight - 300);
      speedX = -(3 + Math.random() * 3); // Faster horizontal speed
      speedY = (Math.random() - 0.5) * 1; // Reduced vertical component
      startFromLeft = false;
    }
    else if (spawnMode < 8) { // Bottom (flying up) - 20% chance
      x = Math.random() * (window.innerWidth - size.width);
      y = window.innerHeight;
      speedX = (Math.random() - 0.5) * 2; // Reduced horizontal direction
      speedY = -(3 + Math.random() * 2); // Stronger upward movement
      startFromLeft = speedX >= 0; // Face direction of movement
    }
    else { // Random position on screen - 20% chance
      x = 50 + Math.random() * (window.innerWidth - size.width - 100);
      y = Math.max(50, window.innerHeight - 200);
      // Move in clear direction (mostly upward)
      speedX = (Math.random() - 0.5) * 4; // Stronger horizontal component
      speedY = -(2 + Math.random() * 3); // Ensure upward movement
      startFromLeft = speedX >= 0;
    }
    
    // Add slight wave motion
    const waveAmplitude = Math.random() * 1.5 + 0.5; // Random amplitude between 0.5 and 2
    const waveFrequency = Math.random() * 0.01 + 0.005; // Random frequency
    
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
    
    // Add click handler to shoot duck
    duck.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Shoot the duck
      shootDuck(duck);
      
      // Show score when first duck is shot
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
  
  // Shoot a duck
  function shootDuck(duckElement) {
    const duckIndex = ducks.findIndex(duck => duck.element === duckElement);
    if (duckIndex === -1 || ducks[duckIndex].shot) return;
    
    const duck = ducks[duckIndex];
    duck.shot = true;
    duck.fallSpeed = 2 + Math.random() * 3;
    duck.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 10);
    
    // Change color to white when hit (like in original Duck Hunt)
    Array.from(duck.element.querySelectorAll('div')).forEach(el => {
      el.style.backgroundColor = '#FFFFFF';
    });
    
    // Create pixel feather particles
    createFeathers(duck.x, duck.y, 8); // Fewer but more noticeable pixels
    
    // Update score
    score++;
    updateScore();
    
    // Play sound effects if enabled
    if (soundEnabled) {
      // Play shot sound
      playSound('shot');
      
      // Play fall sound after a short delay
      setTimeout(() => {
        playSound('fall');
      }, 300);
      
      // Rarely play dog laugh when duck is shot (25% chance)
      if (Math.random() < 0.25) {
        setTimeout(() => {
          playSound('dogLaugh');
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
      scoreDisplay.textContent = `Ducks: ${score}`;
    }
  }
  
  // Game loop
  function updateGame() {
    // Skip update work if tab is not visible
    if (document.hidden) return;
    
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
        // Only small chance to change direction randomly for more unpredictable movement
        if (Math.random() < 0.0005) { // Reduced to make it more rare
          duck.speedX *= -1;
          duck.element.style.transform = duck.speedX > 0 ? 'scaleX(1)' : 'scaleX(-1)';
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
    
    // Continue game loop
    requestAnimationFrame(updateGame);
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
  
  // Use the throttled/debounced versions of handlers for events that fire frequently
  function handleResize() {
    // ... existing resize code ...
  }

  // Debounce mobile layout changes
  function handleMobileLayout(e) {
    // ... existing mobile layout code ...
  }
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 