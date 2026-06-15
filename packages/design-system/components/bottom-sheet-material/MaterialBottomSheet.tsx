import type { CSSProperties } from 'react';
import {
  color,
  colorWithAlpha,
  shadow,
  space,
  typographyBodyBoldStyle,
  typographyBodySmallStyle,
  typographyBodyStyle,
  typographyTitleH3Style,
} from '../../lib/tokens';
import { PlusIcon } from '../../icons/PlusIcon';
import { QuickCaptureTileIcon } from '../bottom-sheet-quick-capture/QuickCaptureTileIcons';
import { FieldSoloCtaButton } from '../fieldsolo-cta';

const sheetShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Overlay/Default'),
};

const handleBg = colorWithAlpha('Foundation/Text/Primary', 0.2);

const bodyBold = typographyBodyBoldStyle();
const bodySmall = typographyBodySmallStyle();
/** Figma `1283:350` fields use Ubuntu Sans Mono 14 (`Typography/Body`), not `Typography/Input`. */
const fieldText = typographyBodyStyle();

export const MATERIAL_SHEET_VARIANTS = [
  'newQuickMaterial',
  'newJobMaterial',
  'newSessionMaterial',
  'editJobMaterial',
  'editSessionMaterial',
] as const;

export type MaterialSheetVariant = (typeof MATERIAL_SHEET_VARIANTS)[number];

const DEFAULT_SESSION_LABEL = 'Mar 25, 2026 9:00 AM – 10:00 AM';

const NAME_PLACEHOLDER = `e.g. Copper Pipe 1/2"`;

function sheetTitle(variant: MaterialSheetVariant): string {
  switch (variant) {
    case 'newQuickMaterial':
      return 'New Quick Material';
    case 'newJobMaterial':
      return 'New Job Material';
    case 'newSessionMaterial':
      return 'New Session Material';
    case 'editJobMaterial':
      return 'Edit Job Material';
    case 'editSessionMaterial':
      return 'Edit Session Material';
    default: {
      const _e: never = variant;
      return _e;
    }
  }
}

function defaultSubtitle(
  variant: MaterialSheetVariant,
  sessionLabel: string,
): string {
  switch (variant) {
    case 'newQuickMaterial':
      return 'Save to Inbox — assign to a job later';
    case 'newJobMaterial':
      return 'Unassigned — assign to a session later';
    case 'newSessionMaterial':
      return `Session: ${sessionLabel}`;
    case 'editJobMaterial':
      return 'Unassigned job material';
    case 'editSessionMaterial':
      return `Session: ${sessionLabel}`;
    default: {
      const _e: never = variant;
      return _e;
    }
  }
}

function primaryLabel(variant: MaterialSheetVariant): string {
  switch (variant) {
    case 'newQuickMaterial':
      return 'SAVE TO INBOX';
    case 'newJobMaterial':
      return 'SAVE TO JOB';
    case 'newSessionMaterial':
      return 'SAVE TO SESSION';
    case 'editJobMaterial':
    case 'editSessionMaterial':
      return 'SAVE CHANGES';
    default: {
      const _e: never = variant;
      return _e;
    }
  }
}

function ChevronBackIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12.5 15L7.5 10l5-5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilGlyph() {
  const c = color('Semantic/Status/Error/Text');
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8.5 2.5 11 5 4.5 11.5H2v-2.5L8.5 2.5z"
        stroke={c}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MaterialLeadIcon() {
  const fg = color('Semantic/Activity/Material');
  return (
    <div
      style={{
        width: 14,
        height: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: fg,
      }}
    >
      <div
        style={{
          transform: 'scale(0.7)',
          transformOrigin: 'center',
          display: 'flex',
        }}
      >
        <QuickCaptureTileIcon kind="newMaterial" />
      </div>
    </div>
  );
}

export type MaterialBottomSheetProps = {
  /** Matches Figma `Property 1` (`New Quick Material` | `New Job Material` | `New Session Material` | `Edit Session Material`). */
  variant: MaterialSheetVariant;
  materialName?: string;
  onMaterialNameChange?: (value: string) => void;
  price?: string;
  onPriceChange?: (value: string) => void;
  quantity?: string;
  onQuantityChange?: (value: string) => void;
  unit?: string;
  onUnitChange?: (value: string) => void;
  /** Options for the unit select; current `unit` is always included. */
  unitOptions?: string[];
  subtitle?: string;
  sessionLabel?: string;
  namePlaceholder?: string;
  onBack?: () => void;
  onPrimaryAction?: () => void;
  onDelete?: () => void;
  onSessionPillPress?: () => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * Material entry / edit bottom sheet (Figma component set **Material** `1283:351`).
 * Save actions use **Button** **Material** variants (`1287:1563`) via `FieldSoloCtaButton` (header wrench still **Semantic/Activity/Material**).
 */
export function MaterialBottomSheet({
  variant,
  materialName = '',
  onMaterialNameChange,
  price = '',
  onPriceChange,
  quantity = '1',
  onQuantityChange,
  unit = 'ea',
  onUnitChange,
  unitOptions = ['ea'],
  subtitle: subtitleProp,
  sessionLabel = DEFAULT_SESSION_LABEL,
  namePlaceholder = NAME_PLACEHOLDER,
  onBack,
  onPrimaryAction,
  onDelete,
  onSessionPillPress,
  className,
  style,
}: MaterialBottomSheetProps) {
  const isEdit =
    variant === 'editJobMaterial' || variant === 'editSessionMaterial';
  const subtitle = subtitleProp ?? defaultSubtitle(variant, sessionLabel);
  const title = sheetTitle(variant);
  const titleId = 'fieldsolo-material-sheet-title';
  const bg = color('Foundation/Background/Default');
  const borderSubtle = color('Foundation/Border/Subtle');
  const backFg = color('Foundation/Text/Secondary');
  const fg = color('Foundation/Text/Primary');
  const errorBg = color('Semantic/Status/Error/BG');
  const errorText = color('Semantic/Status/Error/Text');
  const secondary = color('Foundation/Text/Secondary');
  const placeholderMuted = '#CCCCCC';

  const unitChoices = unitOptions.includes(unit)
    ? unitOptions
    : [...unitOptions, unit];

  const inputShell: CSSProperties = {
    ...fieldText,
    boxSizing: 'border-box',
    height: 38,
    borderRadius: 8,
    border: `1px solid ${borderSubtle}`,
    backgroundColor: color('Foundation/Surface/Default'),
    outline: 'none',
    width: '100%',
    boxShadow: shadow('Shadow/Card/Default'),
  };

  return (
    <section
      className={className}
      data-name="material-bottom-sheet"
      aria-labelledby={titleId}
      style={{
        width: '100%',
        maxWidth: 391,
        minHeight: isEdit ? 346 : 347,
        boxSizing: 'border-box',
        backgroundColor: bg,
        borderTop: `1px solid ${borderSubtle}`,
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...sheetShadow,
        ...style,
      }}
    >
      <div
        data-name="material-content"
        style={{
          width: '100%',
          maxWidth: 391,
          boxSizing: 'border-box',
          paddingLeft: space('Spacing/24'),
          paddingRight: space('Spacing/24'),
          paddingTop: 18,
          paddingBottom: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: space('Spacing/16'),
        }}
      >
      <div
        data-name="material-drag-handle"
        style={{
          width: 40,
          height: 6,
          borderRadius: 9999,
          backgroundColor: handleBg,
          flexShrink: 0,
        }}
        aria-hidden
      />

      <div data-name="material-body" style={{ width: '100%', maxWidth: 343 }}>
        <button
          type="button"
          data-name="material-back-button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: space('Spacing/4'),
            padding: 0,
            margin: 0,
            border: 'none',
            background: 'none',
            cursor: onBack ? 'pointer' : 'default',
            color: backFg,
            ...bodyBold,
          }}
        >
          <span data-name="material-back-icon">
            <ChevronBackIcon />
          </span>
          <span data-name="material-back-label">Back</span>
        </button>

        <div
          data-name="material-header"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space('Spacing/12'),
            marginTop: space('Spacing/16'),
            minHeight: 28,
          }}
        >
          <span data-name="material-title-icon">
            <MaterialLeadIcon />
          </span>
          {!isEdit ? (
            <div
              data-name="material-title"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 0,
                flex: 1,
              }}
            >
              <h2
                data-name="material-title-text"
                id={titleId}
                style={{
                  margin: 0,
                  ...typographyTitleH3Style(),
                  color: fg,
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </h2>
            </div>
          ) : (
            <div
              data-name="material-title-row"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: space('Spacing/12'),
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                data-name="material-title"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <h2
                  data-name="material-title-text"
                  id={titleId}
                  style={{
                    margin: 0,
                    ...typographyTitleH3Style(),
                    color: fg,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {title}
                </h2>
              </div>
              {variant === 'editJobMaterial' ? (
                <button
                  type="button"
                  data-name="material-session-pill"
                  onClick={onSessionPillPress}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: space('Spacing/8'),
                    flexShrink: 0,
                    height: 24,
                    paddingLeft: space('Spacing/12'),
                    paddingRight: space('Spacing/12'),
                    paddingTop: 4,
                    paddingBottom: 4,
                    borderRadius: 9999,
                    border: 'none',
                    backgroundColor: errorBg,
                    cursor: onSessionPillPress ? 'pointer' : 'default',
                  }}
                >
                  <span data-name="material-session-pill-icon">
                    <PlusIcon size={12} style={{ color: errorText }} />
                  </span>
                  <span
                    data-name="material-session-pill-label"
                    style={{
                      ...bodySmall,
                      color: errorText,
                      textTransform: 'uppercase',
                    }}
                  >
                    SESSION
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  data-name="material-session-pill"
                  onClick={onSessionPillPress}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: space('Spacing/8'),
                    flexShrink: 0,
                    height: 24,
                    paddingLeft: space('Spacing/12'),
                    paddingRight: space('Spacing/12'),
                    paddingTop: 4,
                    paddingBottom: 4,
                    borderRadius: 9999,
                    border: 'none',
                    backgroundColor: errorBg,
                    cursor: onSessionPillPress ? 'pointer' : 'default',
                  }}
                >
                  <span data-name="material-session-pill-icon">
                    <PencilGlyph />
                  </span>
                  <span
                    data-name="material-session-pill-label"
                    style={{
                      ...bodySmall,
                      color: errorText,
                      textTransform: 'uppercase',
                    }}
                  >
                    SESSION
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <p
          data-name="material-subtitle"
          style={{
            ...bodySmall,
            color: secondary,
            margin: 0,
            marginTop: space('Spacing/8'),
          }}
        >
          <span data-name="material-subtitle-text">{subtitle}</span>
        </p>

        <div
          data-name="material-fields-frame"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: space('Spacing/8'),
            marginTop: 18,
            width: '100%',
          }}
        >
          <div data-name="material-fields" style={{ display: 'flex', flexDirection: 'column', gap: space('Spacing/8'), width: '100%' }}>
            <input
              type="text"
              data-name="material-name-input"
              value={materialName}
              onChange={(e) => onMaterialNameChange?.(e.target.value)}
              placeholder={namePlaceholder}
              aria-label="Material name"
              style={{
                ...inputShell,
                paddingLeft: 13,
                paddingRight: 13,
                paddingTop: 9,
                paddingBottom: 9,
                color: materialName ? fg : placeholderMuted,
              }}
            />

            <div
              data-name="material-price-row"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: space('Spacing/8'),
                width: '100%',
              }}
            >
              <div
                data-name="material-price-group"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  data-name="material-price-prefix"
                  style={{
                    ...bodyBold,
                    fontSize: 11.9,
                    color: secondary,
                    flexShrink: 0,
                    lineHeight: '20px',
                  }}
                  aria-hidden
                >
                  $
                </span>
                <input
                  type="text"
                  data-name="material-price-input"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => onPriceChange?.(e.target.value)}
                  placeholder="0.00"
                  aria-label="Price"
                  style={{
                    ...inputShell,
                    flex: 1,
                    minWidth: 0,
                    paddingLeft: space('Spacing/12'),
                    paddingRight: space('Spacing/12'),
                    paddingTop: space('Spacing/8'),
                    paddingBottom: space('Spacing/8'),
                    color: price ? fg : placeholderMuted,
                  }}
                />
              </div>
              <input
                type="text"
                data-name="material-quantity-input"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => onQuantityChange?.(e.target.value)}
                aria-label="Quantity"
                style={{
                  ...inputShell,
                  width: 56,
                  flexShrink: 0,
                  padding: 9,
                  textAlign: 'center',
                  color: fg,
                }}
              />
              <div data-name="material-unit-select" style={{ position: 'relative', width: 60, flexShrink: 0 }}>
                <select
                  value={unit}
                  data-name="material-unit-select-input"
                  onChange={(e) => onUnitChange?.(e.target.value)}
                  aria-label="Unit"
                  style={{
                    ...inputShell,
                    width: '100%',
                    height: 38,
                    paddingLeft: 9,
                    paddingRight: 22,
                    paddingTop: 9,
                    paddingBottom: 9,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    color: fg,
                    cursor: 'pointer',
                  }}
                >
                  {unitChoices.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <span
                  data-name="material-unit-select-caret"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 8.5,
                    color: secondary,
                    pointerEvents: 'none',
                    lineHeight: 1,
                  }}
                  aria-hidden
                >
                  ▼
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isEdit ? (
        <div data-name="material-primary-action" style={{ width: '100%', maxWidth: 343 }}>
          <FieldSoloCtaButton
            variant="materialPrimary"
            primaryLabel={primaryLabel(variant)}
            onPrimaryClick={onPrimaryAction}
          />
        </div>
      ) : (
        <div data-name="material-footer" style={{ width: '100%', maxWidth: 343 }}>
          <FieldSoloCtaButton
            variant="materialPrimaryWithDelete"
            primaryLabel={primaryLabel(variant)}
            onPrimaryClick={onPrimaryAction}
            onDeleteClick={onDelete}
          />
        </div>
      )}
      </div>
    </section>
  );
}
