import type { CSSProperties } from 'react';
import { color, shadow, space, typographyTitleH3Style } from '../../lib/tokens';
import {
  ActionTile,
  type ActionTileKind,
} from '../action-tile';
import { QuickCaptureTileIcon } from './QuickCaptureTileIcons';

const sheetShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Overlay/Default'),
};

/** Row-major: matches Figma grid `1075:1704`. */
const QUICK_CAPTURE_TILES: ActionTileKind[] = [
  'startSession',
  'newNote',
  'newMaterial',
  'addPhoto',
  'uploadFile',
  'voiceMemo',
];

export type QuickCaptureBottomSheetProps = {
  /** Defaults to “Quick Capture”. */
  title?: string;
  /** Called when the user activates a tile (button press). */
  onAction?: (kind: ActionTileKind) => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * Bottom sheet with drag affordance, heading, and six {@link ActionTile} actions
 * (Figma: **Bottom Sheet: Quick Capture** `1075:1946`).
 */
export function QuickCaptureBottomSheet({
  title = 'Quick Capture',
  onAction,
  className,
  style,
}: QuickCaptureBottomSheetProps) {
  const titleId = 'fieldsolo-quick-capture-title';
  const bg = color('Foundation/Background/Default');
  const borderSubtle = color('Foundation/Border/Subtle');
  const fg = color('Foundation/Text/Primary');

  return (
    <section
      className={className}
      aria-labelledby={titleId}
      style={{
        width: '100%',
        maxWidth: 391,
        minHeight: 375,
        boxSizing: 'border-box',
        backgroundColor: bg,
        borderTop: `1px solid ${borderSubtle}`,
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingLeft: 23,
        paddingRight: 23,
        paddingBottom: space('Spacing/24'),
        ...sheetShadow,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: space('Spacing/24'),
        }}
      >
        <div
          style={{
            width: 40,
            height: 6,
            borderRadius: 9999,
            backgroundColor: borderSubtle,
            flexShrink: 0,
          }}
          aria-hidden
        />
        <h2
          id={titleId}
          style={{
            margin: 0,
            marginTop: space('Spacing/32'),
            marginBottom: space('Spacing/20'),
            ...typographyTitleH3Style(),
            color: fg,
            textAlign: 'center',
          }}
        >
          {title}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 106.33px))',
            gap: 10,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {QUICK_CAPTURE_TILES.map((kind) => (
            <ActionTile
              key={kind}
              kind={kind}
              icon={<QuickCaptureTileIcon kind={kind} />}
              onClick={onAction ? () => onAction(kind) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
