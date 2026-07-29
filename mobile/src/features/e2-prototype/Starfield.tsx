import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { e2 } from './tokens';

const STARS = [
  [12, 18, 1.2],
  [40, 52, 0.8],
  [78, 24, 1.4],
  [92, 70, 0.9],
  [18, 80, 1.1],
  [55, 12, 0.7],
  [67, 88, 1.0],
  [30, 40, 0.6],
  [85, 45, 1.3],
  [8, 60, 0.8],
  [48, 66, 0.7],
  [72, 16, 1.0],
] as const;

/** Soft static star dust — shared atmosphere across E2 screens. */
export function Starfield({ opacity = 1 }: { opacity?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <View style={styles.hazeA} />
      <View style={styles.hazeB} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {STARS.map(([x, y, r], i) => (
          <Circle
            key={i}
            cx={`${x}%`}
            cy={`${y}%`}
            r={r}
            fill={i % 3 === 0 ? e2.space.star : e2.space.starDim}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  hazeA: {
    position: 'absolute',
    top: '8%',
    left: '-10%',
    width: '70%',
    height: '40%',
    borderRadius: 999,
    backgroundColor: e2.space.dust,
  },
  hazeB: {
    position: 'absolute',
    bottom: '12%',
    right: '-16%',
    width: '80%',
    height: '45%',
    borderRadius: 999,
    backgroundColor: e2.space.dust,
  },
});
