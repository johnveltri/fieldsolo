import Svg, { Path } from 'react-native-svg';

type StrokeProps = { color: string };

type SearchIconProps = StrokeProps & { size?: number };

/** Exact vector from Figma asset `bce55f02-0121-4b5e-b926-9ee74a8fb65b` (20x20). */
export function JobsSearchIcon({ color, size = 20 }: SearchIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M17.6167 17.6167L14 14M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Clear control for jobs search — Figma `790:300` (14×14 stroke). */
export function JobsSearchClearIcon({ color }: StrokeProps) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M3.5 3.5l7 7M10.5 3.5l-7 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Exact vector from Figma asset `f8b50591-8266-4c4e-a7fb-72e145e76e56` (24x24). */
export function JobsInboxIcon({ color }: StrokeProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 12H16L14 15H10L8 12H2M22 12V18C22 18.5304 21.7893 19.0391 21.4142 19.4142C21.0391 19.7893 20.5304 20 20 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V12M22 12L18.55 5.11C18.3844 4.77679 18.1292 4.49637 17.813 4.30028C17.4967 4.10419 17.1321 4.0002 16.76 4H7.24C6.86792 4.0002 6.50326 4.10419 6.18704 4.30028C5.87083 4.49637 5.61558 4.77679 5.45 5.11L2 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Exact vector from Figma asset `8d423bab-9438-40b8-9595-9bd2ee41ae1a` (default 20×20; FAB uses 28). */
export function JobsFabPlusIcon({ color, size = 20 }: SearchIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4.16667 10H15.8333M10 4.16667V15.8333"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
