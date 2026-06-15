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
import type { ActionTileKind } from '../action-tile';

const sheetShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Overlay/Default'),
};

const cardShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Card/Default'),
};

const bodyBold = typographyBodyBoldStyle();
const bodySmall = typographyBodySmallStyle();
const labelDivider = typographyLabelStyle();

type AccentToken =
  | 'Brand/Primary'
  | 'Semantic/Activity/Note'
  | 'Semantic/Status/Success/Text'
  | 'Semantic/Status/Info/Text'
  | 'Semantic/Activity/Attachment'
  | 'Semantic/Activity/Voice';

const CAPTURE_META: Record<
  ActionTileKind,
  { sheetTitle: string; actionTitle: string; accent: AccentToken }
> = {
  startSession: {
    sheetTitle: 'Start Session',
    actionTitle: 'Start New Session',
    accent: 'Brand/Primary',
  },
  newNote: {
    sheetTitle: 'New Note',
    actionTitle: 'Create Quick Note',
    accent: 'Semantic/Activity/Note',
  },
  newMaterial: {
    sheetTitle: 'New Material',
    actionTitle: 'Add Quick Material',
    accent: 'Semantic/Status/Success/Text',
  },
  addPhoto: {
    sheetTitle: 'New Photo',
    actionTitle: 'Take Quick Photo',
    accent: 'Semantic/Status/Info/Text',
  },
  uploadFile: {
    sheetTitle: 'New File',
    actionTitle: 'Upload Quick File',
    accent: 'Semantic/Activity/Attachment',
  },
  voiceMemo: {
    sheetTitle: 'New Voice Memo',
    actionTitle: 'Record Quick Memo',
    accent: 'Semantic/Activity/Voice',
  },
};

function sessionSubtitle(): string {
  return 'Begin tracking now — add job details later';
}

function inboxSubtitle(): string {
  return 'Save to inbox — assign to a job later';
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

export type ChooseJobJobRow = {
  id: string;
  title: string;
  subtitle: string;
};

export type ChooseJobBottomSheetProps = {
  /** Which quick-capture flow opened this sheet (drives accent + strings). */
  captureKind: ActionTileKind;
  jobs: ChooseJobJobRow[];
  onBack?: () => void;
  onQuickAction?: () => void;
  onSelectJob?: (jobId: string) => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * Assign or create flow: back control, contextual heading, accent quick-action row,
 * divider, and selectable job list (Figma: **Bottom Sheet: Choose Job** `1075:1948`).
 */
export function ChooseJobBottomSheet({
  captureKind,
  jobs,
  onBack,
  onQuickAction,
  onSelectJob,
  className,
  style,
}: ChooseJobBottomSheetProps) {
  const meta = CAPTURE_META[captureKind];
  const accent = color(meta.accent);
  const bg = color('Foundation/Background/Default');
  const borderSubtle = color('Foundation/Border/Subtle');
  const fg = color('Foundation/Text/Primary');
  const backFg = color('Foundation/Text/Secondary');
  const titleMuted = color('Foundation/Text/Muted');
  const sheetTitleId = 'fieldsolo-choose-job-title';
  const actionSubtitle =
    captureKind === 'startSession' ? sessionSubtitle() : inboxSubtitle();

  const wellBg = colorWithAlpha('Foundation/Background/Default', 0.2);

  return (
    <section
      className={className}
      data-name="choose-job-sheet"
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
        data-name="choose-job-sheet-handle-wrap"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: space('Spacing/24'),
        }}
      >
        <div
          data-name="choose-job-sheet-handle"
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

      <div data-name="choose-job-sheet-content" style={{ paddingTop: space('Spacing/32') }}>
        <div
          data-name="choose-job-sheet-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            minHeight: 28,
            marginBottom: space('Spacing/16'),
          }}
        >
          <button
            type="button"
            data-name="choose-job-sheet-back-button"
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
            <span data-name="choose-job-sheet-back-icon">
              <ChevronBackIcon />
            </span>
            <span data-name="choose-job-sheet-back-label">Back</span>
          </button>
          <h2
            id={sheetTitleId}
            data-name="choose-job-sheet-title"
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
            {meta.sheetTitle}
          </h2>
          <div style={{ width: 72, flexShrink: 0 }} aria-hidden />
        </div>

        <button
          type="button"
          data-name="choose-job-sheet-quick-action"
          onClick={onQuickAction}
          style={{
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
            backgroundColor: accent,
            cursor: onQuickAction ? 'pointer' : 'default',
            textAlign: 'left',
            ...cardShadow,
          }}
        >
          <div
            data-name="choose-job-sheet-quick-action-content"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space('Spacing/12'),
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              data-name="choose-job-sheet-quick-action-icon"
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
              <QuickCaptureTileIcon kind={captureKind} />
            </div>
            <div
              data-name="choose-job-sheet-quick-action-copy"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: space('Spacing/4'),
                minWidth: 0,
              }}
            >
              <div
                style={{
                  ...bodyBold,
                  color: titleMuted,
                }}
              >
                {meta.actionTitle}
              </div>
              <div
                style={{
                  ...bodySmall,
                  color: colorWithAlpha('Foundation/Surface/Default', 0.7),
                }}
              >
                {actionSubtitle}
              </div>
            </div>
          </div>
        </button>

        <div
          data-name="choose-job-sheet-divider"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space('Spacing/12'),
            justifyContent: 'center',
            paddingTop: space('Spacing/8'),
            paddingBottom: space('Spacing/8'),
            marginTop: 9,
          }}
        >
          <div
            style={{
              height: 1,
              flex: 1,
              maxWidth: 75.25,
              backgroundColor: borderSubtle,
            }}
            aria-hidden
          />
          <span
            data-name="choose-job-sheet-divider-label"
            style={{
              ...labelDivider,
              color: color('Foundation/Text/Secondary'),
              flexShrink: 0,
              textAlign: 'center',
            }}
          >
            or attach to existing job
          </span>
          <div
            style={{
              height: 1,
              flex: 1,
              maxWidth: 75.25,
              backgroundColor: borderSubtle,
            }}
            aria-hidden
          />
        </div>

        <div
          data-name="choose-job-sheet-job-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
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
      </div>
    </section>
  );
}
