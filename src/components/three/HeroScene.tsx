'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import GeometricShapes from './GeometricShapes';
import ParticleField from './ParticleField';

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.3} color="#a78bfa" />
      <pointLight position={[10, 10, 10]} intensity={0.6} color="#7c5cfc" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#a78bfa" />
      <pointLight position={[0, 5, 5]} intensity={0.2} color="#c084fc" />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#e0d4ff" />

      <GeometricShapes />
      <ParticleField />

      {/* Purple-tinted fog for depth */}
      <fog attach="fog" args={['#0a0614', 8, 22]} />
    </>
  );
}

export default function HeroScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
