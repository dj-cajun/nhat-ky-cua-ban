import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Group, Mesh } from 'three';
import type { CircleSummary, Profile } from '@/types/domain';
import { INTRO_HANDOFF } from './handoff';
import { resolveHandoffSphere3D, resolveSettleScale } from './handoff-layout';
import { FallbackUniverse } from './fallback-universe';

export type UniverseSceneProps = {
  profile: Profile;
  circles: CircleSummary[];
  revealProfile: boolean;
  revealPlanets: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  /** Force 2D glow fallback (low-end / settings). */
  forceFallback?: boolean;
  /** Shrink from intro size → home size after handoff. Off for tab-return. */
  animateSettle?: boolean;
};

const CAMERA_Z = 4.2;
const CAMERA_FOV = 42;

/**
 * 3D My Universe: match intro cover size, then settle-shrink to home size.
 */
export function UniverseScene3D(props: UniverseSceneProps) {
  if (props.forceFallback) {
    return <FallbackUniverse {...props} />;
  }

  return (
    <GlSafeFallback {...props}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: INTRO_HANDOFF.spaceBg }]}>
        <Canvas
          camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
          style={StyleSheet.absoluteFill}
        >
          <color attach="background" args={[INTRO_HANDOFF.spaceBg]} />
          <ambientLight intensity={0.35} />
          <pointLight position={[0, 0, 2.5]} intensity={1.4} color={INTRO_HANDOFF.sphere.glow} />
          <pointLight position={[-2, 1.5, 1]} intensity={0.35} color="#9BB7FF" />
          <Suspense fallback={null}>
            <StarField3D />
            <UserSphere
              revealProfile={props.revealProfile}
              animateSettle={props.animateSettle !== false}
              onPress={props.onPressSelf}
            />
            <CirclePlanets
              circles={props.circles}
              reveal={props.revealPlanets}
              onPressCircle={props.onPressCircle}
            />
          </Suspense>
        </Canvas>
      </View>
    </GlSafeFallback>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function UserSphere({
  revealProfile,
  animateSettle,
  onPress,
}: {
  revealProfile: boolean;
  animateSettle: boolean;
  onPress: () => void;
}) {
  const mesh = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const badge = useRef<Mesh>(null);
  const settleT = useRef(revealProfile && !animateSettle ? 1 : 0);
  const { size } = useThree();
  const color = useMemo(() => hexToRgb(INTRO_HANDOFF.sphere.color), []);
  const glowColor = useMemo(() => hexToRgb(INTRO_HANDOFF.sphere.glow), []);
  const { radius, y } = useMemo(
    () =>
      resolveHandoffSphere3D({
        viewportWidth: size.width,
        viewportHeight: size.height,
        cameraZ: CAMERA_Z,
        fovDeg: CAMERA_FOV,
      }),
    [size.width, size.height],
  );
  const settleScale = useMemo(
    () => resolveSettleScale(size.width, size.height),
    [size.width, size.height],
  );

  useEffect(() => {
    if (revealProfile) {
      if (!animateSettle) settleT.current = 1;
    } else {
      settleT.current = 0;
    }
  }, [revealProfile, animateSettle]);

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    if (revealProfile && animateSettle && settleT.current < 1) {
      settleT.current = Math.min(
        1,
        settleT.current + dt / Math.max(INTRO_HANDOFF.settleDurationSec, 0.05),
      );
    }
    const s = 1 + (settleScale - 1) * easeOutCubic(settleT.current);
    const bob = Math.sin(t * 0.7) * 0.04 * s;

    if (mesh.current) {
      mesh.current.position.y = y + bob;
      mesh.current.rotation.y = t * 0.12;
      mesh.current.scale.setScalar(s);
    }
    if (glow.current) {
      const pulse = 1.08 + Math.sin(t * 1.4) * 0.03;
      glow.current.position.y = y + bob;
      glow.current.scale.setScalar(pulse * s);
    }
    if (badge.current) {
      badge.current.position.set(0, y + bob, radius * s * 0.92);
      badge.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <mesh ref={glow} position={[0, y, 0]} scale={1.12}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh
        ref={mesh}
        position={[0, y, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPress();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          onPress();
        }}
      >
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={glowColor}
          emissiveIntensity={revealProfile ? 0.45 : 0.55}
          metalness={0.35}
          roughness={0.28}
          transparent
          opacity={0.92}
        />
      </mesh>
      {revealProfile ? (
        <mesh ref={badge} position={[0, y, radius * 0.92]}>
          <circleGeometry args={[radius * 0.42, 32]} />
          <meshBasicMaterial color="#1a140e" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}

function CirclePlanets({
  circles,
  reveal,
  onPressCircle,
}: {
  circles: CircleSummary[];
  reveal: boolean;
  onPressCircle: (id: string) => void;
}) {
  const group = useRef<Group>(null);
  const { size } = useThree();
  const { radius: introR, y: selfY } = useMemo(
    () =>
      resolveHandoffSphere3D({
        viewportWidth: size.width,
        viewportHeight: size.height,
        cameraZ: CAMERA_Z,
        fovDeg: CAMERA_FOV,
      }),
    [size.width, size.height],
  );
  const settleScale = useMemo(
    () => resolveSettleScale(size.width, size.height),
    [size.width, size.height],
  );
  const selfR = introR * settleScale;
  const n = Math.max(circles.length, 1);

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  if (!reveal || circles.length === 0) return null;

  const orbit = Math.max(selfR * 2.45, 0.85);

  return (
    <group ref={group} position={[0, selfY, 0]}>
      {circles.map((c, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const o = orbit + (i % 3) * selfR * 0.28;
        const x = Math.cos(angle) * o;
        const z = Math.sin(angle) * o;
        const y = Math.sin(i * 1.7) * selfR * 0.35;
        const rgb = hexToRgb(c.color || '#7C9A8E');
        const pr = Math.max(selfR * 0.34, 0.1);
        return (
          <mesh
            key={c.id}
            position={[x, y, z]}
            onClick={(e) => {
              e.stopPropagation();
              onPressCircle(c.id);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onPressCircle(c.id);
            }}
          >
            <sphereGeometry args={[pr, 24, 24]} />
            <meshStandardMaterial color={rgb} emissive={rgb} emissiveIntensity={0.25} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function StarField3D() {
  const positions = useMemo(() => {
    const arr = new Float32Array(180);
    for (let i = 0; i < 60; i++) {
      arr[i * 3] = (Math.sin(i * 12.1) * 0.5 + 0.5) * 10 - 5;
      arr[i * 3 + 1] = (Math.cos(i * 7.3) * 0.5 + 0.5) * 8 - 4;
      arr[i * 3 + 2] = -2 - (i % 5) * 0.6;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#ffffff" transparent opacity={0.7} />
    </points>
  );
}

class GlSafeFallback extends Component<
  UniverseSceneProps & { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.setState({ failed: true });
  }

  render() {
    if (this.state.failed) {
      const { children: _c, forceFallback: _f, ...rest } = this.props;
      return <FallbackUniverse {...rest} />;
    }
    return this.props.children;
  }
}
