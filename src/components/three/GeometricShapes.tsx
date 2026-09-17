'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function FloatingCube({ position, size, color, speed, rotationAxis }: {
  position: [number, number, number];
  size: number;
  color: string;
  speed: number;
  rotationAxis: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialY = position[1];

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x += rotationAxis[0] * speed * 0.01;
    ref.current.rotation.y += rotationAxis[1] * speed * 0.01;
    ref.current.rotation.z += rotationAxis[2] * speed * 0.01;
    ref.current.position.y = initialY + Math.sin(t * speed * 0.5) * 0.3;
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.7}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

function FloatingSphere({ position, size, color, speed }: {
  position: [number, number, number];
  size: number;
  color: string;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialPos = useMemo(() => [...position], [position]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.x = initialPos[0] + Math.sin(t * speed * 0.3) * 0.2;
    ref.current.position.y = initialPos[1] + Math.cos(t * speed * 0.4) * 0.3;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

function StripedSphere({ position, size, speed }: {
  position: [number, number, number];
  size: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialPos = useMemo(() => [...position], [position]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color('#5b4cc4') },
        color2: { value: new THREE.Color('#7c6dd8') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float stripe = step(0.5, fract(vUv.y * 12.0 + time * 0.1));
          vec3 col = mix(color1, color2, stripe);
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.5);
          col += fresnel * 0.2;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    material.uniforms.time.value = t;
    ref.current.rotation.y = t * speed * 0.15;
    ref.current.position.y = initialPos[1] + Math.sin(t * speed * 0.3) * 0.25;
  });

  return (
    <mesh ref={ref} position={position} material={material}>
      <sphereGeometry args={[size, 32, 32]} />
    </mesh>
  );
}

function FloatingTorus({ position, size, tubeSize, color, speed }: {
  position: [number, number, number];
  size: number;
  tubeSize: number;
  color: string;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialPos = useMemo(() => [...position], [position]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * speed * 0.2;
    ref.current.rotation.z = t * speed * 0.1;
    ref.current.position.y = initialPos[1] + Math.sin(t * speed * 0.4) * 0.2;
  });

  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[size, tubeSize, 16, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.6}
      />
    </mesh>
  );
}

function DottedSphere({ position, size, speed }: {
  position: [number, number, number];
  size: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialPos = useMemo(() => [...position], [position]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color('#6855c9') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float dotPattern = step(0.4, sin(vUv.x * 40.0) * sin(vUv.y * 40.0));
          vec3 baseColor = color1 * 0.7;
          vec3 dotColor = color1 * 1.2;
          vec3 col = mix(baseColor, dotColor, dotPattern * 0.5);
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          col += vec3(0.3, 0.2, 0.5) * fresnel;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    material.uniforms.time.value = t;
    ref.current.rotation.y = t * speed * 0.1;
    ref.current.rotation.x = Math.sin(t * speed * 0.2) * 0.3;
    ref.current.position.y = initialPos[1] + Math.cos(t * speed * 0.35) * 0.2;
  });

  return (
    <mesh ref={ref} position={position} material={material}>
      <sphereGeometry args={[size, 32, 32]} />
    </mesh>
  );
}

export default function GeometricShapes() {
  return (
    <group position={[1, 0, 0]}>
      {/* Large dark cube — hero element */}
      <FloatingCube
        position={[0.5, 0.2, -1]}
        size={2.2}
        color="#2a1f5e"
        speed={0.6}
        rotationAxis={[0.3, 0.7, 0.2]}
      />
      
      {/* Medium light cube */}
      <FloatingCube
        position={[2.5, -0.5, 0.5]}
        size={1.4}
        color="#7c6dd8"
        speed={0.8}
        rotationAxis={[0.5, 0.3, 0.6]}
      />

      {/* Small accent cube */}
      <FloatingCube
        position={[-1.5, -1.8, 1]}
        size={0.6}
        color="#9b8ce8"
        speed={1.2}
        rotationAxis={[0.7, 0.5, 0.3]}
      />

      {/* Striped sphere (large) */}
      <StripedSphere
        position={[2, 1.5, -0.5]}
        size={1.0}
        speed={0.7}
      />

      {/* Dotted sphere */}
      <DottedSphere
        position={[-0.8, 1.2, 0.8]}
        size={0.7}
        speed={0.9}
      />

      {/* Small floating spheres */}
      <FloatingSphere position={[-2, -0.3, 0.5]} size={0.25} color="#8b7bd8" speed={1.5} />
      <FloatingSphere position={[3.2, 0.8, -0.3]} size={0.18} color="#a78bfa" speed={1.8} />
      <FloatingSphere position={[0.2, -2, 0.8]} size={0.15} color="#6855c9" speed={2.0} />
      <FloatingSphere position={[-1.5, 2, -0.5]} size={0.2} color="#c4b5fd" speed={1.3} />
      <FloatingSphere position={[2.8, -1.5, 0.3]} size={0.12} color="#a78bfa" speed={1.6} />

      {/* Torus rings */}
      <FloatingTorus
        position={[-1, -0.5, -0.5]}
        size={0.8}
        tubeSize={0.12}
        color="#7c6dd8"
        speed={0.5}
      />
      <FloatingTorus
        position={[1.5, -1.2, 0.3]}
        size={0.5}
        tubeSize={0.08}
        color="#9b8ce8"
        speed={0.7}
      />

      {/* Platform / large disc underneath */}
      <mesh position={[0.5, -2.5, -0.5]} rotation={[-Math.PI * 0.1, 0, 0.1]}>
        <cylinderGeometry args={[3, 3, 0.08, 32]} />
        <meshStandardMaterial
          color="#1a1245"
          roughness={0.5}
          metalness={0.4}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}
