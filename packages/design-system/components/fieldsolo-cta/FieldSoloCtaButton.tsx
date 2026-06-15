import type { CSSProperties } from 'react';
import {
  color,
  shadowFromColor,
  space,
  typographyBodyBoldStyle,
  typographyMetricStyle,
} from '../../lib/tokens';

const surfaceWhite = color('Foundation/Surface/Default');
const borderSubtle = color('Foundation/Border/Subtle');

export const FIELD_SOLO_CTA_VARIANTS = [
  'notePrimary',
  'notePrimaryWithDelete',
  'notePrimaryWithMore',
  'materialPrimary',
  'materialPrimaryWithDelete',
  'jobSessionPrimaryWithDelete',
  'brandPrimaryXl',
] as const;

export type FieldSoloCtaVariant = (typeof FIELD_SOLO_CTA_VARIANTS)[number];

function TrashGlyph({ strokeColor }: { strokeColor: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.5 4.5h9M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M12.5 4.5V13a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4.5M6.5 7.5v4M9.5 7.5v4"
        stroke={strokeColor}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Vertical “more” (⋮) — Figma asset frame ~14×30 (`Button Primary+MORE`). */
function MoreGlyph({ fill }: { fill: string }) {
  return (
    <svg
      width={14}
      height={30}
      viewBox="0 0 14 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="7" cy="7" r="2" fill={fill} />
      <circle cx="7" cy="15" r="2" fill={fill} />
      <circle cx="7" cy="23" r="2" fill={fill} />
    </svg>
  );
}

const labelNotePrimary: CSSProperties = {
  ...typographyBodyBoldStyle(),
  color: surfaceWhite,
  textTransform: 'uppercase',
  textAlign: 'center',
};

const labelBrandXl: CSSProperties = {
  ...typographyMetricStyle(),
  color: surfaceWhite,
  textTransform: 'uppercase',
  textAlign: 'center',
};

function primaryFillAndShadowForVariant(
  variant: Exclude<FieldSoloCtaVariant, 'brandPrimaryXl' | 'notePrimaryWithMore'>,
): { bg: string; shadow: CSSProperties } {
  const note = color('Semantic/Activity/Note');
  const material = color('Semantic/Activity/Material');
  const accent = color('Brand/Accent');
  const brandPrimary = color('Brand/Primary');

  switch (variant) {
    case 'notePrimary':
    case 'notePrimaryWithDelete':
      return { bg: note, shadow: { boxShadow: shadowFromColor(note) } };
    case 'materialPrimary':
    case 'materialPrimaryWithDelete':
      return { bg: material, shadow: { boxShadow: shadowFromColor(material) } };
    case 'jobSessionPrimaryWithDelete':
      return {
        bg: accent,
        shadow: { boxShadow: shadowFromColor(brandPrimary) },
      };
    default: {
      const _n: never = variant;
      return _n;
    }
  }
}

function notePrimaryFillAndShadow(): { bg: string; shadow: CSSProperties } {
  const note = color('Semantic/Activity/Note');
  return { bg: note, shadow: { boxShadow: shadowFromColor(note) } };
}

export type FieldSoloCtaButtonProps = {
  variant: FieldSoloCtaVariant;
  /** Default: `SAVE TO JOB` / `SAVE CHANGES` / `END SESSION` / `MARK COMPLETED` per variant. */
  primaryLabel?: string;
  onPrimaryClick?: () => void;
  /** Primary + delete row variants only. */
  onDeleteClick?: () => void;
  /** `notePrimaryWithMore` only — secondary column (⋮). */
  onMoreClick?: () => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * High-emphasis CTAs from FieldSolo (Figma **Button** `1287:1563`):
 * note / material / job-session tint fills + self-shadow, brand XL, optional delete or more column.
 */
export function FieldSoloCtaButton({
  variant,
  primaryLabel,
  onPrimaryClick,
  onDeleteClick,
  onMoreClick,
  className,
  style,
}: FieldSoloCtaButtonProps) {
  const brand = color('Brand/Primary');
  const deleteIcon = color('Semantic/Status/Error/Text');
  const moreIcon = color('Foundation/Text/Primary');
  const xlShadow: CSSProperties = {
    boxShadow: shadowFromColor(brand),
  };

  const resolvedPrimaryLabel =
    primaryLabel ??
    (variant === 'brandPrimaryXl'
      ? 'END SESSION'
      : variant === 'notePrimary' || variant === 'materialPrimary'
        ? 'SAVE TO JOB'
        : variant === 'notePrimaryWithMore'
          ? 'MARK COMPLETED'
          : 'SAVE CHANGES');

  const primaryButtonBase: CSSProperties = {
    margin: 0,
    border: 'none',
    borderRadius: 12,
    cursor: onPrimaryClick ? 'pointer' : 'default',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 100,
    paddingRight: 100,
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: 343,
  };

  if (variant === 'brandPrimaryXl') {
    return (
      <button
        data-name="fieldsolo-cta-xl"
        type="button"
        className={className}
        onClick={onPrimaryClick}
        style={{
          ...primaryButtonBase,
          backgroundColor: brand,
          paddingTop: space('Spacing/24'),
          paddingBottom: space('Spacing/24'),
          ...xlShadow,
          ...style,
        }}
      >
        <span data-name="fieldsolo-cta-label" style={labelBrandXl}>
          {resolvedPrimaryLabel}
        </span>
      </button>
    );
  }

  if (variant === 'notePrimaryWithMore') {
    const { bg: primaryBg, shadow: primaryShadow } = notePrimaryFillAndShadow();
    return (
      <div
        data-name="fieldsolo-cta-with-more"
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 18,
          width: '100%',
          maxWidth: 343,
          boxSizing: 'border-box',
          paddingLeft: 1,
          paddingRight: 1,
          overflow: 'hidden',
          ...style,
        }}
      >
        <button
          data-name="fieldsolo-cta-primary"
          type="button"
          onClick={onPrimaryClick}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            margin: 0,
            border: 'none',
            borderRadius: 12,
            backgroundColor: primaryBg,
            cursor: onPrimaryClick ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 100,
            paddingRight: 100,
            paddingTop: 17,
            paddingBottom: 17,
            ...primaryShadow,
          }}
        >
          <span data-name="fieldsolo-cta-label" style={labelNotePrimary}>
            {resolvedPrimaryLabel}
          </span>
        </button>
        <button
          data-name="fieldsolo-cta-more"
          type="button"
          onClick={onMoreClick}
          aria-label="More options"
          style={{
            flexShrink: 0,
            height: 51,
            margin: 0,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 8,
            border: `1px solid ${borderSubtle}`,
            backgroundColor: surfaceWhite,
            cursor: onMoreClick ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span data-name="fieldsolo-cta-more-icon">
            <MoreGlyph fill={moreIcon} />
          </span>
        </button>
      </div>
    );
  }

  const { bg: primaryBg, shadow: primaryShadow } =
    primaryFillAndShadowForVariant(variant);

  if (variant === 'notePrimary' || variant === 'materialPrimary') {
    return (
      <button
        data-name="fieldsolo-cta-primary"
        type="button"
        className={className}
        onClick={onPrimaryClick}
        style={{
          ...primaryButtonBase,
          backgroundColor: primaryBg,
          paddingTop: 17,
          paddingBottom: 17,
          ...primaryShadow,
          ...style,
        }}
      >
        <span data-name="fieldsolo-cta-label" style={labelNotePrimary}>
          {resolvedPrimaryLabel}
        </span>
      </button>
    );
  }

  const isJobSessionRow = variant === 'jobSessionPrimaryWithDelete';

  return (
    <div
      data-name="fieldsolo-cta-with-delete"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 18,
        width: '100%',
        maxWidth: 343,
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
    >
      <button
        data-name="fieldsolo-cta-primary"
        type="button"
        onClick={onPrimaryClick}
        style={{
          ...(isJobSessionRow
            ? {
                flex: 'none',
                width: 279,
                flexShrink: 0,
              }
            : { flex: '1 1 0', minWidth: 0 }),
          margin: 0,
          border: 'none',
          borderRadius: 12,
          backgroundColor: primaryBg,
          cursor: onPrimaryClick ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 100,
          paddingRight: 100,
          paddingTop: 17,
          paddingBottom: 17,
          ...primaryShadow,
        }}
      >
        <span data-name="fieldsolo-cta-label" style={labelNotePrimary}>
          {resolvedPrimaryLabel}
        </span>
      </button>
      <button
        data-name="fieldsolo-cta-delete"
        type="button"
        onClick={onDeleteClick}
        aria-label="Delete"
        style={{
          flexShrink: 0,
          alignSelf: 'stretch',
          margin: 0,
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 18,
          paddingBottom: 18,
          borderRadius: 8,
          border: `1px solid ${borderSubtle}`,
          backgroundColor: surfaceWhite,
          cursor: onDeleteClick ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
        }}
      >
        <span data-name="fieldsolo-cta-delete-icon">
          <TrashGlyph strokeColor={deleteIcon} />
        </span>
      </button>
    </div>
  );
}
