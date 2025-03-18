// Water Ripple Effect
(function() {
  // Create canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Create custom cursor element
  const cursor = document.createElement('div');
  cursor.className = 'water-cursor';
  
  // Array to store all ripples
  let ripples = [];
  
  // Mouse position tracking
  let mouseX = 0;
  let mouseY = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;
  
  // Ripple settings
  const RIPPLE_RADIUS = 50;
  const RIPPLE_SPREAD_SPEED = 2;
  const RIPPLE_FADE_SPEED = 0.95;
  const RIPPLE_COLOR = 'rgba(120, 160, 255, 0.3)';
  const MOUSE_TRAIL_LENGTH = 5;
  let frameCount = 0;
  
  // Initialize the canvas
  function init() {
    // Style the canvas
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    canvas.style.zIndex = '9999'; // Place above other elements
    
    // Handle resize
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    // Set initial size
    resize();
    
    // Add custom cursor to document
    document.body.appendChild(cursor);
    
    // Attach resize listener
    window.addEventListener('resize', resize);
    
    // Track mouse movement
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Update cursor position
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
    });
    
    // Track mouse clicks to create bigger ripples
    document.addEventListener('click', e => {
      createRipple(e.clientX, e.clientY, 60); // Larger ripple on click
      
      // Pulse cursor on click
      cursor.style.width = '30px';
      cursor.style.height = '30px';
      setTimeout(() => {
        cursor.style.width = '20px';
        cursor.style.height = '20px';
      }, 300);
    });
    
    // Track hover state on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, [role="button"], input, select, textarea, [onclick]');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width = '30px';
        cursor.style.height = '30px';
        cursor.style.backgroundColor = 'rgba(120, 160, 255, 0.4)';
      });
      
      el.addEventListener('mouseleave', () => {
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.backgroundColor = '';
      });
    });
    
    // Add to document
    document.body.appendChild(canvas);
    
    // Start animation loop
    requestAnimationFrame(animate);
  }
  
  // Create a new ripple
  function createRipple(x, y, radius = RIPPLE_RADIUS) {
    ripples.push({
      x, 
      y, 
      radius: 5, // Start with small radius
      maxRadius: radius,
      alpha: 0.5, // Start semi-transparent
      expanding: true
    });
    
    // Limit number of ripples for performance
    if (ripples.length > 20) {
      ripples.shift();
    }
  }
  
  // Animation loop
  function animate() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate mouse speed
    const dx = mouseX - lastMouseX;
    const dy = mouseY - lastMouseY;
    const mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    
    // Create ripples based on mouse movement
    frameCount++;
    if (mouseSpeed > 5 && frameCount % MOUSE_TRAIL_LENGTH === 0) {
      createRipple(mouseX, mouseY, Math.min(50, 20 + mouseSpeed * 0.5));
    }
    
    // Update last mouse position
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    
    // Draw and update all ripples
    ripples.forEach((ripple, index) => {
      // Update ripple properties
      if (ripple.expanding) {
        ripple.radius += RIPPLE_SPREAD_SPEED;
        
        // Start fading when reaching halfway to max radius
        if (ripple.radius >= ripple.maxRadius * 0.5) {
          ripple.alpha *= RIPPLE_FADE_SPEED;
        }
        
        // Stop expanding at max radius
        if (ripple.radius >= ripple.maxRadius) {
          ripple.expanding = false;
        }
      } else {
        // Continue fading
        ripple.alpha *= RIPPLE_FADE_SPEED;
      }
      
      // Remove when nearly invisible
      if (ripple.alpha < 0.01) {
        ripples.splice(index, 1);
        return;
      }
      
      // Draw ripple
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = RIPPLE_COLOR.replace('0.3', ripple.alpha);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add inner ripple for more water-like effect
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = RIPPLE_COLOR.replace('0.3', ripple.alpha * 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    // Continue animation
    requestAnimationFrame(animate);
  }
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 