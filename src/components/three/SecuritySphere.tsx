'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function SecuritySphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const ringRef3 = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color('#00f0ff') },
        color2: { value: new THREE.Color('#0ea5e9') },
        color3: { value: new THREE.Color('#00ff88') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          
          vec3 pos = position;
          float displacement = sin(pos.x * 3.0 + time) * sin(pos.y * 3.0 + time) * sin(pos.z * 3.0 + time) * 0.02;
          pos += normal * displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          
          vec3 col = mix(color1, color2, sin(vUv.y * 6.28 + time * 0.5) * 0.5 + 0.5);
          col = mix(col, color3, sin(vUv.x * 12.56 + time * 0.3) * 0.3);
          
          float grid = smoothstep(0.02, 0.0, abs(fract(vUv.x * 20.0) - 0.5)) + 
                       smoothstep(0.02, 0.0, abs(fract(vUv.y * 20.0) - 0.5));
          grid *= 0.15;
          
          float alpha = fresnel * 0.6 + grid + 0.05;
          
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    shaderMaterial.uniforms.time.value = t;

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.08;
      meshRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = t * 0.08;
      wireRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = t * 0.2;
      ringRef1.current.rotation.x = Math.PI / 3;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = -t * 0.15;
      ringRef2.current.rotation.x = Math.PI / 2.5;
      ringRef2.current.rotation.y = t * 0.1;
    }
    if (ringRef3.current) {
      ringRef3.current.rotation.z = t * 0.12;
      ringRef3.current.rotation.y = Math.PI / 4;
    }
  });

  return (
    <group>
      {/* Main sphere with shader */}
      <mesh ref={meshRef} material={shaderMaterial}>
        <sphereGeometry args={[1.8, 64, 64]} />
      </mesh>

      {/* Wireframe overlay */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[1.82, 32, 32]} />
        <meshBasicMaterial
          color="#00f0ff"
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>

      {/* Orbital rings */}
      <mesh ref={ringRef1}>
        <torusGeometry args={[2.5, 0.008, 16, 100]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.4} />
      </mesh>
      <mesh ref={ringRef2}>
        <torusGeometry args={[2.8, 0.006, 16, 100]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.25} />
      </mesh>
      <mesh ref={ringRef3}>
        <torusGeometry args={[3.1, 0.005, 16, 100]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
      </mesh>

      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.03}
        />
      </mesh>
    </group>
  );
}
