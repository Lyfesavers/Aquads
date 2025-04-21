import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';

const EasterEgg = ({ onClose }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const frameIdRef = useRef(null);

  useEffect(() => {
    // Initialize Three.js scene
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x222222);
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create multiple egg shapes with different colors and sizes
    const eggs = [];
    const colors = [0xff4500, 0x00bfff, 0x32cd32, 0xffd700, 0xff69b4, 0x9932cc];
    
    for (let i = 0; i < 10; i++) {
      // Create egg shape using ellipsoid geometry
      const eggGeometry = new THREE.SphereGeometry(0.8, 32, 32);
      // Slightly modify the geometry to make it more egg-shaped
      for (let j = 0; j < eggGeometry.attributes.position.count; j++) {
        const y = eggGeometry.attributes.position.getY(j);
        if (y < 0) {
          // Make bottom slightly pointier
          eggGeometry.attributes.position.setY(
            j,
            y * 1.2
          );
        } else {
          // Make top slightly wider
          eggGeometry.attributes.position.setX(
            j,
            eggGeometry.attributes.position.getX(j) * 0.8
          );
          eggGeometry.attributes.position.setZ(
            j,
            eggGeometry.attributes.position.getZ(j) * 0.8
          );
        }
      }
      eggGeometry.attributes.position.needsUpdate = true;
      
      // Add decorative patterns (simple spots)
      const colorIndex = i % colors.length;
      const eggMaterial = new THREE.MeshPhongMaterial({
        color: colors[colorIndex],
        shininess: 100,
      });
      
      const egg = new THREE.Mesh(eggGeometry, eggMaterial);
      
      // Position eggs in a circular pattern
      const angle = (i / 10) * Math.PI * 2;
      const radius = 3;
      egg.position.x = Math.cos(angle) * radius;
      egg.position.y = Math.sin(angle) * radius;
      egg.position.z = (Math.random() - 0.5) * 2;
      
      // Random initial rotation
      egg.rotation.x = Math.random() * Math.PI;
      egg.rotation.y = Math.random() * Math.PI;
      
      scene.add(egg);
      eggs.push({
        mesh: egg,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        }
      });
    }
    
    // Create a special golden egg in the center
    const goldenEggGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    // Make it egg-shaped
    for (let j = 0; j < goldenEggGeometry.attributes.position.count; j++) {
      const y = goldenEggGeometry.attributes.position.getY(j);
      if (y < 0) {
        goldenEggGeometry.attributes.position.setY(
          j,
          y * 1.2
        );
      } else {
        goldenEggGeometry.attributes.position.setX(
          j,
          goldenEggGeometry.attributes.position.getX(j) * 0.8
        );
        goldenEggGeometry.attributes.position.setZ(
          j,
          goldenEggGeometry.attributes.position.getZ(j) * 0.8
        );
      }
    }
    goldenEggGeometry.attributes.position.needsUpdate = true;
    
    const goldenEggMaterial = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      shininess: 150,
      emissive: 0x553300,
      emissiveIntensity: 0.2
    });
    
    const goldenEgg = new THREE.Mesh(goldenEggGeometry, goldenEggMaterial);
    scene.add(goldenEgg);
    
    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      // Rotate eggs
      eggs.forEach(egg => {
        egg.mesh.rotation.x += egg.rotationSpeed.x;
        egg.mesh.rotation.y += egg.rotationSpeed.y;
        egg.mesh.rotation.z += egg.rotationSpeed.z;
      });
      
      // Rotate golden egg more slowly for emphasis
      goldenEgg.rotation.y += 0.01;
      
      // Render the scene
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up function
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      renderer.dispose();
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-xl w-full max-w-4xl h-[80vh]">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="text-white bg-red-600 hover:bg-red-700 rounded-full p-2 focus:outline-none"
          >
            ✕
          </button>
        </div>
        
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-gold-500 text-white font-bold py-2 px-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600">
            🏆 Congratulations!
          </div>
        </div>
        
        <div ref={containerRef} className="w-full h-full"></div>
        
        <div className="absolute bottom-8 left-0 right-0 text-center text-white">
          <h2 className="text-3xl font-bold mb-2 text-yellow-400">Easter Egg Found!</h2>
          <p className="text-xl">You've accumulated 3000 points and discovered our hidden Easter egg!</p>
        </div>
      </div>
    </motion.div>
  );
};

export default EasterEgg; 