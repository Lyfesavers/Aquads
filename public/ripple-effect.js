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
  const RIPPLE_FADE_SPEED = 0.98;
  const RIPPLE_COLOR = 'rgba(120, 160, 255, 0.6)';
  const MOUSE_TRAIL_LENGTH = 3;
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
    
    // Add special CSS rules to handle close buttons in modals
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .modal .close, 
      [role="dialog"] .close, 
      .modal-close, 
      .close-button, 
      [data-dismiss="modal"], 
      [aria-label="Close"] {
        position: relative !important;
        z-index: 9999 !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Define a debounced version of cursor position update to prevent rapid toggling
    let cursorUpdateTimeout;
    
    // Track mouse movement with improved handling
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Track elements under the cursor
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      
      // Check for close buttons or modals in elements under cursor
      let foundCloseButton = false;
      let foundModal = false;
      
      for (const el of elementsAtPoint) {
        // Check for close buttons
        if (
          (el.textContent === '×' || 
           el.textContent === '✕' || 
           el.textContent === 'X' || 
           el.textContent === 'x' || 
           el.innerHTML === '&times;') ||
          (el.classList && (
            el.classList.contains('close') ||
            el.classList.contains('close-button') ||
            el.classList.contains('modal-close') ||
            el.classList.contains('closeButton')
          )) ||
          el.getAttribute('aria-label') === 'Close' ||
          el.getAttribute('data-dismiss') === 'modal' ||
          el.getAttribute('data-close') === 'true'
        ) {
          foundCloseButton = true;
          break;
        }
        
        // Check for modals
        if (el.classList && (
          el.classList.contains('modal') || 
          el.classList.contains('modal-backdrop') ||
          el.classList.contains('fixed') ||
          el.classList.contains('fixed-inset') ||
          el.classList.contains('absolute') ||
          el.getAttribute('role') === 'dialog' || 
          el.getAttribute('role') === 'modal'
        )) {
          foundModal = true;
        }
      }
      
      // Update state based on what we found
      isOverCloseButton = foundCloseButton;
      isOverModal = foundModal && !foundCloseButton; // Don't count as modal if it's a close button
      
      // Update cursor position
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
      
      // Clear any pending cursor update
      clearTimeout(cursorUpdateTimeout);
      
      // Set a small delay before changing cursor appearance to prevent flickering
      cursorUpdateTimeout = setTimeout(() => {
        if (isOverCloseButton) {
          // Completely hide cursor for close buttons
          cursor.style.opacity = '0';
          cursor.style.transform = 'scale(0)';
        } else if (isOverModal) {
          // Semi-transparent for modals
          cursor.style.opacity = '0.2';
          cursor.style.transform = 'scale(0.7)';
        } else {
          // Normal for everything else
          cursor.style.opacity = '1';
          cursor.style.transform = 'scale(1)';
        }
      }, 10);
    });
    
    // Track mouse clicks to create bigger ripples with improved handling
    document.addEventListener('click', e => {
      // Immediate update of modal/close button status when clicked
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      let foundCloseButton = false;
      
      for (const el of elementsAtPoint) {
        // Check for close buttons
        if (
          (el.textContent === '×' || 
           el.textContent === '✕' || 
           el.textContent === 'X' || 
           el.textContent === 'x' || 
           el.innerHTML === '&times;') ||
          (el.classList && (
            el.classList.contains('close') ||
            el.classList.contains('close-button') ||
            el.classList.contains('modal-close') ||
            el.classList.contains('closeButton')
          )) ||
          el.getAttribute('aria-label') === 'Close' ||
          el.getAttribute('data-dismiss') === 'modal' ||
          el.getAttribute('data-close') === 'true'
        ) {
          foundCloseButton = true;
          break;
        }
      }
      
      if (foundCloseButton) {
        // If clicking a close button, completely hide cursor for a while
        cursor.style.opacity = '0';
        cursor.style.transform = 'scale(0)';
        
        // Keep it hidden long enough for modal to close
        setTimeout(() => {
          if (!isOverCloseButton && !isOverModal) {
            cursor.style.opacity = '1';
            cursor.style.transform = 'scale(1)';
          }
        }, 500);
      } else if (!isOverModal && !isOverCloseButton) {
        // Only create ripples outside of modals
        createRipple(e.clientX, e.clientY, 60);
        
        // Pulse cursor
        cursor.style.width = '30px';
        cursor.style.height = '30px';
        setTimeout(() => {
          cursor.style.width = '20px';
          cursor.style.height = '20px';
        }, 300);
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
      // Get current z-index or default to 1000
      const currentZIndex = parseInt(window.getComputedStyle(modal).zIndex) || 0;
      
      // Only update if the z-index is too low
      if (currentZIndex < 1010 && currentZIndex !== 0) {
        // Set to a high z-index to ensure it's above our effects
        modal.style.zIndex = '1010';
      }
      
      // Find and fix all close buttons in this modal
      const closeButtons = modal.querySelectorAll('.close, .close-button, .modal-close, [data-dismiss="modal"], [aria-label="Close"]');
      closeButtons.forEach(button => {
        button.style.position = 'relative';
        button.style.zIndex = '9999';
      });
    });
  }
  
  // Setup a mutation observer to detect new modals
  function setupModalObserver() {
    const observer = new MutationObserver((mutations) => {
      // For each mutation, check if we need to update modal z-indexes
      let needsUpdate = false;
      
      mutations.forEach(mutation => {
        // If nodes were added, check if any of them are modals or inside modals
        if (mutation.addedNodes.length) {
          Array.from(mutation.addedNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
              if (node.classList && 
                  (node.classList.contains('modal') || 
                   node.classList.contains('fixed') || 
                   node.getAttribute('role') === 'dialog')) {
                needsUpdate = true;
              } else if (node.querySelector) {
                // Check if it contains modals
                const hasModal = node.querySelector('.modal, .fixed, [role="dialog"]');
                if (hasModal) needsUpdate = true;
              }
            }
          });
        }
        
        // If attributes changed, check if it's relevant to modals
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.classList && 
              (target.classList.contains('modal') || 
               target.classList.contains('fixed') || 
               target.getAttribute('role') === 'dialog')) {
            needsUpdate = true;
          }
        }
      });
      
      // If needed, update modal z-indexes
      if (needsUpdate) {
        updateModalZIndexes();
        setupInteractiveElements();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'role']
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
      
      // Check if element is a close button
      const isCloseButton = 
        (el.textContent === '×' || 
         el.textContent === '✕' || 
         el.textContent === 'x' || 
         el.textContent === 'X' || 
         el.innerHTML === '&times;') ||
        (el.classList && (
          el.classList.contains('close') ||
          el.classList.contains('close-button') ||
          el.classList.contains('modal-close') ||
          el.classList.contains('closeButton')
        )) ||
        el.getAttribute('aria-label') === 'Close' ||
        el.getAttribute('data-dismiss') === 'modal' ||
        el.getAttribute('data-close') === 'true';
      
      if (isCloseButton) {
        // Ensure close buttons have high z-index
        el.style.position = 'relative';
        el.style.zIndex = '9999';
      }
      
      el.addEventListener('mouseenter', () => {
        // If this is a close button, hide cursor completely
        if (isCloseButton) {
          cursor.style.opacity = '0';
          cursor.style.transform = 'scale(0)';
          return;
        }
        
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
      alpha: 0.8, // Increased from 0.5 to make initial ripples more visible
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
    if (mouseSpeed > 2 && frameCount % MOUSE_TRAIL_LENGTH === 0 && !isOverModal && !isOverCloseButton) {
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
      ctx.strokeStyle = RIPPLE_COLOR.replace('0.6', ripple.alpha);
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Add inner ripple for more water-like effect
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = RIPPLE_COLOR.replace('0.6', ripple.alpha * 0.5);
      ctx.lineWidth = 2;
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

  // Also initialize after a short delay to ensure all resources are loaded
  setTimeout(init, 1000);
})(); 