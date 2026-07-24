import { type ReactNode, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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

/**
 * Mobile stand-in for web `.sk-outline` / `.cy-card`:
 * layered slightly-offset borders ≈ pastel pencil stroke.
 */
export function OutlineBox({
  children,
  style,
  contentStyle,
  fill = hompy.paper,
  stroke = hompy.pencilBold,
  size = 'md',
}: OutlineBoxProps) {
  const weight = size === 'lg' ? 2.75 : size === 'sm' ? 1.5 : 2;
  const radius = size === 'lg' ? hompy.radiusLg : size === 'sm' ? hompy.radiusSm : hompy.radiusMd;

  return (
    <View style={[{ backgroundColor: fill, borderRadius: radius, overflow: 'visible' }, style]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: weight,
            borderColor: stroke,
            opacity: 0.92,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: weight,
            borderColor: stroke,
            opacity: 0.4,
            transform: [{ translateX: 1 }, { translateY: -0.8 }],
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: Math.max(1, weight - 0.5),
            borderColor: stroke,
            opacity: 0.28,
            transform: [{ translateX: -0.9 }, { translateY: 1 }],
          },
        ]}
      />
      <View style={[{ borderRadius: radius, overflow: 'hidden' }, contentStyle]}>{children}</View>
    </View>
  );
}

/** Dotted paper fill like web `.cy-canvas` background-image. */
export function DotPaper({ style }: { style?: StyleProp<ViewStyle> }) {
  const dots = useMemo(() => {
    const out: { key: string; left: number; top: number }[] = [];
    const stepX = 12;
    const stepY = 11;
    // Cover a tall scrollable canvas without depending on layout measure.
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
