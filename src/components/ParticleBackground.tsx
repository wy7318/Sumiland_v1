import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Pause, Play } from 'lucide-react';

export function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const [isPaused, setIsPaused] = useState(false);
  const spiralRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    rendererRef.current = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(rendererRef.current.domElement);

    // Create spiral group
    spiralRef.current = new THREE.Group();
    scene.add(spiralRef.current);

    // Create iridescent material
    const discMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      iridescence: 1,
      iridescenceIOR: 1.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });

    // Create discs in a spiral pattern
    const numDiscs = 24;
    const discGeometry = new THREE.PlaneGeometry(1, 0.2);
    
    for (let i = 0; i < numDiscs; i++) {
      const disc = new THREE.Mesh(discGeometry, discMaterial.clone());
      
      // Position in a circular pattern
      const angle = (i / numDiscs) * Math.PI * 2;
      const radius = 2;
      disc.position.x = Math.cos(angle) * radius;
      disc.position.z = Math.sin(angle) * radius;
      
      // Rotate to face center
      disc.rotation.y = angle + Math.PI / 2;
      
      // Add initial rotation offset
      disc.rotation.x = (i / numDiscs) * Math.PI * 0.5;
      
      spiralRef.current.add(disc);
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xff00ff, 1, 10);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00ffff, 1, 10);
    pointLight2.position.set(-2, -2, -2);
    scene.add(pointLight2);

    camera.position.z = 5;
    camera.lookAt(0, 0, 0);

    // Animation
    const animate = () => {
      if (!rendererRef.current || !spiralRef.current || isPaused) return;

      // Rotate entire spiral
      spiralRef.current.rotation.z += 0.01;

      // Animate individual discs
      spiralRef.current.children.forEach((disc, i) => {
        disc.rotation.x += 0.02;
        disc.position.y = Math.sin((Date.now() * 0.001) + i * 0.2) * 0.1;
      });

      rendererRef.current.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Handle resize
    const handleResize = () => {
      if (!rendererRef.current) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [isPaused]);

  // Handle reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsPaused(true);
    }

    const handleMotionPreference = (e: MediaQueryListEvent) => {
      setIsPaused(e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionPreference);
    return () => mediaQuery.removeEventListener('change', handleMotionPreference);
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className="fixed inset-0 -z-10" />
      
      {/* Accessibility controls */}
      <button
        onClick={() => setIsPaused(!isPaused)}
        className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-sm p-2 rounded-full hover:bg-white/20 transition-colors z-50"
        aria-label={isPaused ? "Play animation" : "Pause animation"}
      >
        {isPaused ? (
          <Play className="w-5 h-5 text-primary-500" />
        ) : (
          <Pause className="w-5 h-5 text-primary-500" />
        )}
      </button>
    </div>
  );
}