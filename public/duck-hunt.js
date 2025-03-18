// Duck Hunt Background Game
(function() {
  // Game container
  const gameContainer = document.createElement('div');
  
  // Game state
  let ducks = [];
  let score = 0;
  let ducksCreated = 0;
  const maxDucks = 3; // Reduced maximum number of ducks on screen
  let feathers = []; // Track all feather particles
  
  // Duck properties
  const duckColors = [
    '#8B4513', // Brown
    '#654321', // Dark brown
    '#556B2F', // Dark olive green
    '#006400', // Dark green
    '#2F4F4F'  // Dark slate gray
  ];
  
  const duckSizes = {
    width: 60,
    height: 35
  };
  
  // Sound effects
  const sounds = {
    quack: null,
    shot: null,
    fall: null
  };
  
  // Initialize sounds
  function initSounds() {
    // Create audio elements
    sounds.quack = new Audio();
    sounds.shot = new Audio();
    sounds.fall = new Audio();
    
    // Set sound sources - Base64 encoded small audio files to avoid needing external files
    sounds.quack.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAAAwAAA2YAlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDQAAAAAAAAANmxbuJUwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    sounds.shot.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAAAwAAAyAAlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2trb///////////////////////////////////////////8AAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xjEIAAAA0gAAAAAVEFHM0MuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xjEVwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    sounds.fall.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAABAAAA+gA1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU9PT09PT09PT09PT09PT09PT09PT09PT09JeXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/PzwAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQEQAAAAAAAAAPoSNmTtwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAABsANIAAAAAP7kSAQBH//kQBE/5P5E9P0if/y8+ACw/5c8xP///IgeIP8sT5c/6MP/+SLoB/5N5M/q1f/y5EN//8sXLF///+MYxB4CMg+IAAAAAFy5MPf//IgmGf////JFyAZZ/+QDjP///yJqB4l/5Fnm//kS5Yf//yIF5P//5AuIK///5IP///1aqqqqqqqqTEFN/+MYxCYKycqYAZKQADMuMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    
    // Lower volume
    sounds.quack.volume = 0.2;
    sounds.shot.volume = 0.3;
    sounds.fall.volume = 0.2;
    
    // Preload
    Object.values(sounds).forEach(sound => {
      sound.load();
    });
  }
  
  // Play a sound
  function playSound(soundName) {
    if (!sounds[soundName]) return;
    
    // Clone and play to allow overlapping sounds
    const sound = sounds[soundName].cloneNode();
    sound.volume = sounds[soundName].volume;
    
    // Some browsers require user interaction before playing audio
    const promise = sound.play();
    if (promise !== undefined) {
      promise.catch(e => {
        // Auto-play was prevented, we'll ignore this error
        console.log("Audio playback was prevented by the browser");
      });
    }
  }
  
  // Initialize game
  function init() {
    // Initialize sounds
    initSounds();
    
    // Style game container
    gameContainer.style.position = 'fixed';
    gameContainer.style.top = '0';
    gameContainer.style.left = '0';
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    gameContainer.style.pointerEvents = 'none';
    gameContainer.style.zIndex = '9998'; // Below the ripple effect
    gameContainer.style.overflow = 'hidden';
    
    // Add gun sight cursor
    const gunSight = document.createElement('div');
    gunSight.style.position = 'fixed';
    gunSight.style.width = '20px';
    gunSight.style.height = '20px';
    gunSight.style.borderRadius = '50%';
    gunSight.style.border = '2px solid red';
    gunSight.style.boxShadow = '0 0 5px rgba(255,0,0,0.5)';
    gunSight.style.pointerEvents = 'none';
    gunSight.style.zIndex = '10001';
    gunSight.style.display = 'none';
    document.body.appendChild(gunSight);
    
    // Show gun sight on mousemove when over ducks
    document.addEventListener('mousemove', e => {
      const x = e.clientX;
      const y = e.clientY;
      
      gunSight.style.left = `${x - 10}px`;
      gunSight.style.top = `${y - 10}px`;
      
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
    scoreDisplay.style.background = 'rgba(0, 0, 0, 0.6)';
    scoreDisplay.style.color = '#fff';
    scoreDisplay.style.padding = '5px 10px';
    scoreDisplay.style.borderRadius = '20px';
    scoreDisplay.style.fontSize = '14px';
    scoreDisplay.style.fontFamily = 'Arial, sans-serif';
    scoreDisplay.style.zIndex = '10000';
    scoreDisplay.style.display = 'none'; // Initially hidden
    scoreDisplay.textContent = 'Ducks: 0';
    document.body.appendChild(scoreDisplay);
    
    // Add to document
    document.body.appendChild(gameContainer);
    
    // Start spawning ducks occasionally - less frequently (8-10 seconds)
    setInterval(spawnDuck, 8000 + Math.random() * 2000);
    
    // Start animation loop
    requestAnimationFrame(updateGame);
  }
  
  // Create a new duck
  function spawnDuck() {
    // Limit number of ducks
    if (ducks.length >= maxDucks) return;
    
    // Random duck properties
    const color = duckColors[Math.floor(Math.random() * duckColors.length)];
    const size = {
      width: duckSizes.width + Math.random() * 20,
      height: duckSizes.height + Math.random() * 10
    };
    
    // Determine starting position and direction
    const startFromLeft = Math.random() > 0.5;
    const y = 100 + Math.random() * (window.innerHeight - 300);
    const x = startFromLeft ? -size.width : window.innerWidth;
    const speedX = (startFromLeft ? 1 : -1) * (1.5 + Math.random() * 2); // Slightly slower
    const speedY = Math.sin(Date.now() / 1000) * 0.5; // Slight up/down movement
    
    // Create duck SVG container
    const duck = document.createElement('div');
    duck.className = 'game-duck';
    duck.style.position = 'absolute';
    duck.style.left = `${x}px`;
    duck.style.top = `${y}px`;
    duck.style.width = `${size.width}px`;
    duck.style.height = `${size.height}px`;
    duck.style.transform = startFromLeft ? 'scaleX(1)' : 'scaleX(-1)';
    duck.style.transition = 'transform 0.1s';
    duck.style.zIndex = '9999';
    duck.style.pointerEvents = 'auto'; // Make clickable
    duck.style.cursor = 'crosshair';
    
    // Create duck body
    const body = document.createElement('div');
    body.style.position = 'absolute';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.backgroundColor = color;
    body.style.borderRadius = '60% 60% 40% 40% / 60% 60% 40% 40%';
    duck.appendChild(body);
    
    // Create duck head
    const head = document.createElement('div');
    head.style.position = 'absolute';
    head.style.width = `${size.width * 0.4}px`;
    head.style.height = `${size.width * 0.4}px`;
    head.style.backgroundColor = darkenColor(color, -10); // Slightly lighter
    head.style.borderRadius = '50%';
    head.style.left = startFromLeft ? '80%' : '-20%';
    head.style.top = '-20%';
    head.style.zIndex = '2';
    duck.appendChild(head);
    
    // Create duck eye
    const eye = document.createElement('div');
    eye.style.position = 'absolute';
    eye.style.width = '5px';
    eye.style.height = '5px';
    eye.style.backgroundColor = '#000';
    eye.style.borderRadius = '50%';
    eye.style.top = '30%';
    eye.style.left = startFromLeft ? '30%' : '60%';
    eye.style.zIndex = '3';
    head.appendChild(eye);
    
    // Create duck beak
    const beak = document.createElement('div');
    beak.style.position = 'absolute';
    beak.style.width = '0';
    beak.style.height = '0';
    beak.style.borderLeft = startFromLeft ? '12px solid transparent' : '0';
    beak.style.borderRight = startFromLeft ? '0' : '12px solid transparent';
    beak.style.borderTop = '8px solid #FF8C00'; // Orange beak
    beak.style.top = '60%';
    beak.style.left = startFromLeft ? '75%' : '15%';
    beak.style.zIndex = '3';
    head.appendChild(beak);
    
    // Create duck tail
    const tail = document.createElement('div');
    tail.style.position = 'absolute';
    tail.style.width = `${size.width * 0.3}px`;
    tail.style.height = `${size.height * 0.6}px`;
    tail.style.backgroundColor = darkenColor(color, 15);
    tail.style.borderRadius = '30% 30% 50% 50%';
    tail.style.top = '20%';
    tail.style.left = startFromLeft ? '0%' : '70%';
    tail.style.zIndex = '1';
    duck.appendChild(tail);
    
    // Create duck top wing
    const topWing = document.createElement('div');
    topWing.style.position = 'absolute';
    topWing.style.width = `${size.width * 0.6}px`;
    topWing.style.height = `${size.height * 0.5}px`;
    topWing.style.backgroundColor = darkenColor(color, 20);
    topWing.style.borderRadius = '60% 60% 30% 30% / 60% 60% 40% 40%';
    topWing.style.top = '5%';
    topWing.style.left = '20%';
    topWing.style.transformOrigin = 'top center';
    topWing.style.animation = `flapWings ${0.2 + Math.random() * 0.3}s infinite alternate`;
    topWing.style.zIndex = '4';
    duck.appendChild(topWing);
    
    // Create duck bottom wing
    const bottomWing = document.createElement('div');
    bottomWing.style.position = 'absolute';
    bottomWing.style.width = `${size.width * 0.5}px`;
    bottomWing.style.height = `${size.height * 0.4}px`;
    bottomWing.style.backgroundColor = darkenColor(color, 25);
    bottomWing.style.borderRadius = '60% 60% 30% 30% / 60% 60% 40% 40%';
    bottomWing.style.top = '30%';
    bottomWing.style.left = '25%';
    bottomWing.style.transformOrigin = 'top center';
    bottomWing.style.animation = `flapWingsDelayed ${0.2 + Math.random() * 0.3}s infinite alternate`;
    bottomWing.style.zIndex = '3';
    duck.appendChild(bottomWing);
    
    // Add flapping animation
    const keyframes = `
      @keyframes flapWings {
        0% { transform: rotate(-15deg); }
        100% { transform: rotate(15deg); }
      }
      @keyframes flapWingsDelayed {
        0% { transform: rotate(-10deg); }
        100% { transform: rotate(20deg); }
      }
    `;
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    // Add click handler to shoot duck
    duck.addEventListener('click', (e) => {
      e.stopPropagation();
      shootDuck(duck);
      
      // Show score when first duck is shot
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
      size,
      startFromLeft,
      shot: false,
      fallSpeed: 0,
      rotationSpeed: 0,
      quackTimer: 0
    };
    
    // Occasionally quack
    duckData.quackTimer = Math.random() * 5000;
    
    // Add to game
    gameContainer.appendChild(duck);
    ducks.push(duckData);
    ducksCreated++;
  }
  
  // Shoot a duck
  function shootDuck(duckElement) {
    const duckIndex = ducks.findIndex(duck => duck.element === duckElement);
    if (duckIndex === -1 || ducks[duckIndex].shot) return;
    
    const duck = ducks[duckIndex];
    duck.shot = true;
    duck.fallSpeed = 2 + Math.random() * 3;
    duck.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 10);
    
    // Darken all child elements
    Array.from(duck.element.querySelectorAll('div')).forEach(el => {
      if (el.style.backgroundColor) {
        el.style.backgroundColor = darkenColor(el.style.backgroundColor, 40);
      }
    });
    
    // Create feather particles
    createFeathers(duck.x, duck.y, 10);
    
    // Update score
    score++;
    updateScore();
    
    // Play sound effects
    playSound('shot');
    setTimeout(() => {
      playSound('fall');
    }, 300);
  }
  
  // Create feather particles when duck is shot
  function createFeathers(x, y, count) {
    const featherColors = ['#F8F8FF', '#FFFAFA', '#F5F5F5', '#FFF5EE', '#FFFAF0'];
    
    for (let i = 0; i < count; i++) {
      const feather = document.createElement('div');
      feather.className = 'feather-particle';
      feather.style.position = 'absolute';
      feather.style.left = `${x + Math.random() * 50}px`;
      feather.style.top = `${y + Math.random() * 30}px`;
      feather.style.width = '6px';
      feather.style.height = '10px';
      feather.style.backgroundColor = featherColors[Math.floor(Math.random() * featherColors.length)];
      feather.style.borderRadius = '50% 50% 25% 25% / 60% 60% 40% 40%';
      feather.style.opacity = '0.8';
      feather.style.pointerEvents = 'none';
      feather.style.zIndex = '9997';
      feather.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      // Set random movement
      const speedX = Math.random() * 6 - 3;
      const speedY = -2 - Math.random() * 2;
      
      // Track feather data
      const featherData = {
        element: feather,
        x: parseFloat(feather.style.left),
        y: parseFloat(feather.style.top),
        speedX,
        speedY,
        opacity: 0.8,
        gravity: 0.1,
        rotation: Math.random() * 5 - 2.5
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
        duck.fallSpeed += 0.1;
        duck.y += duck.fallSpeed;
        duck.element.style.transform = `rotate(${duck.rotationSpeed}deg)`;
        
        // Remove duck when it falls off-screen
        if (duck.y > window.innerHeight) {
          gameContainer.removeChild(duck.element);
          ducks.splice(i, 1);
        }
      } else {
        // Update flying duck
        duck.x += duck.speedX;
        duck.y += duck.speedY;
        
        // Occasional quacking
        duck.quackTimer -= 16; // approximately 16ms per frame
        if (duck.quackTimer <= 0) {
          playSound('quack');
          duck.quackTimer = 6000 + Math.random() * 5000; // Less frequent quacking
        }
        
        // Remove duck if it flies off-screen
        if ((duck.speedX > 0 && duck.x > window.innerWidth + 100) || 
            (duck.speedX < 0 && duck.x < -duck.size.width - 100)) {
          gameContainer.removeChild(duck.element);
          ducks.splice(i, 1);
          continue;
        }
      }
      
      // Update duck position
      duck.element.style.left = `${duck.x}px`;
      duck.element.style.top = `${duck.y}px`;
    }
    
    // Update each feather particle
    for (let i = feathers.length - 1; i >= 0; i--) {
      const feather = feathers[i];
      
      // Update movement
      feather.speedY += feather.gravity;
      feather.x += feather.speedX;
      feather.y += feather.speedY;
      feather.opacity -= 0.01;
      
      // Rotate feather while falling
      const currentRotation = parseFloat(feather.element.style.transform.replace(/[^0-9.]/g, '')) || 0;
      feather.element.style.transform = `rotate(${currentRotation + feather.rotation}deg)`;
      
      // Update position
      feather.element.style.left = `${feather.x}px`;
      feather.element.style.top = `${feather.y}px`;
      feather.element.style.opacity = feather.opacity.toString();
      
      // Remove feather when invisible or off-screen
      if (feather.opacity <= 0 || 
          feather.y > window.innerHeight || 
          feather.x < 0 || 
          feather.x > window.innerWidth) {
        gameContainer.removeChild(feather.element);
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
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) - amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
    return `rgb(${R}, ${G}, ${B})`;
  }
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 