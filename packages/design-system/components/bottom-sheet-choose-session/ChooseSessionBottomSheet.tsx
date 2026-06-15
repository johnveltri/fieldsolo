import type { CSSProperties } from 'react';
import {
  color,
  colorWithAlpha,
  shadow,
  space,
  typographyBodyBoldStyle,
  typographyBodySmallStyle,
  typographyLabelStyle,
  typographyTitleH3Style,
} from '../../lib/tokens';
import { QuickCaptureTileIcon } from '../bottom-sheet-quick-capture/QuickCaptureTileIcons';
import { RowCard } from '../row-card';

const sheetShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Overlay/Default'),
};

const cardShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Card/Default'),
};

const bodyBold = typographyBodyBoldStyle();
const bodySmall = typographyBodySmallStyle();
const labelDivider = typographyLabelStyle();

export const CHOOSE_SESSION_VARIANTS = [
  'newAttachmentForSession',
  'addToSession',
  'removeEditFromSession',
  'newSessionType',
] as const;

export type ChooseSessionVariant = (typeof CHOOSE_SESSION_VARIANTS)[number];

function sheetTitle(variant: ChooseSessionVariant): string {
  switch (variant) {
    case 'newAttachmentForSession':
      return 'New Note';
    case 'addToSession':
      return 'Add to Session';
    case 'removeEditFromSession':
      return 'Edit Session';
    case 'newSessionType':
      return 'New Session';
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

/** Pencil for “Log Past Session” well (Figma `1286:622` icon slot). */
function PencilLightGlyph() {
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
        d="M11.5 4.5 16 9 7.5 17.5H4v-3.5L11.5 4.5z"
        stroke={color('Foundation/Surface/Default')}
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type ChooseSessionJobRow = {
  id: string;
  title: string;
  subtitle: string;
};

export type ChooseSessionBottomSheetProps = {
  variant: ChooseSessionVariant;
  /** Session/job rows; omitted or empty for `newSessionType`. */
  jobs?: ChooseSessionJobRow[];
  onBack?: () => void;
  /** `newAttachmentForSession`: “Add Job Note”. `removeEditFromSession`: “Remove From Session”. */
  onFeaturedAction?: () => void;
  onSelectJob?: (jobId: string) => void;
  /** `newSessionType` only: primary orange “Live Session” row. */
  onLiveSession?: () => void;
  /** `newSessionType` only: neutral “Log Past Session” row. */
  onLogPastSession?: () => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * Pick or detach a session for a job note, or choose how to create a session
 * (Figma: **Bottom Sheet: Choose Session** `1279:381`).
 */
export function ChooseSessionBottomSheet({
  variant,
  jobs = [],
  onBack,
  onFeaturedAction,
  onSelectJob,
  onLiveSession,
  onLogPastSession,
  className,
  style,
}: ChooseSessionBottomSheetProps) {
  const bg = color('Foundation/Background/Default');
  const borderSubtle = color('Foundation/Border/Subtle');
  const fg = color('Foundation/Text/Primary');
  const backFg = color('Foundation/Text/Secondary');
  const titleMuted = color('Foundation/Text/Muted');
  const note = color('Semantic/Activity/Note');
  const brandPrimary = color('Brand/Primary');
  const errorBg = color('Semantic/Status/Error/BG');
  const errorText = color('Semantic/Status/Error/Text');
  const neutralBg = color('Semantic/Status/Neutral/BG');
  const secondaryWell = color('Foundation/Text/Secondary');
  const sheetTitleId = 'fieldsolo-choose-session-title';
  const wellBg = colorWithAlpha('Foundation/Background/Default', 0.2);

  const showList =
    variant === 'newAttachmentForSession' ||
    variant === 'addToSession' ||
    variant === 'removeEditFromSession';

  const showFeatured =
    variant === 'newAttachmentForSession' ||
    variant === 'removeEditFromSession';

  const showDivider =
    variant === 'newAttachmentForSession' ||
    variant === 'removeEditFromSession';

  const dividerLabel =
    variant === 'newAttachmentForSession'
      ? 'or attach to SESSION'
      : 'ATTACH TO DIFFERENT SESSION';

  const sessionTypeRowStyle = (
    accentBg: string,
    extra: CSSProperties,
  ): CSSProperties => ({
    width: '100%',
    maxWidth: 353,
    margin: '0 auto',
    display: 'flex',
    boxSizing: 'border-box',
    alignItems: 'center',
    minHeight: 85,
    paddingLeft: space('Spacing/20'),
    paddingRight: space('Spacing/20'),
    paddingTop: space('Spacing/16'),
    paddingBottom: space('Spacing/16'),
    borderRadius: 16,
    border: `1px solid ${borderSubtle}`,
    backgroundColor: accentBg,
    textAlign: 'left',
    ...cardShadow,
    ...extra,
  });

  return (
    <section
      data-name="bottom-sheet-choose-session"
      className={className}
      aria-labelledby={sheetTitleId}
      style={{
        width: '100%',
        maxWidth: 391,
        minHeight: 491.5,
        boxSizing: 'border-box',
        backgroundColor: bg,
        borderTop: `1px solid ${borderSubtle}`,
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingLeft: 18,
        paddingRight: 18,
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
          data-name="bottom-sheet-choose-session-handle"
          style={{
            width: 40,
            height: 6,
            borderRadius: 9999,
            backgroundColor: borderSubtle,
            flexShrink: 0,
          }}
          aria-hidden
        />
      </div>

      <div data-name="bottom-sheet-choose-session-content" style={{ paddingTop: space('Spacing/32') }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            minHeight: 28,
            marginBottom: space('Spacing/16'),
          }}
        >
          <button
            data-name="bottom-sheet-choose-session-back"
            type="button"
            onClick={onBack}
            style={{
              position: 'relative',
              zIndex: 1,
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
              width: 72,
              flexShrink: 0,
            }}
          >
            <span data-name="bottom-sheet-choose-session-back-icon" style={{ display: 'inline-flex' }}>
              <ChevronBackIcon />
            </span>
            <span data-name="bottom-sheet-choose-session-back-label">Back</span>
          </button>
          <h2
            data-name="bottom-sheet-choose-session-heading"
            id={sheetTitleId}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              margin: 0,
              textAlign: 'center',
              pointerEvents: 'none',
              ...typographyTitleH3Style(),
              color: fg,
            }}
          >
            {sheetTitle(variant)}
          </h2>
          <div style={{ width: 72, flexShrink: 0 }} aria-hidden />
        </div>

        {variant === 'newAttachmentForSession' ? (
          <button
            type="button"
            onClick={onFeaturedAction}
            style={{
              ...sessionTypeRowStyle(note, {
                cursor: onFeaturedAction ? 'pointer' : 'default',
              }),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: space('Spacing/12'),
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  borderRadius: 9999,
                  backgroundColor: wellBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: titleMuted,
                }}
              >
                <QuickCaptureTileIcon kind="newNote" />
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: space('Spacing/4'),
                  minWidth: 0,
                }}
              >
                <div style={{ ...bodyBold, color: titleMuted }}>
                  Add Job Note
                </div>
                <div
                  style={{
                    ...bodySmall,
                  color: colorWithAlpha('Foundation/Surface/Default', 0.7),
                  }}
                >
                  Save as unassigned — assign to a session later
                </div>
              </div>
            </div>
          </button>
        ) : null}

        {variant === 'removeEditFromSession' ? (
          <button
            type="button"
            onClick={onFeaturedAction}
            style={{
              ...sessionTypeRowStyle(errorBg, {
                cursor: onFeaturedAction ? 'pointer' : 'default',
              }),
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: space('Spacing/4'),
                minWidth: 0,
              }}
            >
              <div style={{ ...bodyBold, color: errorText }}>
                Remove From Session
              </div>
              <div style={{ ...bodySmall, color: backFg }}>
                Save as unassigned — assign to a session later
              </div>
            </div>
          </button>
        ) : null}

        {variant === 'newSessionType' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: space('Spacing/12'),
              width: '100%',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={onLiveSession}
              style={{
                ...sessionTypeRowStyle(brandPrimary, {
                  cursor: onLiveSession ? 'pointer' : 'default',
                }),
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space('Spacing/12'),
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    minHeight: 40,
                    borderRadius: 9999,
                    backgroundColor: wellBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: titleMuted,
                  }}
                >
                  <QuickCaptureTileIcon kind="startSession" />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: space('Spacing/4'),
                    minWidth: 0,
                  }}
                >
                  <div style={{ ...bodyBold, color: titleMuted }}>
                    Live Session
                  </div>
                  <div style={{ ...bodySmall, color: titleMuted }}>
                    Start a timer now
                  </div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={onLogPastSession}
              style={{
                ...sessionTypeRowStyle(neutralBg, {
                  cursor: onLogPastSession ? 'pointer' : 'default',
                  border: `1px solid ${fg}`,
                }),
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space('Spacing/12'),
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    minHeight: 40,
                    borderRadius: 9999,
                    backgroundColor: secondaryWell,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PencilLightGlyph />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: space('Spacing/4'),
                    minWidth: 0,
                  }}
                >
                  <div style={{ ...bodyBold, color: fg }}>Log Past Session</div>
                  <div style={{ ...bodySmall, color: backFg }}>
                    Log a completed session manually
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : null}

        {showDivider ? (
          <div
            data-name="bottom-sheet-choose-session-divider"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space('Spacing/12'),
              justifyContent: 'center',
              paddingTop: space('Spacing/8'),
              paddingBottom: space('Spacing/8'),
              marginTop: showFeatured ? 9 : 0,
            }}
          >
            <div
              data-name="bottom-sheet-choose-session-divider-line-start"
              style={{
                height: 1,
                flex: 1,
                maxWidth: 75.25,
                backgroundColor: borderSubtle,
              }}
              aria-hidden
            />
            <span
              data-name="bottom-sheet-choose-session-divider-label"
              style={{
                ...labelDivider,
                color: color('Foundation/Text/Secondary'),
                flexShrink: 0,
                textAlign: 'center',
              }}
            >
              {dividerLabel}
            </span>
            <div
              data-name="bottom-sheet-choose-session-divider-line-end"
              style={{
                height: 1,
                flex: 1,
                maxWidth: 75.25,
                backgroundColor: borderSubtle,
              }}
              aria-hidden
            />
          </div>
        ) : null}

        {showList ? (
          <div
            data-name="bottom-sheet-choose-session-card-rows"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
              marginTop: variant === 'addToSession' ? space('Spacing/24') : 0,
            }}
          >
            {jobs.map((job) => (
              <RowCard
                key={job.id}
                variant="simpleJob"
                title={job.title}
                subtitle={job.subtitle}
                onPress={
                  onSelectJob ? () => onSelectJob(job.id) : undefined
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
