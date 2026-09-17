'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NodeData {
  position: THREE.Vector3;
  label: string;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
  type: 'identity' | 'asset' | 'block' | 'data';
}

export default function BlockchainNodes() {
  const groupRef = useRef<THREE.Group>(null);

  const nodes: NodeData[] = useMemo(() => [
    { position: new THREE.Vector3(0, 0, 0), label: 'ID', color: '#00f0ff', orbitRadius: 3.2, orbitSpeed: 0.3, orbitOffset: 0, type: 'identity' },
    { position: new THREE.Vector3(0, 0, 0), label: 'ASSET', color: '#00ff88', orbitRadius: 3.2, orbitSpeed: 0.3, orbitOffset: Math.PI * 0.4, type: 'asset' },
    { position: new THREE.Vector3(0, 0, 0), label: 'BLOCK', color: '#3b82f6', orbitRadius: 3.2, orbitSpeed: 0.3, orbitOffset: Math.PI * 0.8, type: 'block' },
    { position: new THREE.Vector3(0, 0, 0), label: 'DATA', color: '#a855f7', orbitRadius: 3.2, orbitSpeed: 0.3, orbitOffset: Math.PI * 1.2, type: 'data' },
    { position: new THREE.Vector3(0, 0, 0), label: 'KEY', color: '#f59e0b', orbitRadius: 3.2, orbitSpeed: 0.3, orbitOffset: Math.PI * 1.6, type: 'identity' },
    // Outer orbit
    { position: new THREE.Vector3(0, 0, 0), label: 'TX', color: '#00f0ff', orbitRadius: 4.0, orbitSpeed: -0.2, orbitOffset: 0, type: 'block' },
    { position: new THREE.Vector3(0, 0, 0), label: 'CID', color: '#00ff88', orbitRadius: 4.0, orbitSpeed: -0.2, orbitOffset: Math.PI * 0.67, type: 'data' },
    { position: new THREE.Vector3(0, 0, 0), label: 'DID', color: '#a855f7', orbitRadius: 4.0, orbitSpeed: -0.2, orbitOffset: Math.PI * 1.33, type: 'identity' },
  ], []);

  const connectionLines = useRef<THREE.BufferGeometry>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (i < nodes.length) {
          const node = nodes[i];
          const angle = t * node.orbitSpeed + node.orbitOffset;
          const tiltAngle = Math.sin(t * 0.1 + node.orbitOffset) * 0.3;

          child.position.x = Math.cos(angle) * node.orbitRadius;
          child.position.z = Math.sin(angle) * node.orbitRadius;
          child.position.y = Math.sin(angle * 2 + node.orbitOffset) * 0.5 + Math.sin(tiltAngle) * 0.3;

          // Pulsing scale
          const scale = 1 + Math.sin(t * 2 + i) * 0.15;
          child.scale.setScalar(scale);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <group key={i}>
          {/* Node core */}
          <mesh>
            <octahedronGeometry args={[0.12, 0]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.9} />
          </mesh>
          {/* Node glow */}
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.15} />
          </mesh>
          {/* Outer glow */}
          <mesh>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.04} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
