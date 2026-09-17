'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function DataStreams() {
  const groupRef = useRef<THREE.Group>(null);
  const streamCount = 12;

  const streams = useMemo(() => {
    return Array.from({ length: streamCount }, (_, i) => {
      const angle = (i / streamCount) * Math.PI * 2;
      const radius = 2.2;
      return {
        startPos: new THREE.Vector3(
          Math.cos(angle) * radius,
          -2,
          Math.sin(angle) * radius
        ),
        endPos: new THREE.Vector3(
          Math.cos(angle) * radius * 1.8,
          2,
          Math.sin(angle) * radius * 1.8
        ),
        color: i % 3 === 0 ? '#00f0ff' : i % 3 === 1 ? '#00ff88' : '#3b82f6',
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      };
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!groupRef.current) return;

    groupRef.current.children.forEach((child, i) => {
      if (i < streams.length) {
        const stream = streams[i];
        const progress = ((t * stream.speed + stream.offset) % 4) / 4;

        child.position.lerpVectors(stream.startPos, stream.endPos, progress);
        const scale = Math.sin(progress * Math.PI) * 0.8;
        child.scale.setScalar(Math.max(0.1, scale));

        const material = (child.children[0] as THREE.Mesh)?.material as THREE.MeshBasicMaterial;
        if (material) {
          material.opacity = Math.sin(progress * Math.PI) * 0.6;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {streams.map((stream, i) => (
        <group key={i}>
          <mesh>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial
              color={stream.color}
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Trail glow */}
          <mesh>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial
              color={stream.color}
              transparent
              opacity={0.1}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
