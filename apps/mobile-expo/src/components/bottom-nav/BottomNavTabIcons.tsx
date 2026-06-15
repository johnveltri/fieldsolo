import Svg, { Path } from 'react-native-svg';

/**
 * Bottom tab icons — paths from Figma `225:12144` / `225:12150` / `225:12156` (FieldSolo bottom nav).
 * Stroke colors are passed in so inactive tabs use `Foundation/Text/Primary` and the active tab uses `Brand/Primary`.
 */

const STROKE = 2;

type IconProps = { color: string };

/** `bottom-nav-tab-icon-home` — 26×27 */
export function BottomNavIconHome({ color }: IconProps) {
  return (
    <Svg width={26} height={27} viewBox="0 0 26 27" fill="none">
      <Path
        d="M16 23V15C16 14.7348 15.8946 14.4804 15.7071 14.2929C15.5196 14.1054 15.2652 14 15 14H11C10.7348 14 10.4804 14.1054 10.2929 14.2929C10.1054 14.4804 10 14.7348 10 15V23M4 11.9995C3.99993 11.7085 4.06333 11.4211 4.18579 11.1572C4.30824 10.8933 4.4868 10.6593 4.709 10.4715L11.709 4.47248C12.07 4.16739 12.5274 4 13 4C13.4726 4 13.93 4.16739 14.291 4.47248L21.291 10.4715C21.5132 10.6593 21.6918 10.8933 21.8142 11.1572C21.9367 11.4211 22.0001 11.7085 22 11.9995V20.9995C22 21.5299 21.7893 22.0386 21.4142 22.4137C21.0391 22.7888 20.5304 22.9995 20 22.9995H6C5.46957 22.9995 4.96086 22.7888 4.58579 22.4137C4.21071 22.0386 4 21.5299 4 20.9995V11.9995Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** `bottom-nav-tab-icon-jobs` — 28×26 */
export function BottomNavIconJobs({ color }: IconProps) {
  return (
    <Svg width={28} height={26} viewBox="0 0 28 26" fill="none">
      <Path
        d="M18 22V6C18 5.46957 17.7893 4.96086 17.4142 4.58579C17.0391 4.21071 16.5304 4 16 4H12C11.4696 4 10.9609 4.21071 10.5858 4.58579C10.2107 4.96086 10 5.46957 10 6V22M6 8H22C23.1046 8 24 8.89543 24 10V20C24 21.1046 23.1046 22 22 22H6C4.89543 22 4 21.1046 4 20V10C4 8.89543 4.89543 8 6 8Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** `bottom-nav-tab-icon-earnings` — 20×24 */
export function BottomNavIconEarnings({ color }: IconProps) {
  return (
    <Svg width={20} height={24} viewBox="0 0 20 24" fill="none">
      <Path
        d="M10 20V10M16 20V4M4 20V16"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
