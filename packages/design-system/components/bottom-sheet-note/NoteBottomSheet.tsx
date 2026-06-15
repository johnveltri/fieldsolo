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
import { FieldSoloCtaButton } from '../fieldsolo-cta';

const sheetShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Overlay/Default'),
};

const handleBg = colorWithAlpha('Foundation/Text/Primary', 0.2);

const bodyBold = typographyBodyBoldStyle();
const bodySmall = typographyBodySmallStyle();
const body = typographyBodyStyle();

export const NOTE_SHEET_VARIANTS = [
  'newQuickNote',
  'newJobNote',
  'newSessionNote',
  'editJobNote',
  'editSessionNote',
] as const;

export type NoteSheetVariant = (typeof NOTE_SHEET_VARIANTS)[number];

const DEFAULT_SESSION_LABEL = 'Mar 25, 2026 9:00 AM – 10:00 AM';

const DEFAULT_PLACEHOLDER =
  'What happened on site? Measurements, observations, next steps...';

const DEFAULT_EDIT_BODY =
  'Previously added notes. Measurements, interaction with client, etc.';

function sheetTitle(variant: NoteSheetVariant): string {
  switch (variant) {
    case 'newQuickNote':
      return 'New Quick Note';
    case 'newJobNote':
      return 'New Job Note';
    case 'newSessionNote':
      return 'New Session Note';
    case 'editJobNote':
    case 'editSessionNote':
      return 'Edit Note';
    default: {
      const _e: never = variant;
      return _e;
    }
  }
}

function defaultSubtitle(
  variant: NoteSheetVariant,
  sessionLabel: string,
): string {
  switch (variant) {
    case 'newQuickNote':
      return 'Save to Inbox — assign to a job later';
    case 'newJobNote':
      return 'Unassigned — assign to a session later';
    case 'newSessionNote':
      return `Session: ${sessionLabel}`;
    case 'editJobNote':
      return 'Unassigned job note';
    case 'editSessionNote':
      return `Session: ${sessionLabel}`;
    default: {
      const _e: never = variant;
      return _e;
    }
  }
}

function primaryLabel(variant: NoteSheetVariant): string {
  switch (variant) {
    case 'newQuickNote':
      return 'SAVE TO INBOX';
    case 'newJobNote':
      return 'SAVE TO JOB';
    case 'newSessionNote':
      return 'SAVE TO SESSION';
    case 'editJobNote':
    case 'editSessionNote':
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

function NoteDocGlyph({ size = 16 }: { size?: number }) {
  const c = color('Semantic/Activity/Note');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 2.5h5l3 3v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z"
        stroke={c}
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
      <path
        d="M9 2.5V5h2.5M5 8h6M5 10.5h4"
        stroke={c}
        strokeWidth={1.25}
        strokeLinecap="round"
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

export type NoteBottomSheetProps = {
  /** Matches Figma `Property 1` (`New Quick Note` | `New Job Note` | `New Session Note` | `Edit Job Note` | `Edit Session Note`). */
  variant: NoteSheetVariant;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  subtitle?: string;
  /** Shown in session subtitle lines; defaults to a sample session range. */
  sessionLabel?: string;
  onBack?: () => void;
  onPrimaryAction?: () => void;
  onDelete?: () => void;
  /** Edit modes: header SESSION control (e.g. add session vs edit session metadata). */
  onSessionPillPress?: () => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * Note composer / editor bottom sheet (Figma component set **Note** `1279:351`).
 * Footer CTAs are **Button** instances (`1287:1563`) via `FieldSoloCtaButton`.
 */
export function NoteBottomSheet({
  variant,
  value: valueProp,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  subtitle: subtitleProp,
  sessionLabel = DEFAULT_SESSION_LABEL,
  onBack,
  onPrimaryAction,
  onDelete,
  onSessionPillPress,
  className,
  style,
}: NoteBottomSheetProps) {
  const isEdit =
    variant === 'editJobNote' || variant === 'editSessionNote';
  const defaultValue = isEdit ? DEFAULT_EDIT_BODY : '';
  const value = valueProp ?? defaultValue;
  const subtitle = subtitleProp ?? defaultSubtitle(variant, sessionLabel);
  const title = sheetTitle(variant);
  const titleId = 'fieldsolo-note-sheet-title';
  const bg = color('Foundation/Background/Default');
  const borderSubtle = color('Foundation/Border/Subtle');
  const backFg = color('Foundation/Text/Secondary');
  const fg = color('Foundation/Text/Primary');
  const errorBg = color('Semantic/Status/Error/BG');
  const errorText = color('Semantic/Status/Error/Text');
  const secondary = color('Foundation/Text/Secondary');

  const textareaTextColor = isEdit
    ? fg
    : value
      ? fg
      : variant === 'newSessionNote'
        ? '#CCCCCC'
        : secondary;

  return (
    <section
      className={className}
      data-name="note-bottom-sheet"
      aria-labelledby={titleId}
      style={{
        width: '100%',
        maxWidth: 391,
        minHeight: isEdit ? 491 : 471.5,
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
        data-name="note-content"
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
        data-name="note-drag-handle"
        style={{
          width: 40,
          height: 6,
          borderRadius: 9999,
          backgroundColor: handleBg,
          flexShrink: 0,
        }}
        aria-hidden
      />

      <div data-name="note-body" style={{ width: '100%', maxWidth: 343 }}>
        <button
          type="button"
          data-name="note-back-button"
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
          <span data-name="note-back-icon">
            <ChevronBackIcon />
          </span>
          <span data-name="note-back-label">Back</span>
        </button>

        <div
          data-name="note-header"
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
          <span data-name="note-title-icon">
            <NoteDocGlyph />
          </span>
          <div
            data-name="note-title"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              minWidth: 0,
              flex: 1,
            }}
          >
            <h2
              data-name="note-title-text"
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
          {variant === 'editJobNote' ? (
            <button
              type="button"
              data-name="note-session-pill"
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
              <span data-name="note-session-pill-icon">
                <PlusIcon size={12} style={{ color: errorText }} />
              </span>
              <span
                data-name="note-session-pill-label"
                style={{
                  ...bodySmall,
                  color: errorText,
                  textTransform: 'uppercase',
                }}
              >
                SESSION
              </span>
            </button>
          ) : null}
          {variant === 'editSessionNote' ? (
            <button
              type="button"
              data-name="note-session-pill"
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
              <span data-name="note-session-pill-icon">
                <PencilGlyph />
              </span>
              <span
                data-name="note-session-pill-label"
                style={{
                  ...bodySmall,
                  color: errorText,
                  textTransform: 'uppercase',
                }}
              >
                SESSION
              </span>
            </button>
          ) : null}
        </div>

        <p
          data-name="note-subtitle"
          style={{
            ...bodySmall,
            color: secondary,
            margin: 0,
            marginTop: space('Spacing/8'),
          }}
        >
          <span data-name="note-subtitle-text">
          {subtitle}
          </span>
        </p>

        <textarea
          data-name="note-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={8}
          style={{
            ...body,
            width: '100%',
            maxWidth: 343,
            boxSizing: 'border-box',
            minHeight: 245,
            marginTop: 18,
            paddingLeft: 17,
            paddingRight: 17,
            paddingTop: 13,
            paddingBottom: 13,
            borderRadius: 12,
            border: `1px solid ${borderSubtle}`,
            backgroundColor: color('Foundation/Surface/Default'),
            color: textareaTextColor,
            resize: 'vertical',
            outline: 'none',
            boxShadow: shadow('Shadow/Card/Default'),
          }}
        />
      </div>

      {!isEdit ? (
        <div data-name="note-primary-action" style={{ width: '100%', maxWidth: 343 }}>
          <FieldSoloCtaButton
            variant="notePrimary"
            primaryLabel={primaryLabel(variant)}
            onPrimaryClick={onPrimaryAction}
          />
        </div>
      ) : (
        <div data-name="note-footer" style={{ width: '100%', maxWidth: 343 }}>
          <FieldSoloCtaButton
            variant="notePrimaryWithDelete"
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
