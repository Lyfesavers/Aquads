import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Box, 
  Plane, 
  RoundedBox,
  Environment,
  PerspectiveCamera,
  Html,
  useTexture,
  Cylinder,
  Sphere
} from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Gamepad2, 
  Briefcase, 
  BookOpen, 
  DollarSign,
  Users,
  Star,
  Activity,
  X,
  MousePointer,
  Move,
  RotateCcw
} from 'lucide-react';

// Room Objects Component
function RoomObjects({ onObjectClick, hoveredObject, setHoveredObject }) {
  const navigate = useNavigate();

  // Interactive objects data
  const objects = [
    {
      id: 'gaming-setup',
      position: [-4, 1, -3],
      rotation: [0, Math.PI / 4, 0],
      type: 'computer',
      title: 'Game Hub',
      description: 'Play games and compete',
      link: '/games',
      color: '#ff6b6b'
    },
    {
      id: 'trading-desk',
      position: [4, 1, -2],
      rotation: [0, -Math.PI / 4, 0],
      type: 'monitor',
      title: 'Trading Dashboard',
      description: 'Crypto trading tools',
      link: '/swap',
      color: '#4ecdc4'
    },
    {
      id: 'freelancer-board',
      position: [-2, 2, -4.8],
      rotation: [0, 0, 0],
      type: 'board',
      title: 'Freelancer Hub',
      description: 'Find talent and projects',
      link: '/marketplace',
      color: '#45b7d1'
    },
    {
      id: 'learning-shelf',
      position: [3, 1.5, -4.8],
      rotation: [0, 0, 0],
      type: 'shelf',
      title: 'Learning Center',
      description: 'Educational resources',
      link: '/learn',
      color: '#96ceb4'
    },
    {
      id: 'meeting-table',
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      type: 'table',
      title: 'AquaFi DeFi',
      description: 'DeFi protocols',
      link: '/aquafi',
      color: '#ffeaa7'
    }
  ];

  return (
    <>
      {objects.map((obj) => (
        <InteractiveObject
          key={obj.id}
          {...obj}
          onClick={() => onObjectClick(obj)}
          isHovered={hoveredObject === obj.id}
          onHover={() => setHoveredObject(obj.id)}
          onUnhover={() => setHoveredObject(null)}
        />
      ))}
    </>
  );
}

// Interactive Object Component
function InteractiveObject({ id, position, rotation, type, title, description, link, color, onClick, isHovered, onHover, onUnhover }) {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
      
      // Glow effect when hovered
      if (glowRef.current) {
        glowRef.current.material.opacity = isHovered ? 0.3 : 0.1;
      }
    }
  });

  const renderObject = () => {
    switch (type) {
      case 'computer':
        return (
          <group>
            {/* Monitor */}
            <Box ref={meshRef} args={[1.5, 1, 0.1]} position={[0, 0.5, 0]}>
              <meshStandardMaterial color={color} />
            </Box>
            {/* Screen */}
            <Box args={[1.3, 0.8, 0.05]} position={[0, 0.5, 0.06]}>
              <meshStandardMaterial color="#000" emissive={color} emissiveIntensity={0.2} />
            </Box>
            {/* Base */}
            <Cylinder args={[0.3, 0.3, 0.1]} position={[0, -0.05, 0]}>
              <meshStandardMaterial color="#333" />
            </Cylinder>
            {/* Keyboard */}
            <Box args={[1, 0.3, 0.05]} position={[0, -0.5, 0.5]}>
              <meshStandardMaterial color="#222" />
            </Box>
          </group>
        );
      
      case 'monitor':
        return (
          <group>
            {/* Multiple monitors */}
            <Box ref={meshRef} args={[1.2, 0.8, 0.1]} position={[-0.7, 0.4, 0]}>
              <meshStandardMaterial color={color} />
            </Box>
            <Box args={[1.2, 0.8, 0.1]} position={[0.7, 0.4, 0]}>
              <meshStandardMaterial color={color} />
            </Box>
            {/* Desk */}
            <Box args={[3, 0.1, 1.5]} position={[0, -0.1, 0]}>
              <meshStandardMaterial color="#8B4513" />
            </Box>
          </group>
        );
      
      case 'board':
        return (
          <group>
            {/* Whiteboard */}
            <Box ref={meshRef} args={[2.5, 1.5, 0.1]} position={[0, 0, 0]}>
              <meshStandardMaterial color="white" />
            </Box>
            {/* Frame */}
            <Box args={[2.7, 1.7, 0.05]} position={[0, 0, -0.06]}>
              <meshStandardMaterial color="#333" />
            </Box>
          </group>
        );
      
      case 'shelf':
        return (
          <group>
            {/* Bookshelf */}
            <Box ref={meshRef} args={[2, 2.5, 0.3]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#8B4513" />
            </Box>
            {/* Books */}
            {Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} args={[0.15, 0.8, 0.25]} position={[-0.8 + i * 0.2, -0.3 + Math.floor(i / 4) * 0.9, 0.15]}>
                <meshStandardMaterial color={`hsl(${i * 45}, 70%, 60%)`} />
              </Box>
            ))}
          </group>
        );
      
      case 'table':
        return (
          <group>
            {/* Table top */}
            <Box ref={meshRef} args={[2.5, 0.1, 1.5]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#654321" />
            </Box>
            {/* Legs */}
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
              <Box key={i} args={[0.1, 1, 0.1]} position={[x, -0.5, z * 0.6]}>
                <meshStandardMaterial color="#333" />
              </Box>
            ))}
            {/* Laptop */}
            <Box args={[1, 0.7, 0.02]} position={[0, 0.07, 0]}>
              <meshStandardMaterial color="#333" />
            </Box>
          </group>
        );
      
      default:
        return (
          <Box ref={meshRef} args={[1, 1, 1]}>
            <meshStandardMaterial color={color} />
          </Box>
        );
    }
  };

  return (
    <group 
      position={position} 
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onHover}
      onPointerOut={onUnhover}
      style={{ cursor: 'pointer' }}
    >
      {renderObject()}
      
      {/* Glow effect */}
      <Sphere ref={glowRef} args={[2]} position={[0, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </Sphere>
      
      {/* Floating label */}
      {isHovered && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-lg pointer-events-none">
            <div className="text-lg font-bold">{title}</div>
            <div className="text-sm text-gray-300">{description}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Room Environment Component
function Room() {
  return (
    <group>
      {/* Floor */}
      <Plane args={[20, 20]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <meshStandardMaterial color="#2c3e50" />
      </Plane>
      
      {/* Walls */}
      {/* Back wall */}
      <Plane args={[20, 10]} position={[0, 4, -5]}>
        <meshStandardMaterial color="#34495e" />
      </Plane>
      
      {/* Left wall */}
      <Plane args={[10, 10]} rotation={[0, Math.PI / 2, 0]} position={[-10, 4, 0]}>
        <meshStandardMaterial color="#34495e" />
      </Plane>
      
      {/* Right wall */}
      <Plane args={[10, 10]} rotation={[0, -Math.PI / 2, 0]} position={[10, 4, 0]}>
        <meshStandardMaterial color="#34495e" />
      </Plane>
      
      {/* Ceiling */}
      <Plane args={[20, 20]} rotation={[Math.PI / 2, 0, 0]} position={[0, 9, 0]}>
        <meshStandardMaterial color="#2c3e50" />
      </Plane>
      
      {/* Windows */}
      <Plane args={[3, 2]} position={[-2, 3, -4.9]}>
        <meshStandardMaterial color="#87CEEB" transparent opacity={0.3} />
      </Plane>
      <Plane args={[3, 2]} position={[2, 3, -4.9]}>
        <meshStandardMaterial color="#87CEEB" transparent opacity={0.3} />
      </Plane>
    </group>
  );
}

// Camera Controller Component
function CameraController() {
  const { camera } = useThree();
  const [keys, setKeys] = useState({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseLocked, setIsMouseLocked] = useState(false);
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (event) => {
      setKeys(prev => ({ ...prev, [event.code]: true }));
    };

    const handleKeyUp = (event) => {
      setKeys(prev => ({ ...prev, [event.code]: false }));
    };

    const handleMouseMove = (event) => {
      if (isMouseLocked) {
        setMousePos(prev => ({
          x: prev.x + event.movementX * 0.002,
          y: prev.y + event.movementY * 0.002
        }));
      }
    };

    const handleClick = () => {
      document.body.requestPointerLock();
      setIsMouseLocked(true);
    };

    const handlePointerLockChange = () => {
      setIsMouseLocked(document.pointerLockElement === document.body);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isMouseLocked]);

  useFrame((state, delta) => {
    // Mouse look
    camera.rotation.y = -mousePos.x;
    camera.rotation.x = -mousePos.y;
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

    // Movement
    const speed = 5;
    direction.current.set(0, 0, 0);

    if (keys['KeyW']) direction.current.z -= 1;
    if (keys['KeyS']) direction.current.z += 1;
    if (keys['KeyA']) direction.current.x -= 1;
    if (keys['KeyD']) direction.current.x += 1;

    direction.current.normalize();
    direction.current.applyQuaternion(camera.quaternion);
    direction.current.y = 0; // Prevent flying

    velocity.current.lerp(direction.current.multiplyScalar(speed), 0.1);
    camera.position.add(velocity.current.clone().multiplyScalar(delta));

    // Keep camera above ground
    camera.position.y = Math.max(0.5, camera.position.y);
    
    // Room boundaries
    camera.position.x = Math.max(-8, Math.min(8, camera.position.x));
    camera.position.z = Math.max(-3, Math.min(3, camera.position.z));
  });

  return null;
}

// Lighting Component
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 8, 0]} intensity={1} color="#ffffff" castShadow />
      <pointLight position={[-5, 5, -3]} intensity={0.5} color="#4ecdc4" />
      <pointLight position={[5, 5, -3]} intensity={0.5} color="#ff6b6b" />
      <spotLight
        position={[0, 8, -2]}
        angle={Math.PI / 4}
        penumbra={0.5}
        intensity={0.5}
        castShadow
      />
    </>
  );
}

// Main Component
const InteractiveLanding = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const navigate = useNavigate();

  const handleObjectClick = (object) => {
    setActiveSection(object);
  };

  const handleExplore = () => {
    if (activeSection?.link) {
      navigate(activeSection.link);
    }
  };

  return (
    <div className="w-full h-screen relative bg-gray-900">
      {/* Instructions Overlay */}
      {showInstructions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 left-4 z-50 bg-black/80 backdrop-blur-md text-white p-6 rounded-xl max-w-md"
        >
          <button
            onClick={() => setShowInstructions(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MousePointer className="w-5 h-5" />
            Welcome to the Aquads Virtual Office
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-blue-400" />
              <span><strong>WASD</strong> - Move around</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-green-400" />
              <span><strong>Mouse</strong> - Look around (click to lock cursor)</span>
            </div>
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-purple-400" />
              <span><strong>Click objects</strong> - Interact with platform features</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">
            Explore the room and click on objects to learn about our platform features!
          </p>
        </motion.div>
      )}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Welcome to Aquads
        </h1>
        <p className="text-lg text-gray-300">
          Explore our virtual office space
        </p>
      </motion.div>

      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 1.6, 3], fov: 75 }}
        shadows
        style={{ background: 'linear-gradient(to bottom, #1e3a8a, #1e1b4b)' }}
      >
        <Suspense fallback={null}>
          <CameraController />
          <Lighting />
          <Room />
          <RoomObjects 
            onObjectClick={handleObjectClick}
            hoveredObject={hoveredObject}
            setHoveredObject={setHoveredObject}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>

      {/* Object Detail Modal */}
      <AnimatePresence>
        {activeSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setActiveSection(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className={`bg-gradient-to-r p-6 text-white`} style={{ background: activeSection.color }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{activeSection.title}</h2>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-white/90 mt-2">{activeSection.description}</p>
              </div>

              <div className="p-6">
                <div className="flex gap-3">
                  <button 
                    onClick={handleExplore}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    Explore Feature
                  </button>
                  <button 
                    onClick={() => setActiveSection(null)}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Continue Exploring
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InteractiveLanding;
