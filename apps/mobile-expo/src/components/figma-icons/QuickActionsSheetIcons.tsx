import Svg, { Path } from 'react-native-svg';

/** Stroke icons from Figma Quick Capture tiles (20×20 viewBox). */
type IconProps = { color: string; size?: number };

/** Start Session tile — Figma `452:2731` / asset `e5c30e6b-714c-45d3-bd77-51dcdc4cb83a`. */
export function QuickCaptureStartSessionIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 5V10L13.3333 11.6667M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39763 18.3333 1.66667 14.6024 1.66667 10C1.66667 5.39763 5.39763 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** New Note tile — Figma `452:2756` / asset `783ba186-c414-4702-a6f0-072c6f39b153`. */
export function QuickCaptureNewNoteIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M11.6667 1.66667V5C11.6667 5.44203 11.8423 5.86595 12.1548 6.17851C12.4674 6.49107 12.8913 6.66667 13.3333 6.66667H16.6667M8.33333 7.5H6.66667M13.3333 10.8333H6.66667M13.3333 14.1667H6.66667M12.5 1.66667H5C4.55797 1.66667 4.13405 1.84226 3.82149 2.15482C3.50893 2.46738 3.33333 2.89131 3.33333 3.33333V16.6667C3.33333 17.1087 3.50893 17.5326 3.82149 17.8452C4.13405 18.1577 4.55797 18.3333 5 18.3333H15C15.442 18.3333 15.866 18.1577 16.1785 17.8452C16.4911 17.5326 16.6667 17.1087 16.6667 16.6667V5.83333L12.5 1.66667Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** New Material tile — Figma `452:2830` / asset `c720ca08-e8ac-47c4-8eed-572b09ac886c`. */
export function QuickCaptureNewMaterialIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12.25 5.25C12.0973 5.40577 12.0118 5.61521 12.0118 5.83333C12.0118 6.05146 12.0973 6.26089 12.25 6.41667L13.5833 7.75C13.7391 7.90269 13.9485 7.98821 14.1667 7.98821C14.3848 7.98821 14.5942 7.90269 14.75 7.75L17.8917 4.60833C18.3107 5.53432 18.4376 6.56603 18.2554 7.56595C18.0732 8.56588 17.5906 9.48654 16.8719 10.2052C16.1532 10.9239 15.2325 11.4065 14.2326 11.5887C13.2327 11.7709 12.201 11.644 11.275 11.225L5.51667 16.9833C5.18515 17.3149 4.73551 17.5011 4.26667 17.5011C3.79783 17.5011 3.34819 17.3149 3.01667 16.9833C2.68515 16.6518 2.4989 16.2022 2.4989 15.7333C2.4989 15.2645 2.68515 14.8149 3.01667 14.4833L8.775 8.725C8.35597 7.79901 8.2291 6.7673 8.41128 5.76738C8.59347 4.76745 9.07607 3.8468 9.79477 3.1281C10.5135 2.40941 11.4341 1.92681 12.434 1.74462C13.434 1.56243 14.4657 1.6893 15.3917 2.10833L12.2583 5.24167L12.25 5.25Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
