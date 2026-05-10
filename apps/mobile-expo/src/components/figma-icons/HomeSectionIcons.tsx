import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { color: string; size?: number };

/** Needs Attention — leading circle + exclamation (16×16). */
export function HomeNeedsAttentionIcon({ color: stroke, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="8" cy="8" r="7.5" stroke={stroke} strokeWidth={1.2} />
      <Path
        d="M8 4.5V9"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M8 11.25H8.01"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Jump back in — clock (16×16). */
export function HomeJumpBackInIcon({ color: stroke, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="8" cy="8" r="6.75" stroke={stroke} strokeWidth={1.2} />
      <Path
        d="M8 4.75V8L10.5 9.25"
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
