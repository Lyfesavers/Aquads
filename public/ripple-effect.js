// Water Ripple Effect
(function() {
  // Create canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Create custom cursor element
  const cursor = document.createElement('div');
  cursor.className = 'water-cursor';
  cursor.style.position = 'fixed';
  cursor.style.width = '20px';
  cursor.style.height = '20px';
  cursor.style.borderRadius = '50%';
  cursor.style.background = 'rgba(120, 160, 255, 0.3)';
  cursor.style.boxShadow = '0 0 10px rgba(120, 160, 255, 0.2)';
  cursor.style.marginTop = '-10px';
  cursor.style.marginLeft = '-10px';
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = '1000';
  cursor.style.transition = 'transform 0.2s ease, width 0.3s ease, height 0.3s ease, background-color 0.3s ease, opacity 0.2s ease';
  
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
  
  // State tracking
  let isOverModal = false;
  let isOverCloseButton = false;
  
  // Initialize the canvas
  function init() {
    // Style the canvas
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    canvas.style.zIndex = '999'; // Place below modals but above other content
    
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
      
      // Check if mouse is over a modal or close button
      checkModalInteraction(e.target);
      
      // Always update cursor position
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
      
      // Adjust cursor appearance based on modal interaction
      if (isOverModal || isOverCloseButton) {
        // Make cursor nearly invisible when over modal elements and close buttons
        if (isOverCloseButton) {
          cursor.style.opacity = '0.1';  // Nearly invisible for close buttons
          cursor.style.transform = 'scale(0.5)';
          cursor.style.zIndex = '5'; // Very low z-index for close buttons
        } else {
          cursor.style.opacity = '0.2';  // Just very transparent for other modal elements
          cursor.style.transform = 'scale(0.7)';
          cursor.style.zIndex = '10';
        }
      } else {
        // Normal cursor appearance otherwise
        cursor.style.opacity = '1';
        cursor.style.transform = 'scale(1)';
        cursor.style.zIndex = '1000';
      }
    });
    
    // Track mouse clicks to create bigger ripples
    document.addEventListener('click', e => {
      // Only create ripples if not over a modal or close button
      if (!isOverModal && !isOverCloseButton) {
        createRipple(e.clientX, e.clientY, 60); // Larger ripple on click
        
        // Pulse cursor on click
        cursor.style.width = '30px';
        cursor.style.height = '30px';
        setTimeout(() => {
          cursor.style.width = '20px';
          cursor.style.height = '20px';
        }, 300);
      } else if (isOverCloseButton) {
        // Hide cursor completely when clicking close buttons to avoid any interference
        cursor.style.opacity = '0';
        setTimeout(() => {
          if (!isOverCloseButton) {
            cursor.style.opacity = '1';
          }
        }, 500); // Restore after a delay if no longer over close button
      }
    });
    
    // We need to do this right away for any modals that are already on the page
    document.addEventListener('DOMContentLoaded', () => {
      updateModalZIndexes();
    });
    
    // Set up a mutation observer to detect dynamically added modals
    setupModalObserver();
    
    // Track hover state on interactive elements
    setupInteractiveElements();
    
    // Add to document
    document.body.appendChild(canvas);
    
    // Start animation loop
    requestAnimationFrame(animate);
  }
  
  // Ensure all modals have higher z-index than our effects
  function updateModalZIndexes() {
    // Find all potential modal elements
    const modalElements = document.querySelectorAll('.modal, .modal-backdrop, .fixed, [role="dialog"]');
    
    modalElements.forEach(modal => {
      const currentZIndex = parseInt(window.getComputedStyle(modal).zIndex) || 0;
      // Only update if the z-index is too low
      if (currentZIndex < 1010 && currentZIndex !== 0) {
        // Set to a high z-index to ensure it's above our effects
        modal.style.zIndex = '1010';
      }
    });
  }
  
  // Check if an element is a modal or close button
  function checkModalInteraction(element) {
    // Check if current element or any parent is a modal
    let current = element;
    isOverModal = false;
    isOverCloseButton = false;
    
    while (current) {
      // Check for modal elements - expanded class list
      if (current.classList && (
          current.classList.contains('modal') || 
          current.classList.contains('modal-backdrop') ||
          current.classList.contains('fixed') ||
          current.classList.contains('fixed-inset') ||
          current.classList.contains('absolute') ||
          current.classList.contains('fixed-inset-0') ||
          current.getAttribute('role') === 'dialog' || 
          current.getAttribute('role') === 'modal' ||
          // Common modal containers
          (current.style && (
              current.style.position === 'fixed' || 
              current.style.position === 'absolute'
          )) &&
          current.style.zIndex && parseInt(current.style.zIndex) > 100
      )) {
        isOverModal = true;
      }
      
      // Check specifically for close buttons (X) in modals with improved detection
      if (
          // Text content checks
          (current.textContent === '×' || 
           current.textContent === '✕' || 
           current.textContent === 'x' || 
           current.textContent === 'X' || 
           current.innerHTML === '&times;') ||
          // Class checks for common close buttons
          (current.classList && (
              current.classList.contains('close') ||
              current.classList.contains('close-button') ||
              current.classList.contains('modal-close') ||
              current.classList.contains('closeButton')
          )) ||
          // Attribute checks
          current.getAttribute('aria-label') === 'Close' ||
          current.getAttribute('data-dismiss') === 'modal' ||
          current.getAttribute('data-close') === 'true'
      ) {
        isOverCloseButton = true;
        
        // Ensure close button has appropriate z-index
        const currentZIndex = parseInt(window.getComputedStyle(current).zIndex) || 0;
        if (currentZIndex < 1020) {
          current.style.zIndex = '1020'; // Set even higher than modals
        }
      }
      
      current = current.parentElement;
    }
  }
  
  // Setup a mutation observer to detect new modals
  function setupModalObserver() {
    const observer = new MutationObserver((mutations) => {
      updateModalZIndexes();
      setupInteractiveElements();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
  
  // Setup event listeners for interactive elements
  function setupInteractiveElements() {
    // Track hover state on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, [role="button"], input, select, textarea, [onclick]');
    interactiveElements.forEach(el => {
      // Skip if already processed
      if (el.dataset.rippleProcessed) return;
      el.dataset.rippleProcessed = 'true';
      
      el.addEventListener('mouseenter', () => {
        // Check if element is inside a modal
        const isInModal = el.closest('.modal, .fixed, [role="dialog"]');
        
        if (!isInModal) {
          // Expand the cursor for interactive elements
          cursor.style.width = '30px';
          cursor.style.height = '30px';
          cursor.style.backgroundColor = 'rgba(120, 160, 255, 0.4)';
        } else {
          // Make cursor nearly invisible for modal elements
          cursor.style.opacity = '0.2';
          cursor.style.transform = 'scale(0.7)';
        }
      });
      
      el.addEventListener('mouseleave', () => {
        // Reset cursor to default state only if not over a modal/close button
        if (!isOverModal && !isOverCloseButton) {
          cursor.style.width = '20px';
          cursor.style.height = '20px';
          cursor.style.backgroundColor = 'rgba(120, 160, 255, 0.3)';
          cursor.style.opacity = '1';
          cursor.style.transform = 'scale(1)';
        }
      });
    });
  }
  
  // Create a new ripple
  function createRipple(x, y, radius = RIPPLE_RADIUS) {
    // Don't create ripples if over a modal
    if (isOverModal || isOverCloseButton) return;
    
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
    if (mouseSpeed > 5 && frameCount % MOUSE_TRAIL_LENGTH === 0 && !isOverModal && !isOverCloseButton) {
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