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
      console.log('Playing sound:', soundName, 'using Web Audio API');
      
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
          console.error('Unknown sound:', soundName);
      }
    } catch (error) {
      console.error('Failed to play sound:', soundName, error);
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
    // Style game container
    gameContainer.style.position = 'fixed';
    gameContainer.style.top = '0';
    gameContainer.style.left = '0';
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    gameContainer.style.pointerEvents = 'none';
    gameContainer.style.zIndex = '9998'; // Below the ripple effect
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
      console.log('Attempting to unlock audio...');
      
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
      
      console.log('Audio unlock attempt complete');
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
        console.log('Duck hunt debug mode:', debugMode ? 'ON' : 'OFF');
        
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
    scoreDisplay.style.top = '10px';
    scoreDisplay.style.right = '20px';
    scoreDisplay.style.background = 'rgba(0, 0, 0, 0.7)';
    scoreDisplay.style.color = '#fff';
    scoreDisplay.style.padding = '8px 12px';
    scoreDisplay.style.borderRadius = '20px';
    scoreDisplay.style.fontSize = '16px';
    scoreDisplay.style.fontFamily = 'Arial, sans-serif';
    scoreDisplay.style.fontWeight = 'bold';
    scoreDisplay.style.zIndex = '10000';
    scoreDisplay.style.display = 'none'; // Initially hidden
    scoreDisplay.textContent = 'Ducks: 0';
    document.body.appendChild(scoreDisplay);
    
    // Add to document
    document.body.appendChild(gameContainer);
    
    // Start spawning ducks occasionally - less frequently (8-12 seconds)
    setInterval(spawnDuck, 8000 + Math.random() * 4000);
    
    // Start animation loop
    requestAnimationFrame(updateGame);
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
    
    // Determine starting position and direction
    const startFromLeft = Math.random() > 0.5;
    const y = 100 + Math.random() * (window.innerHeight - 300);
    const x = startFromLeft ? -size.width : window.innerWidth;
    const speedX = (startFromLeft ? 1 : -1) * (1.5 + Math.random() * 2);
    
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
    
    // Create pixelated duck body (main rectangle)
    const body = document.createElement('div');
    body.className = 'pixel-art';
    body.style.position = 'absolute';
    body.style.width = '100%';
    body.style.height = '75%';
    body.style.top = '20%';
    body.style.backgroundColor = species.bodyColor;
    body.style.borderRadius = '0'; // Sharp corners for pixel look
    duck.appendChild(body);
    
    // Create pixelated duck head (square)
    const head = document.createElement('div');
    head.className = 'pixel-art';
    head.style.position = 'absolute';
    head.style.width = '40%';
    head.style.height = '40%';
    head.style.backgroundColor = species.headColor;
    head.style.borderRadius = '0'; // Sharp corners for pixel look
    head.style.left = startFromLeft ? '60%' : '0%';
    head.style.top = '0%';
    head.style.zIndex = '2';
    duck.appendChild(head);
    
    // Create duck beak (small rectangle)
    const beak = document.createElement('div');
    beak.className = 'pixel-art';
    beak.style.position = 'absolute';
    beak.style.width = '20%';
    beak.style.height = '20%';
    beak.style.backgroundColor = species.beakColor;
    beak.style.borderRadius = '0'; // Sharp corners
    beak.style.top = '15%';
    beak.style.left = startFromLeft ? '85%' : '-5%';
    beak.style.zIndex = '3';
    duck.appendChild(beak);
    
    // Create duck eye (single pixel)
    const eye = document.createElement('div');
    eye.className = 'pixel-art';
    eye.style.position = 'absolute';
    eye.style.width = '10%';
    eye.style.height = '10%';
    eye.style.backgroundColor = '#FFFFFF'; // White eye
    eye.style.borderRadius = '0';
    eye.style.top = '10%';
    eye.style.left = startFromLeft ? '70%' : '15%';
    eye.style.zIndex = '3';
    duck.appendChild(eye);
    
    // Create wing (rectangular)
    const wing = document.createElement('div');
    wing.className = 'pixel-art';
    wing.style.position = 'absolute';
    wing.style.width = '40%';
    wing.style.height = '20%';
    wing.style.backgroundColor = species.wingColor;
    wing.style.borderRadius = '0';
    wing.style.top = '30%';
    wing.style.left = '30%';
    wing.style.transformOrigin = 'center';
    // Wing flapping animation based on old-school animation principles
    wing.style.animation = `pixelFlapWings ${0.2 + Math.random() * 0.1}s infinite steps(2)`;
    wing.style.zIndex = '4';
    duck.appendChild(wing);
    
    // Create accent pixels (white highlights characteristic of pixel art)
    const accent1 = document.createElement('div');
    accent1.className = 'pixel-art accent';
    accent1.style.position = 'absolute';
    accent1.style.width = '10%';
    accent1.style.height = '10%';
    accent1.style.backgroundColor = species.accentColor;
    accent1.style.borderRadius = '0';
    accent1.style.top = '70%';
    accent1.style.left = startFromLeft ? '10%' : '80%';
    accent1.style.zIndex = '5';
    duck.appendChild(accent1);
    
    const accent2 = document.createElement('div');
    accent2.className = 'pixel-art accent';
    accent2.style.position = 'absolute';
    accent2.style.width = '10%';
    accent2.style.height = '10%';
    accent2.style.backgroundColor = species.accentColor;
    accent2.style.borderRadius = '0';
    accent2.style.top = '60%';
    accent2.style.left = startFromLeft ? '20%' : '70%';
    accent2.style.zIndex = '5';
    duck.appendChild(accent2);
    
    // Add flapping animation
    const keyframes = `
      @keyframes pixelFlapWings {
        0% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
        100% { transform: translateY(0); }
      }
      @keyframes pixelFlapWingsDelayed {
        0% { transform: translateY(0); }
        50% { transform: translateY(3px); }
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
    // Update each duck
    for (let i = ducks.length - 1; i >= 0; i--) {
      const duck = ducks[i];
      
      if (duck.shot) {
        // Update shot duck (falling)
        duck.fallSpeed += 0.15;
        duck.y += duck.fallSpeed;
        // For pixel art look, round rotation to increments of 45 degrees (8-directional)
        const rotation = Math.round(duck.rotationSpeed / 45) * 45;
        duck.element.style.transform = `rotate(${rotation}deg)`;
        
        // Remove duck when it falls off-screen
        if (duck.y > window.innerHeight) {
          gameContainer.removeChild(duck.element);
          ducks.splice(i, 1);
        }
      } else {
        // Update flying duck - round to whole pixels for pixel perfect movement
        duck.x += duck.speedX;
        duck.time += 0.016; // Approximately 16ms per frame
        
        // Wave motion (simplified for pixel art style)
        const waveOffset = Math.round(Math.sin(duck.time * duck.waveFrequency * 10) * duck.waveAmplitude);
        duck.y = Math.floor(duck.startY + waveOffset);
        
        // Occasional quacking
        duck.quackTimer -= 16;
        if (soundEnabled && duck.quackTimer <= 0) {
          playSound('quack');
          duck.quackTimer = 5000 + Math.random() * 8000; // Even less frequent quacking
        }
        
        // Remove duck if it flies off-screen
        if ((duck.speedX > 0 && duck.x > window.innerWidth + 100) || 
            (duck.speedX < 0 && duck.x < -duck.size.width - 100)) {
          gameContainer.removeChild(duck.element);
          ducks.splice(i, 1);
          continue;
        }
      }
      
      // Update duck position - use Math.round for pixel-perfect positioning
      duck.element.style.left = `${Math.round(duck.x)}px`;
      duck.element.style.top = `${Math.round(duck.y)}px`;
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
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 