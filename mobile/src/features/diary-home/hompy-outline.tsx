import { type ReactNode, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { hompy } from '@/constants/hompy-theme';

type OutlineSize = 'lg' | 'md' | 'sm';

type OutlineBoxProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Fill behind content (pastel box tint or paper) */
  fill?: string;
  /** Pencil stroke color */
  stroke?: string;
  size?: OutlineSize;
};

type Radii = { tl: number; tr: number; br: number; bl: number };

/** Asymmetric sketch radii — matches web `--radius-sketch-*`. */
function radiiFor(size: OutlineSize): Radii {
  if (size === 'lg') return { tl: 24, tr: 10, br: 22, bl: 14 };
  if (size === 'sm') return { tl: 12, tr: 5, br: 10, bl: 6 };
  return { tl: 18, tr: 8, br: 16, bl: 10 };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function noise(seed: number, i: number): number {
  const x = Math.sin(seed * 0.001 + i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Hand-drawn (pencil) rounded-rect path — web `.sk-outline` + feTurbulence feel.
 * Walks the perimeter with small perpendicular wobble.
 */
function buildSketchPath(
  width: number,
  height: number,
  radii: Radii,
  weight: number,
  seed: number,
): string {
  const inset = weight * 0.55;
  const w = Math.max(8, width - inset * 2);
  const h = Math.max(8, height - inset * 2);
  const x0 = inset;
  const y0 = inset;

  const tl = Math.min(radii.tl, w / 2, h / 2);
  const tr = Math.min(radii.tr, w / 2, h / 2);
  const br = Math.min(radii.br, w / 2, h / 2);
  const bl = Math.min(radii.bl, w / 2, h / 2);

  // Perimeter polyline samples (clockwise from top-left after corner).
  type Pt = { x: number; y: number };
  const pts: Pt[] = [];

  const pushLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    samples: number,
    baseIndex: number,
  ) => {
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      pts.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
      });
      // tag index via unused field — wobble applied later with baseIndex+i
      void baseIndex;
    }
  };

  const pushArc = (
    cx: number,
    cy: number,
    r: number,
    a0: number,
    a1: number,
    samples: number,
  ) => {
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const a = a0 + (a1 - a0) * t;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };

  // Top edge L→R
  pushLine(x0 + tl, y0, x0 + w - tr, y0, 14, 0);
  // TR corner
  pushArc(x0 + w - tr, y0 + tr, tr, -Math.PI / 2, 0, 6);
  // Right edge T→B
  pushLine(x0 + w, y0 + tr, x0 + w, y0 + h - br, 16, 20);
  // BR corner
  pushArc(x0 + w - br, y0 + h - br, br, 0, Math.PI / 2, 6);
  // Bottom edge R→L
  pushLine(x0 + w - br, y0 + h, x0 + bl, y0 + h, 14, 40);
  // BL corner
  pushArc(x0 + bl, y0 + h - bl, bl, Math.PI / 2, Math.PI, 6);
  // Left edge B→T
  pushLine(x0, y0 + h - bl, x0, y0 + tl, 16, 60);
  // TL corner
  pushArc(x0 + tl, y0 + tl, tl, Math.PI, (Math.PI * 3) / 2, 6);

  // Deduplicate near-identical consecutive points, then wobble.
  // Stronger amplitude so pastel strokes read as pencil, not hairline CSS.
  const amp = Math.min(2.6, 0.95 + weight * 0.55);
  const wobble: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length]!;
    const curr = pts[i]!;
    const next = pts[(i + 1) % pts.length]!;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    // outward normal (clockwise path → right-hand inward; flip for outward)
    const nx = dy / len;
    const ny = -dx / len;
    const n1 = noise(seed, i);
    const n2 = noise(seed ^ 0x9e3779b9, i * 3);
    const offset = (n1 - 0.5) * 2 * amp + (n2 - 0.5) * amp * 0.45;
    wobble.push({
      x: curr.x + nx * offset,
      y: curr.y + ny * offset,
    });
  }

  let d = `M ${wobble[0]!.x.toFixed(2)} ${wobble[0]!.y.toFixed(2)}`;
  for (let i = 1; i < wobble.length; i++) {
    const p = wobble[i]!;
    // light quadratic smoothing every other point
    if (i % 2 === 1 && i + 1 < wobble.length) {
      const n = wobble[i + 1]!;
      d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${((p.x + n.x) / 2).toFixed(2)} ${((p.y + n.y) / 2).toFixed(2)}`;
      i++;
    } else {
      d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }
  }
  d += ' Z';
  return d;
}

function SketchStroke({
  width,
  height,
  stroke,
  weight,
  size,
  seedKey,
}: {
  width: number;
  height: number;
  stroke: string;
  weight: number;
  size: OutlineSize;
  seedKey: string;
}) {
  const radii = radiiFor(size);
  const seed = hashSeed(seedKey);
  const d = useMemo(
    () => buildSketchPath(width, height, radii, weight, seed),
    [width, height, radii.tl, radii.tr, radii.br, radii.bl, weight, seed],
  );
  // Second fainter pass for pencil grain (like layered graphite).
  const d2 = useMemo(
    () => buildSketchPath(width, height, radii, weight * 0.85, seed ^ 0x85ebca6b),
    [width, height, radii.tl, radii.tr, radii.br, radii.bl, weight, seed],
  );

  if (width < 4 || height < 4) return null;

  // Graphite under-stroke so light pastel inks still read as pencil.
  const under = hompy.pencilBold;

  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
    >
      <Path
        d={d2}
        stroke={under}
        strokeWidth={weight + 0.7}
        strokeOpacity={0.22}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={d2}
        stroke={stroke}
        strokeWidth={Math.max(1.2, weight - 0.2)}
        strokeOpacity={0.45}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={weight + 0.35}
        strokeOpacity={0.95}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Mobile stand-in for web `.sk-outline` / `.cy-card`:
 * hand-drawn pencil stroke (not a flat CSS border).
 */
export function OutlineBox({
  children,
  style,
  contentStyle,
  fill = hompy.paper,
  stroke = hompy.pencilBold,
  size = 'md',
}: OutlineBoxProps) {
  const weight = size === 'lg' ? 3.1 : size === 'sm' ? 1.85 : 2.45;
  const radii = radiiFor(size);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: fill,
          // Asymmetric radius approximates sketch corners even for fill clip.
          borderTopLeftRadius: radii.tl,
          borderTopRightRadius: radii.tr,
          borderBottomRightRadius: radii.br,
          borderBottomLeftRadius: radii.bl,
          overflow: 'visible',
        },
        style,
      ]}
    >
      {box.w > 0 && box.h > 0 ? (
        <SketchStroke
          width={box.w}
          height={box.h}
          stroke={stroke}
          weight={weight}
          size={size}
          seedKey={`${size}-${stroke}-${Math.round(box.w)}x${Math.round(box.h)}`}
        />
      ) : null}
      <View
        style={[
          {
            borderTopLeftRadius: radii.tl,
            borderTopRightRadius: radii.tr,
            borderBottomRightRadius: radii.br,
            borderBottomLeftRadius: radii.bl,
            overflow: 'hidden',
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** Dotted paper fill like web `.cy-canvas` background-image. */
export function DotPaper({ style }: { style?: StyleProp<ViewStyle> }) {
  const dots = useMemo(() => {
    const out: { key: string; left: number; top: number }[] = [];
    const stepX = 12;
    const stepY = 11;
    for (let y = 6; y < 900; y += stepY) {
      for (let x = 6; x < 420; x += stepX) {
        out.push({ key: `${x}-${y}`, left: x, top: y });
      }
    }
    return out;
  }, []);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {dots.map((d) => (
        <View
          key={d.key}
          style={{
            position: 'absolute',
            left: d.left,
            top: d.top,
            width: 1.6,
            height: 1.6,
            borderRadius: 1,
            backgroundColor: 'rgba(139,122,158,0.14)',
          }}
        />
      ))}
    </View>
  );
}
