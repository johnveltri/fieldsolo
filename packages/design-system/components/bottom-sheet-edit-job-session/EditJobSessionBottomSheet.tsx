import type { CSSProperties, ReactNode } from 'react';
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
import { FieldSoloCtaButton } from '../fieldsolo-cta';

const sheetShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Overlay/Default'),
};

const handleBg = colorWithAlpha('Foundation/Text/Primary', 0.2);

const bodyBold = typographyBodyBoldStyle();
const bodySmall = typographyBodySmallStyle();
const fieldText = typographyBodyStyle();

export const EDIT_JOB_SESSION_VARIANTS = [
  'editSession',
  'editJobPlaceholder',
  'editJobFilled',
] as const;

export type EditJobSessionVariant = (typeof EDIT_JOB_SESSION_VARIANTS)[number];

/** Figma “Edit Job Empty” populated sample (`1286:701`). */
const JOB_FILLED_DEFAULT = {
  jobTitle: 'Bathroom Remodel Phase 1',
  customerName: 'Andrew G',
  addressLine1: '123 Main Street ',
  addressLine2: 'Perrysburg, OH 43551',
  revenue: '5,678.87',
  jobType: 'Plumbing',
} as const;

const JOB_PLACEHOLDER_COPY = {
  jobTitle: 'Short description',
  customerName: 'Customer Name',
  addressLine1: 'Service Address',
  addressLine2: '',
  revenue: 'Revenue',
  jobType: 'Select Job Type...',
} as const;

const SESSION_DEFAULT = {
  startDate: '2026-03-25',
  startTime: '02 : 00 PM',
  endDate: '2026-03-25',
  endTime: '04 : 00 PM',
} as const;

export type EditJobFormValues = {
  jobTitle: string;
  customerName: string;
  addressLine1: string;
  addressLine2: string;
  revenue: string;
  jobType: string;
};

export type EditSessionTimes = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

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

function SessionClockIcon() {
  const c = color('Brand/Accent');
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx={8} cy={8} r={6.25} stroke={c} strokeWidth={1.25} />
      <path
        d="M8 4.75V8l2.25 1.35"
        stroke={c}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type EditJobSessionBottomSheetProps = {
  variant: EditJobSessionVariant;
  /** Job field values merged with defaults per variant. */
  job?: Partial<EditJobFormValues>;
  onJobChange?: (next: EditJobFormValues) => void;
  /** Session date/time values merged with defaults. */
  session?: Partial<EditSessionTimes>;
  onSessionChange?: (next: EditSessionTimes) => void;
  /** Replace default job field stack (`editJob*` only). */
  children?: ReactNode;
  onBack?: () => void;
  onSaveChanges?: () => void;
  onDelete?: () => void;
  className?: string;
  style?: CSSProperties;
};

function mergeJob(
  variant: EditJobSessionVariant,
  job: Partial<EditJobFormValues> | undefined,
): EditJobFormValues {
  const base =
    variant === 'editJobFilled'
      ? ({ ...JOB_FILLED_DEFAULT } as EditJobFormValues)
      : ({
          jobTitle: '',
          customerName: '',
          addressLine1: '',
          addressLine2: '',
          revenue: '',
          jobType: '',
        } as EditJobFormValues);
  return { ...base, ...job };
}

function mergeSession(session: Partial<EditSessionTimes> | undefined): EditSessionTimes {
  return { ...SESSION_DEFAULT, ...session };
}

/**
 * Edit job details or session times with save + delete actions
 * (Figma **Edit Job, Session** `1284:789`; footer **Button** Job/Session colorway `1287:1563` via `FieldSoloCtaButton`).
 */
export function EditJobSessionBottomSheet({
  variant,
  job: jobProp,
  onJobChange,
  session: sessionProp,
  onSessionChange,
  children,
  onBack,
  onSaveChanges,
  onDelete,
  className,
  style,
}: EditJobSessionBottomSheetProps) {
  const bg = color('Foundation/Background/Default');
  const borderSubtle = color('Foundation/Border/Subtle');
  const fg = color('Foundation/Text/Primary');
  const backFg = color('Foundation/Text/Secondary');
  const secondary = color('Foundation/Text/Secondary');
  const borderDefault = color('Foundation/Border/Default');
  const accent = color('Brand/Accent');
  const surface = color('Foundation/Surface/Default');

  const titleId = 'fieldsolo-edit-job-session-title';
  const isSession = variant === 'editSession';
  const isPlaceholderJob = variant === 'editJobPlaceholder';

  const minHeight =
    variant === 'editSession' ? 451 : variant === 'editJobFilled' ? 457 : 453;

  const j = mergeJob(variant, jobProp);
  const s = mergeSession(sessionProp);

  const inputShell = (
    minH: number,
    extra?: CSSProperties,
  ): CSSProperties => ({
    ...fieldText,
    boxSizing: 'border-box',
    minHeight: minH,
    borderRadius: 8,
    border: `1px solid ${borderSubtle}`,
    backgroundColor: surface,
    outline: 'none',
    width: '100%',
    paddingLeft: 13,
    paddingRight: 13,
    paddingTop: 9,
    paddingBottom: 9,
    color: fg,
    ...extra,
  });

  const revenuePrefixStyle: CSSProperties = {
    ...bodyBold,
    color: borderDefault,
    width: 14,
    flexShrink: 0,
    textAlign: 'left' as const,
    paddingRight: 6,
  };

  const jc = isPlaceholderJob
    ? {
        title: { ...typographyTitleH3Style(), color: secondary },
        body: { ...fieldText, color: secondary },
      }
    : {
        title: { ...typographyTitleH3Style(), color: fg },
        body: { ...fieldText, color: fg },
      };

  const defaultJobBody =
    variant === 'editJobPlaceholder' ? (
      <>
        <input
          type="text"
          data-name="edit-job-session-job-title-input"
          value={j.jobTitle}
          placeholder={JOB_PLACEHOLDER_COPY.jobTitle}
          onChange={(e) =>
            onJobChange?.({ ...j, jobTitle: e.target.value })
          }
          aria-label="Job description"
          style={inputShell(46, jc.title)}
        />
        <input
          type="text"
          data-name="edit-job-session-job-customer-input"
          value={j.customerName}
          placeholder={JOB_PLACEHOLDER_COPY.customerName}
          onChange={(e) =>
            onJobChange?.({ ...j, customerName: e.target.value })
          }
          aria-label="Customer name"
          style={inputShell(38, jc.body)}
        />
        <input
          type="text"
          data-name="edit-job-session-job-address-input"
          value={j.addressLine1}
          placeholder={JOB_PLACEHOLDER_COPY.addressLine1}
          onChange={(e) =>
            onJobChange?.({ ...j, addressLine1: e.target.value })
          }
          aria-label="Service address"
          style={inputShell(38, jc.body)}
        />
        <div
          data-name="edit-job-session-job-revenue-row"
          style={
            {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              ...inputShell(38, jc.body),
              paddingLeft: 12,
            }
          }
        >
          <span
            data-name="edit-job-session-job-revenue-prefix"
            style={revenuePrefixStyle}
            aria-hidden
          >
            $
          </span>
          <input
            type="text"
            data-name="edit-job-session-job-revenue-input"
            value={j.revenue}
            placeholder={JOB_PLACEHOLDER_COPY.revenue}
            onChange={(e) =>
              onJobChange?.({ ...j, revenue: e.target.value })
            }
            aria-label="Revenue"
            style={{
              ...fieldText,
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: secondary,
              padding: 0,
            }}
          />
        </div>
        <input
          type="text"
          data-name="edit-job-session-job-type-input"
          value={j.jobType}
          placeholder={JOB_PLACEHOLDER_COPY.jobType}
          onChange={(e) =>
            onJobChange?.({ ...j, jobType: e.target.value })
          }
          aria-label="Job type"
          style={{ ...inputShell(38, { ...jc.body, color: fg }) }}
        />
      </>
    ) : (
      <>
        <input
          type="text"
          data-name="edit-job-session-job-title-input"
          value={j.jobTitle}
          onChange={(e) =>
            onJobChange?.({ ...j, jobTitle: e.target.value })
          }
          aria-label="Short description"
          style={inputShell(38, jc.title)}
        />
        <input
          type="text"
          data-name="edit-job-session-job-customer-input"
          value={j.customerName}
          onChange={(e) =>
            onJobChange?.({ ...j, customerName: e.target.value })
          }
          aria-label="Customer name"
          style={inputShell(38, jc.body)}
        />
        <div
          data-name="edit-job-session-job-address-block"
          style={{
            ...inputShell(38, jc.body),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <p style={{ margin: 0, lineHeight: 'normal' }}>{j.addressLine1}</p>
          <p style={{ margin: 0, lineHeight: 'normal' }}>{j.addressLine2}</p>
        </div>
        <div
          data-name="edit-job-session-job-revenue-row"
          style={
            {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              ...inputShell(38, jc.body),
              paddingLeft: 12,
            }
          }
        >
          <span
            data-name="edit-job-session-job-revenue-prefix"
            style={revenuePrefixStyle}
            aria-hidden
          >
            $
          </span>
          <input
            type="text"
            data-name="edit-job-session-job-revenue-input"
            value={j.revenue}
            onChange={(e) =>
              onJobChange?.({ ...j, revenue: e.target.value })
            }
            aria-label="Revenue"
            style={{
              ...fieldText,
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: fg,
              padding: 0,
            }}
          />
        </div>
        <input
          type="text"
          data-name="edit-job-session-job-type-input"
          value={j.jobType}
          onChange={(e) =>
            onJobChange?.({ ...j, jobType: e.target.value })
          }
          aria-label="Job type"
          style={inputShell(38, jc.body)}
        />
      </>
    );

  const sessionBody = (
    <>
      <span
        data-name="edit-job-session-start-time-label"
        style={{ ...bodySmall, color: secondary }}
      >
        Start Time
      </span>
      <input
        type="text"
        data-name="edit-job-session-start-date-input"
        value={s.startDate}
        onChange={(e) =>
          onSessionChange?.({ ...s, startDate: e.target.value })
        }
        aria-label="Start date"
        style={inputShell(38)}
      />
      <input
        type="text"
        data-name="edit-job-session-start-time-input"
        value={s.startTime}
        onChange={(e) =>
          onSessionChange?.({ ...s, startTime: e.target.value })
        }
        aria-label="Start time"
        style={inputShell(38)}
      />
      <span
        data-name="edit-job-session-end-time-label"
        style={{ ...bodySmall, color: secondary }}
      >
        End Time
      </span>
      <input
        type="text"
        data-name="edit-job-session-end-date-input"
        value={s.endDate}
        onChange={(e) =>
          onSessionChange?.({ ...s, endDate: e.target.value })
        }
        aria-label="End date"
        style={inputShell(38)}
      />
      <input
        type="text"
        data-name="edit-job-session-end-time-input"
        value={s.endTime}
        onChange={(e) =>
          onSessionChange?.({ ...s, endTime: e.target.value })
        }
        aria-label="End time"
        style={inputShell(38)}
      />
    </>
  );

  const sessionFields = (
    <div
      data-name="edit-job-session-session-fields"
      style={{ marginTop: space('Spacing/8'), width: '100%' }}
    >
      <div
        data-name="edit-job-session-session-fields-stack"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space('Spacing/8'),
          width: '100%',
        }}
      >
        {sessionBody}
      </div>
    </div>
  );

  const jobFields = (
    <div
      data-name="edit-job-session-job-fields"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space('Spacing/8'),
        width: '100%',
        maxWidth: 343,
      }}
    >
      {children ?? defaultJobBody}
    </div>
  );

  return (
    <section
      className={className}
      data-name="edit-job-session-sheet"
      aria-labelledby={titleId}
      style={{
        width: '100%',
        maxWidth: 391,
        minHeight,
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
        data-name="edit-job-session-content"
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
          data-name="edit-job-session-drag-handle"
          style={{
            width: 40,
            height: 6,
            borderRadius: 9999,
            backgroundColor: handleBg,
            flexShrink: 0,
          }}
          aria-hidden
        />

        <div
          data-name="edit-job-session-body"
          style={{
            width: '100%',
            maxWidth: 343,
            display: 'flex',
            flexDirection: 'column',
            gap: space('Spacing/12'),
            flex: isSession ? 1 : undefined,
            minHeight: 0,
          }}
        >
          <button
            type="button"
            data-name="edit-job-session-back-button"
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
              alignSelf: 'flex-start',
            }}
          >
            <span data-name="edit-job-session-back-icon">
              <ChevronBackIcon />
            </span>
            <span data-name="edit-job-session-back-label">Back</span>
          </button>

          <div
            data-name="edit-job-session-header"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space('Spacing/12'),
            }}
          >
            {isSession ? (
              <span data-name="edit-job-session-title-icon">
                <SessionClockIcon />
              </span>
            ) : null}
            <div
              data-name="edit-job-session-title"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <h2
                data-name="edit-job-session-title-text"
                id={titleId}
                style={{
                  margin: 0,
                  ...typographyTitleH3Style(),
                  color: fg,
                  whiteSpace: 'nowrap',
                }}
              >
                {isSession ? 'Edit Session' : 'Edit Job'}
              </h2>
            </div>
          </div>

          {isSession ? sessionFields : null}
        </div>

        {!isSession ? jobFields : null}

        <div data-name="edit-job-session-footer" style={{ width: '100%', maxWidth: 343 }}>
          <FieldSoloCtaButton
            variant="jobSessionPrimaryWithDelete"
            primaryLabel="SAVE CHANGES"
            onPrimaryClick={onSaveChanges}
            onDeleteClick={onDelete}
          />
        </div>
      </div>
    </section>
  );
}
