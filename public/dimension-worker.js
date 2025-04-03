/**
 * Web Worker for calculating image dimensions asynchronously
 * This helps avoid blocking the main thread when loading images
 */
self.addEventListener('message', function(e) {
  const imageUrl = e.data;
  
  // Create an image in the worker context
  const img = new Image();
  
  img.onload = function() {
    // Send dimensions back to main thread
    self.postMessage({
      width: img.width,
      height: img.height
    });
  };
  
  img.onerror = function() {
    // Send default dimensions on error
    self.postMessage({
      width: 712,
      height: 712
    });
  };
  
  // Load the image
  img.src = imageUrl;
});
