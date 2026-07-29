import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export type SceneVariant = 'friendWindow' | 'myDesk';

/**
 * Fixture atmosphere art — not photos, but readable places.
 * Friend = warm afternoon window. Mine = cool morning desk.
 */
export function SceneArt({ variant }: { variant: SceneVariant }) {
  return (
    <View style={styles.fill} pointerEvents="none">
      {variant === 'friendWindow' ? <FriendWindowScene /> : <MyDeskScene />}
    </View>
  );
}

function FriendWindowScene() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 390" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="fwRoom" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4A2C38" />
          <Stop offset="0.45" stopColor="#2E1A24" />
          <Stop offset="1" stopColor="#1A1016" />
        </LinearGradient>
        <LinearGradient id="fwSky" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F3C9A0" />
          <Stop offset="0.55" stopColor="#E8A07A" />
          <Stop offset="1" stopColor="#C46B6B" />
        </LinearGradient>
        <LinearGradient id="fwBeam" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFD9B0" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#FFD9B0" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="fwDesk" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5A3A32" />
          <Stop offset="1" stopColor="#2A1814" />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="390" fill="url(#fwRoom)" />
      {/* window frame */}
      <Rect x="36" y="42" width="210" height="236" rx="10" fill="#1C1218" />
      <Rect x="48" y="54" width="186" height="212" fill="url(#fwSky)" />
      {/* mullions */}
      <Rect x="136" y="54" width="10" height="212" fill="#2A1A20" opacity="0.85" />
      <Rect x="48" y="152" width="186" height="10" fill="#2A1A20" opacity="0.85" />
      {/* soft curtain */}
      <Path
        d="M36 42 C58 88 52 170 40 278 L36 278 Z"
        fill="#E8B4A0"
        opacity="0.28"
      />
      {/* light beam onto desk */}
      <Path d="M120 266 L292 330 L330 390 L90 390 Z" fill="url(#fwBeam)" />
      {/* desk */}
      <Rect x="0" y="300" width="360" height="90" fill="url(#fwDesk)" />
      <Ellipse cx="250" cy="318" rx="78" ry="18" fill="#F0C8A0" opacity="0.22" />
      {/* cup / object on desk */}
      <Rect x="228" y="292" width="28" height="34" rx="6" fill="#D4A090" opacity="0.75" />
      <Ellipse cx="242" cy="292" rx="14" ry="5" fill="#E8C4B0" opacity="0.8" />
      {/* dust motes */}
      <Circle cx="168" cy="120" r="1.6" fill="#FFF2E0" opacity="0.55" />
      <Circle cx="198" cy="168" r="1.2" fill="#FFF2E0" opacity="0.4" />
      <Circle cx="112" cy="200" r="1.4" fill="#FFF2E0" opacity="0.45" />
      <Circle cx="220" cy="98" r="1.1" fill="#FFF2E0" opacity="0.35" />
    </Svg>
  );
}

function MyDeskScene() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 390" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="mdRoom" x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor="#243848" />
          <Stop offset="0.5" stopColor="#152834" />
          <Stop offset="1" stopColor="#0C161E" />
        </LinearGradient>
        <LinearGradient id="mdWindow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#9FCBD8" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#9FCBD8" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="mdDesk" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2A4050" />
          <Stop offset="1" stopColor="#142028" />
        </LinearGradient>
        <LinearGradient id="mdPaper" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EAF3F6" />
          <Stop offset="1" stopColor="#C5D8E0" />
        </LinearGradient>
        <LinearGradient id="mdLamp" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#F7E7C8" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#F7E7C8" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="390" fill="url(#mdRoom)" />
      {/* side window wash */}
      <Rect x="0" y="0" width="120" height="390" fill="url(#mdWindow)" />
      <Rect x="18" y="48" width="8" height="200" rx="3" fill="#7FAFBE" opacity="0.35" />
      <Rect x="34" y="48" width="8" height="200" rx="3" fill="#7FAFBE" opacity="0.22" />
      {/* desk plane */}
      <Path d="M0 250 L360 210 L360 390 L0 390 Z" fill="url(#mdDesk)" />
      {/* notebook */}
      <Path
        d="M88 268 L230 248 L246 318 L104 340 Z"
        fill="url(#mdPaper)"
        opacity="0.92"
      />
      <Path d="M158 258 L172 330" stroke="#8AA4B0" strokeWidth="2" opacity="0.55" />
      <Path
        d="M112 290 Q150 286 188 282"
        stroke="#5A7280"
        strokeWidth="1.5"
        opacity="0.35"
        fill="none"
      />
      <Path
        d="M116 304 Q156 300 196 296"
        stroke="#5A7280"
        strokeWidth="1.5"
        opacity="0.28"
        fill="none"
      />
      {/* pencil */}
      <Path
        d="M250 300 L310 278"
        stroke="#D46A5C"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* lamp */}
      <Circle cx="292" cy="168" r="46" fill="url(#mdLamp)" />
      <Rect x="284" y="168" width="16" height="52" rx="4" fill="#C8D8E0" opacity="0.55" />
      <Ellipse cx="292" cy="168" rx="28" ry="12" fill="#F4EFE6" opacity="0.55" />
      {/* cool dust */}
      <Circle cx="70" cy="120" r="1.4" fill="#D7EEF4" opacity="0.45" />
      <Circle cx="140" cy="88" r="1.1" fill="#D7EEF4" opacity="0.35" />
      <Circle cx="210" cy="140" r="1.3" fill="#D7EEF4" opacity="0.3" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
