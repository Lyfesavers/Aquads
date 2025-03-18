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
  
  // Duck species (more realistic colors)
  const duckSpecies = [
    {
      // Mallard (male)
      bodyColor: '#265C4B', // Dark green
      headColor: '#265C4B', // Matching green head
      neckColor: '#FFFFFF', // White neck ring
      beakColor: '#F3DE2C', // Yellow beak
      wingColor: '#23435C', // Blue speculum (wing patch)
      chestColor: '#7E5835' // Brown chest
    },
    {
      // Wood Duck (male)
      bodyColor: '#4F5885', // Blue-gray
      headColor: '#2E4045', // Dark glossy green
      neckColor: '#FFFFFF', // White marking
      beakColor: '#D64550', // Red and yellow
      wingColor: '#5F6062', // Gray with white patch
      chestColor: '#8E3B46' // Chestnut brown
    },
    {
      // Mandarin Duck
      bodyColor: '#5F7470', // Olive gray
      headColor: '#7F557D', // Purple-ish
      neckColor: '#F3DE2C', // Yellow/white
      beakColor: '#F3722C', // Orange
      wingColor: '#235789', // Blue
      chestColor: '#C75146' // Copper/rust
    }
  ];
  
  const duckSizes = {
    width: 70,  // Slightly larger
    height: 40
  };
  
  // Sound effects (improved authentic Duck Hunt sounds)
  const sounds = {
    quack: null,
    shot: null,
    fall: null,
    gameStart: null,
    dogLaugh: null
  };
  
  // Initialize sounds with better authentic Duck Hunt-like sounds
  function initSounds() {
    // Create audio elements
    sounds.quack = new Audio();
    sounds.shot = new Audio();
    sounds.fall = new Audio();
    sounds.gameStart = new Audio();
    sounds.dogLaugh = new Audio();
    
    // NES-style Duck Hunt quack (base64 encoded small audio)
    sounds.quack.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAAAwAAA2YAlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDQAAAAAAAAANmxbuJUwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    
    // Classic gunshot sound
    sounds.shot.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAAAwAAAyAAlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2trb///////////////////////////////////////////8AAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xjEIAAAA0gAAAAAVEFHM0MuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xjEVwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    
    // Duck falling sound
    sounds.fall.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAABAAAA+gA1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU9PT09PT09PT09PT09PT09PT09PT09PT09JeXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/PzwAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQEQAAAAAAAAAPoSNmTtwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAABsANIAAAAAP7kSAQBH//kQBE/5P5E9P0if/y8+ACw/5c8xP///IgeIP8sT5c/6MP/+SLoB/5N5M/q1f/y5EN//8sXLF///+MYxB4CMg+IAAAAAFy5MPf//IgmGf////JFyAZZ/+QDjP///yJqB4l/5Fnm//kS5Yf//yIF5P//5AuIK///5IP///1aqqqqqqqqTEFN/+MYxCYKycqYAZKQADMuMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    
    // Duck Hunt start round sound
    sounds.gameStart.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAAAgAAAaQAYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgpqamqqqqqampqampqampqampqampqampqampqampqampqampqampqampqampqf/////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDgAAAAAAAAAGkx+wSdQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxMwN0ZpAAEuAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    
    // Duck Hunt dog laugh sound
    sounds.dogLaugh.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+NAwAAAAAAAAAAAAFhpbmcAAAAPAAAABAAABLgAlpaWlpaWlpaWlpaWlpaWlpaWlpaWw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD09PT09PT09PT09PT09PT09PT09PT09PT4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PjAAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAJAOAAAAAAAAAAuC5V8xgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/jGMQAAAAAAAAAAABMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/+MYxMIN4AIkAH6qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
    
    // Set volume levels
    sounds.quack.volume = 0.25;
    sounds.shot.volume = 0.35;
    sounds.fall.volume = 0.3;
    sounds.gameStart.volume = 0.2;
    sounds.dogLaugh.volume = 0.3;
    
    // Preload sounds
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
    
    // Play game start sound on first user interaction
    const handleFirstInteraction = () => {
      playSound('gameStart');
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    
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
    
    // Create duck body (more oval shaped)
    const body = document.createElement('div');
    body.style.position = 'absolute';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.backgroundColor = species.bodyColor;
    body.style.borderRadius = '65% 35% 45% 55% / 60% 40% 60% 40%'; // More realistic oval shape
    duck.appendChild(body);
    
    // Create duck chest (add detail and shading)
    const chest = document.createElement('div');
    chest.style.position = 'absolute';
    chest.style.width = '60%';
    chest.style.height = '60%';
    chest.style.bottom = '5%';
    chest.style.left = '20%';
    chest.style.backgroundColor = species.chestColor;
    chest.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
    chest.style.zIndex = '1';
    body.appendChild(chest);
    
    // Create duck head
    const head = document.createElement('div');
    head.style.position = 'absolute';
    head.style.width = `${size.width * 0.35}px`;
    head.style.height = `${size.width * 0.35}px`;
    head.style.backgroundColor = species.headColor;
    head.style.borderRadius = '50%';
    head.style.left = startFromLeft ? '85%' : '-20%';
    head.style.top = '-15%';
    head.style.zIndex = '2';
    duck.appendChild(head);
    
    // Create neck ring (for mallard)
    if (species.neckColor) {
      const neckRing = document.createElement('div');
      neckRing.style.position = 'absolute';
      neckRing.style.width = '30%';
      neckRing.style.height = '15%';
      neckRing.style.backgroundColor = species.neckColor;
      neckRing.style.borderRadius = '50%';
      neckRing.style.bottom = '0';
      neckRing.style.left = startFromLeft ? '40%' : '30%';
      neckRing.style.zIndex = '2';
      head.appendChild(neckRing);
    }
    
    // Create duck eye
    const eye = document.createElement('div');
    eye.style.position = 'absolute';
    eye.style.width = '15%';
    eye.style.height = '15%';
    eye.style.backgroundColor = '#000';
    eye.style.borderRadius = '50%';
    eye.style.top = '30%';
    eye.style.left = startFromLeft ? '30%' : '60%';
    eye.style.zIndex = '3';
    head.appendChild(eye);
    
    // Add eye highlight
    const eyeHighlight = document.createElement('div');
    eyeHighlight.style.position = 'absolute';
    eyeHighlight.style.width = '30%';
    eyeHighlight.style.height = '30%';
    eyeHighlight.style.backgroundColor = '#fff';
    eyeHighlight.style.borderRadius = '50%';
    eyeHighlight.style.top = '20%';
    eyeHighlight.style.left = '20%';
    eye.appendChild(eyeHighlight);
    
    // Create duck beak
    const beak = document.createElement('div');
    beak.style.position = 'absolute';
    beak.style.width = '50%';
    beak.style.height = '30%';
    beak.style.backgroundColor = species.beakColor;
    beak.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
    beak.style.top = '60%';
    beak.style.left = startFromLeft ? '75%' : '-20%';
    beak.style.zIndex = '3';
    head.appendChild(beak);
    
    // Create duck tail
    const tail = document.createElement('div');
    tail.style.position = 'absolute';
    tail.style.width = `${size.width * 0.25}px`;
    tail.style.height = `${size.height * 0.5}px`;
    tail.style.backgroundColor = species.bodyColor;
    tail.style.borderRadius = '30% 70% 70% 30% / 30% 30% 70% 70%';
    tail.style.top = '20%';
    tail.style.left = startFromLeft ? '0%' : '75%';
    tail.style.zIndex = '1';
    tail.style.transform = 'rotate(20deg)';
    duck.appendChild(tail);
    
    // Create duck top wing with speculum (colored wing patch)
    const topWing = document.createElement('div');
    topWing.style.position = 'absolute';
    topWing.style.width = `${size.width * 0.65}px`;
    topWing.style.height = `${size.height * 0.5}px`;
    topWing.style.backgroundColor = species.bodyColor;
    topWing.style.borderRadius = '60% 40% 40% 60% / 70% 30% 70% 30%';
    topWing.style.top = '5%';
    topWing.style.left = '15%';
    topWing.style.transformOrigin = 'top center';
    topWing.style.animation = `flapWings ${0.15 + Math.random() * 0.2}s infinite alternate`;
    topWing.style.zIndex = '4';
    duck.appendChild(topWing);
    
    // Add wing speculum (the colorful patch)
    const speculum = document.createElement('div');
    speculum.style.position = 'absolute';
    speculum.style.width = '70%';
    speculum.style.height = '40%';
    speculum.style.bottom = '0';
    speculum.style.right = '0';
    speculum.style.backgroundColor = species.wingColor; // Blue/colored patch
    speculum.style.borderRadius = '60% 40% 40% 60% / 70% 30% 70% 30%';
    topWing.appendChild(speculum);
    
    // Create duck bottom wing
    const bottomWing = document.createElement('div');
    bottomWing.style.position = 'absolute';
    bottomWing.style.width = `${size.width * 0.5}px`;
    bottomWing.style.height = `${size.height * 0.4}px`;
    bottomWing.style.backgroundColor = darkenColor(species.bodyColor, 15);
    bottomWing.style.borderRadius = '60% 40% 50% 50% / 60% 40% 60% 40%';
    bottomWing.style.top = '35%';
    bottomWing.style.left = '20%';
    bottomWing.style.transformOrigin = 'top center';
    bottomWing.style.animation = `flapWingsDelayed ${0.2 + Math.random() * 0.15}s infinite alternate`;
    bottomWing.style.zIndex = '3';
    duck.appendChild(bottomWing);
    
    // Add feather details to wings with subtle texture
    for (let i = 0; i < 3; i++) {
      const featherLine = document.createElement('div');
      featherLine.style.position = 'absolute';
      featherLine.style.width = '90%';
      featherLine.style.height = '1px';
      featherLine.style.backgroundColor = darkenColor(species.bodyColor, 30);
      featherLine.style.top = `${25 + i * 20}%`;
      featherLine.style.left = '5%';
      topWing.appendChild(featherLine);
    }
    
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
    if (Math.random() < 0.4) {
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
    
    // Darken all child elements to show it's been hit
    Array.from(duck.element.querySelectorAll('div')).forEach(el => {
      if (el.style.backgroundColor) {
        el.style.backgroundColor = darkenColor(el.style.backgroundColor, 40);
      }
    });
    
    // Create feather particles
    createFeathers(duck.x, duck.y, 15);
    
    // Update score
    score++;
    updateScore();
    
    // Play sound effects
    playSound('shot');
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
  
  // Create feather particles when duck is shot
  function createFeathers(x, y, count) {
    // More realistic feather colors based on common duck feather colors
    const featherColors = [
      '#A7ADBA', // Light gray
      '#E3E1D4', // Off-white
      '#6A4928', // Brown
      '#4F5D75', // Blue-gray
      '#F0EDE5'  // White
    ];
    
    for (let i = 0; i < count; i++) {
      // Create a more feather-like shape
      const feather = document.createElement('div');
      feather.className = 'feather-particle';
      feather.style.position = 'absolute';
      feather.style.left = `${x + Math.random() * 50}px`;
      feather.style.top = `${y + Math.random() * 30}px`;
      feather.style.width = '4px';
      feather.style.height = '12px';
      feather.style.backgroundColor = featherColors[Math.floor(Math.random() * featherColors.length)];
      
      // More realistic feather shape
      feather.style.borderRadius = '50% 50% 20% 20% / 40% 40% 60% 60%';
      
      // Add stem to feather
      const stem = document.createElement('div');
      stem.style.position = 'absolute';
      stem.style.width = '1px';
      stem.style.height = '100%';
      stem.style.backgroundColor = darkenColor(feather.style.backgroundColor, 30);
      stem.style.left = '50%';
      stem.style.transform = 'translateX(-50%)';
      feather.appendChild(stem);
      
      feather.style.opacity = '0.9';
      feather.style.pointerEvents = 'none';
      feather.style.zIndex = '9997';
      feather.style.transform = `rotate(${Math.random() * 360}deg)`;
      feather.style.boxShadow = '0 0 2px rgba(0,0,0,0.2)';
      
      // Set random movement
      const speedX = Math.random() * 6 - 3;
      const speedY = -3 - Math.random() * 3; // Stronger initial upward movement
      
      // Track feather data
      const featherData = {
        element: feather,
        x: parseFloat(feather.style.left),
        y: parseFloat(feather.style.top),
        speedX,
        speedY,
        opacity: 0.9,
        gravity: 0.15,
        rotation: Math.random() * 8 - 4,  // More rotation
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
        duck.element.style.transform = `rotate(${duck.rotationSpeed}deg)`;
        
        // Remove duck when it falls off-screen
        if (duck.y > window.innerHeight) {
          gameContainer.removeChild(duck.element);
          ducks.splice(i, 1);
        }
      } else {
        // Update flying duck
        duck.x += duck.speedX;
        duck.time += 0.016; // Approximately 16ms per frame
        
        // Wave motion (gentle up and down)
        duck.y = duck.startY + Math.sin(duck.time * duck.waveFrequency * 10) * duck.waveAmplitude * 10;
        
        // Occasional quacking
        duck.quackTimer -= 16;
        if (duck.quackTimer <= 0) {
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