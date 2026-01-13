import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Stars, Float, MeshDistortMaterial, Points, PointMaterial, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { AtomType, ATOM_CONFIGS, WaveParams } from '../types';
import { useThree } from '@react-three/fiber';

// Correctly extend React.JSX IntrinsicElements to include Three.js elements supported by @react-three/fiber.
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

const Nucleus = ({ protons, neutrons }: { protons: number, neutrons: number }) => {
  const groupRef = useRef<THREE.Group>(null!);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  const particles = useMemo(() => {
    const pts = [];
    const total = protons + neutrons;
    for (let i = 0; i < total; i++) {
      const isProton = i < protons;
      const phi = Math.acos(-1 + (2 * i) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      const radius = 0.25;
      pts.push({
        pos: new THREE.Vector3(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        ),
        color: isProton ? '#ef4444' : '#6b7280'
      });
    }
    return pts;
  }, [protons, neutrons]);

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      ))}
      <pointLight intensity={2} distance={3} color="#ffffff" />
    </group>
  );
};

interface ElectronProps {
  radius: number;
  speed: number;
  color: string;
  tiltX?: number;
  tiltZ?: number;
  startOffset?: number;
  motionFactor?: number;
  glowFactor?: number;
}

// Fixed the Electron component type by using React.FC to allow for the standard 'key' prop during mapping.
const Electron: React.FC<ElectronProps> = ({ radius, speed, color, tiltX = 0, tiltZ = 0, startOffset = 0, motionFactor = 1, glowFactor = 1 }) => {
  const meshRef = useRef<THREE.Group>(null!);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const factor = Math.max(motionFactor, 0.05);
    const t = state.clock.getElapsedTime() * speed * factor + startOffset;
    const lx = Math.sin(t) * radius;
    const lz = Math.cos(t) * radius;

    const pos = new THREE.Vector3(lx, 0, lz);
    pos.applyEuler(new THREE.Euler(tiltX, 0, tiltZ));

    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) {
      meshRef.current.position.set(0, 0, 0);
      return;
    }

    meshRef.current.position.copy(pos);
  });

  return (
    <group>
      <group ref={meshRef}>
        <Trail
          width={1.2}
          length={Math.max(1, 9 * (1 + (1 - motionFactor) * 0.3))}
          color={new THREE.Color(color)}
          attenuation={(t) => Math.max(0, Math.pow(t, 1.25))}
          decay={0.85}
        >
          <mesh>
            <sphereGeometry args={[0.1, 24, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4 * glowFactor} toneMapped={false} />
          </mesh>
        </Trail>
        <pointLight intensity={2.4 * glowFactor} distance={4} color={color} />
      </group>
    </group>
  );
};

const QuantumSurface = ({ params, active }: { params: WaveParams, active: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geoRef = useRef<THREE.PlaneGeometry>(null!);

  const size = 20;
  const segments = 80;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const posAttr = geoRef.current.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      
      const d1 = Math.sqrt(Math.pow(x - 2, 2) + Math.pow(y - 2, 2));
      const d2 = Math.sqrt(Math.pow(x + 2, 2) + Math.pow(y + 2, 2));
      const d3 = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
      
      const z1 = Math.sin(d1 * 2.0 / params.wavelength - time * 2) / (d1 + 1);
      const z2 = Math.sin(d2 * 2.0 / params.wavelength - time * 2) / (d2 + 1);
      const z3 = Math.sin(d3 * 1.5 / params.wavelength - time * 3) / (d3 + 1);
      
      const height = (z1 + z2 + z3) * params.amplitude * (active ? 2.5 : 1.2);
      posAttr.setZ(i, height);
    }
    posAttr.needsUpdate = true;
  });

  const shader = useMemo(() => ({
    uniforms: {
      uActive: { value: 0 },
    },
    vertexShader: `
      varying float vZ;
      void main() {
        vZ = position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vZ;
      void main() {
        vec3 colorA = vec3(0.8, 0.1, 0.1); 
        vec3 colorB = vec3(0.1, 0.8, 0.2); 
        vec3 colorC = vec3(0.1, 0.3, 0.9); 
        vec3 colorD = vec3(1.0, 1.0, 1.0); 

        float z = vZ * 0.5 + 0.5; 
        vec3 color;
        if (z < 0.33) {
          color = mix(colorA, colorB, z * 3.0);
        } else if (z < 0.66) {
          color = mix(colorB, colorC, (z - 0.33) * 3.0);
        } else {
          color = mix(colorC, colorD, (z - 0.66) * 3.0);
        }
        
        gl_FragColor = vec4(color, 0.6);
      }
    `
  }), []);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
      <mesh ref={meshRef}>
        <planeGeometry ref={geoRef} args={[size, size, segments, segments]} />
        <shaderMaterial 
          {...shader} 
          transparent 
          side={THREE.DoubleSide} 
          wireframe={!active}
          wireframeLinewidth={0.5}
        />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color="#000000" opacity={0.4} transparent />
      </mesh>
    </group>
  );
};

const ProbabilityWave = ({ active, params, comfortMode }: { active: boolean, params: WaveParams, comfortMode: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    if (meshRef.current) {
      const factor = comfortMode ? 0.6 : 1;
      meshRef.current.rotation.y += 0.01 * factor;
      const s = 1 + Math.sin(state.clock.getElapsedTime() * 2 * factor) * 0.05 * params.amplitude;
      meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3.2, 64, 64]} />
      <MeshDistortMaterial
        color={active ? "#4ade80" : "#3b82f6"}
        transparent
        opacity={active ? 0.45 : 0.06}
        distort={0.45 * params.amplitude}
        speed={2.2 * params.wavelength}
        roughness={0}
        emissive={active ? "#4ade80" : "#3b82f6"}
        emissiveIntensity={active ? 0.5 : 0.1}
      />
    </mesh>
  );
};

const BackgroundField = ({ params, comfortMode }: { params: WaveParams; comfortMode: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const [positions] = useMemo(() => {
    const pos = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 35;
    }
    return [pos];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const factor = comfortMode ? 0.5 : 1;
      pointsRef.current.rotation.y += 0.0004 * params.wavelength * factor;
      pointsRef.current.rotation.z += 0.0001 * params.amplitude * factor;
      pointsRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.25 * factor) * 0.4 * params.amplitude;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#60a5fa"
        size={0.035}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.12}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

const Ufo = ({ radius = 18, speed = 0.1, height = 6, phase = 0, color = "#22d3ee", motionFactor = 1 }) => {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime() * speed * motionFactor + phase;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t * 1.2) * radius * 0.7;
    const y = height + Math.sin(t * 2) * 1.2;
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y = t * 2;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <torusGeometry args={[0.6, 0.15, 16, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} roughness={0.3} metalness={0.7} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#e0f2fe" emissive={color} emissiveIntensity={1.2} roughness={0} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={4} />
    </group>
  );
};

interface AtomSceneProps {
  atomType: AtomType;
  isCollapsing: boolean;
  params: WaveParams;
  comfortMode: boolean;
}

const ComfortBreath = ({ comfortMode }: { comfortMode: boolean }) => {
  const { camera } = useThree();
  const base = React.useRef(camera.position.clone());

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Smooth sinusoidal breath: 0..1
    const breath = 0.5 * (Math.sin((t * (2 * Math.PI)) / 10 - Math.PI / 2) + 1); // ~10s cycle
    const zoomFactor = comfortMode ? 1 - 0.2 * breath : 1;
    const target = base.current.clone().multiplyScalar(zoomFactor);
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) return;
    camera.position.lerp(target, 0.08);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

const AtomScene = ({ atomType, isCollapsing, params, comfortMode }: AtomSceneProps) => {
  const config = useMemo(() => ATOM_CONFIGS[atomType], [atomType]);
  const motionFactor = comfortMode ? 0.6 : 1;
  const glowFactor = comfortMode ? 0.85 : 1;

  const orbitalConfigs = useMemo(() => {
    return [
      { tiltX: Math.PI / 4, tiltZ: 0, startOffset: 0 },
      { tiltX: -Math.PI / 4, tiltZ: Math.PI / 3, startOffset: 2.1 },
      { tiltX: 0.1, tiltZ: Math.PI / 1.8, startOffset: 4.5 },
    ];
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [10, 6, 10], fov: 38 }} gl={{ antialias: true }}>
        <ComfortBreath comfortMode={comfortMode} />
        <color attach="background" args={["#020104"]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[15, 15, 15]} intensity={3} />
        <Stars radius={120} depth={60} count={7000} factor={7} saturation={0} fade speed={comfortMode ? 1 : 1.8} />
        <Ufo radius={19} speed={0.12} height={7} phase={0} color="#22d3ee" motionFactor={motionFactor} />
        <Ufo radius={16} speed={0.08} height={9} phase={1.8} color="#a855f7" motionFactor={motionFactor} />
        
        <BackgroundField params={params} comfortMode={comfortMode} />
        <QuantumSurface params={params} active={isCollapsing} />

        <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.4}>
          <group scale={isCollapsing ? 1.45 : 1}>
            <Nucleus protons={config.protons} neutrons={config.neutrons} />
            
            {config.electrons.map((e, i) => {
              const orbital = orbitalConfigs[i % orbitalConfigs.length];
              return (
                <Electron 
                  key={i} 
                  radius={e.radius} 
                  speed={e.speed} 
                  tiltX={orbital.tiltX}
                  tiltZ={orbital.tiltZ}
                  startOffset={orbital.startOffset}
                  color={i === 2 ? "#fbbf24" : i === 1 ? "#34d399" : "#60a5fa"} 
                  motionFactor={motionFactor}
                  glowFactor={glowFactor}
                />
              );
            })}
            
            <ProbabilityWave active={isCollapsing} params={params} comfortMode={comfortMode} />
          </group>
        </Float>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={8} 
          maxDistance={30}
          autoRotate={!isCollapsing}
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
};

export default AtomScene;
