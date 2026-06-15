import type { CSSProperties, ReactNode } from 'react';
import {
  color,
  shadow,
  space,
  typographyBodyBoldStyle,
  typographyBodySmallStyle,
  typographyDisplayH1Style,
} from '../../lib/tokens';
import { InboxIcon } from '../inbox-icon';

export const TOP_HEADER_VARIANTS = [
  'Title + Profile',
  'Title Only',
  'Title + Inbox',
  'Title + Back',
  'Title + Back + Subtitle',
  'X (Close &Edit)',
] as const;

export type TopHeaderVariant = (typeof TOP_HEADER_VARIANTS)[number];

export type TopHeaderProps = {
  variant: TopHeaderVariant;
  /** Overrides default placeholder title for the variant (see spec.json). */
  title?: string;
  /** Second line when variant is `Title + Back + Subtitle`. */
  subtitle?: string;
  /** Inbox badge count when variant is `Title + Inbox` (hidden if undefined or 0). */
  inboxBadgeCount?: number;
  className?: string;
  style?: CSSProperties;
  onProfileClick?: () => void;
  onInboxClick?: () => void;
  onBackClick?: () => void;
  onCloseClick?: () => void;
  onEditClick?: () => void;
};

const DEFAULT_TITLE: Record<TopHeaderVariant, string | undefined> = {
  'Title + Profile': 'FIELDSOLO',
  'Title Only': 'EARNINGS',
  'Title + Inbox': 'JOBS',
  'Title + Back': 'PROFILE',
  'Title + Back + Subtitle': 'INBOX',
  'X (Close &Edit)': undefined,
};

/** Matches Figma `Top Header` (`231:817`) frame width; height hugs content. */
export const TOP_HEADER_MAX_WIDTH = 393;

const shell = (bg: string, extra?: CSSProperties): CSSProperties => ({
  position: 'relative',
  width: '100%',
  maxWidth: TOP_HEADER_MAX_WIDTH,
  boxSizing: 'border-box',
  backgroundColor: bg,
  boxShadow: shadow('Shadow/Card/Default'),
  display: 'flex',
  flexDirection: 'column',
  ...extra,
});

function TitleText({
  children,
  style: titleWrapStyle,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      data-name="top-header-title"
      style={{ minWidth: 0, ...titleWrapStyle }}
    >
      <span
        style={{
          ...typographyDisplayH1Style(),
          color: color('Foundation/Text/Primary'),
          margin: 0,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function IconProfile({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBack({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPencil({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20l4.5-1 9-9-3.5-3.5-9 9L4 20z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Top app header (Figma: `Top Header`, node 231:817). See `./spec.json`.
 */
export function TopHeader({
  variant,
  title,
  subtitle = 'Unsorted quick captures',
  inboxBadgeCount,
  className,
  style,
  onProfileClick,
  onInboxClick,
  onBackClick,
  onCloseClick,
  onEditClick,
}: TopHeaderProps) {
  const bg = color('Foundation/Background/Default');
  const accent = color('Brand/Accent');
  const primary = color('Foundation/Text/Primary');
  const secondary = color('Foundation/Text/Secondary');
  const subtle = color('Foundation/Surface/Subtle');
  const errBg = color('Semantic/Status/Error/BG');
  const errFg = color('Semantic/Status/Error/Text');

  const showAccent = ['Title + Profile', 'Title Only', 'Title + Inbox'].includes(
    variant
  );
  const displayTitle = title ?? DEFAULT_TITLE[variant];

  const rowPad = {
    paddingLeft: space('Spacing/20'),
    paddingRight: variant === 'X (Close &Edit)' ? 24 : space('Spacing/20'),
    paddingBottom: space('Spacing/16'),
  };

  const titleBlock = displayTitle ? <TitleText>{displayTitle}</TitleText> : null;

  if (variant === 'X (Close &Edit)') {
    return (
      <header
        className={className}
        style={{
          ...shell(bg, style),
          paddingTop: space('Spacing/40'),
        }}
        aria-label="Header"
      >
        <div
          data-name="top-header-content"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            ...rowPad,
            paddingTop: 0,
          }}
        >
          <div data-name="top-header-leading-action">
            <button
              type="button"
              aria-label="Close"
              onClick={onCloseClick}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9999,
                border: 'none',
                backgroundColor: subtle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: onCloseClick ? 'pointer' : 'default',
              }}
            >
              <span data-name="top-header-icon">
                <IconClose />
              </span>
            </button>
          </div>
          <button
            type="button"
            data-name="top-header-trailing-action"
            onClick={onEditClick}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space('Spacing/8'),
              height: 24,
              paddingLeft: space('Spacing/12'),
              paddingRight: space('Spacing/12'),
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: 9999,
              border: 'none',
              backgroundColor: errBg,
              cursor: onEditClick ? 'pointer' : 'default',
              color: errFg,
              boxSizing: 'border-box',
            }}
          >
            <span data-name="top-header-icon">
              <IconPencil size={14} />
            </span>
            <span
              style={{
                ...typographyBodySmallStyle(),
                color: errFg,
                textTransform: 'uppercase',
              }}
            >
              EDIT
            </span>
          </button>
        </div>
      </header>
    );
  }

  if (variant === 'Title + Back + Subtitle') {
    return (
      <header
        className={className}
        style={{
          ...shell(bg, style),
          paddingTop: space('Spacing/40'),
          gap: space('Spacing/8'),
        }}
        aria-label="Header"
      >
        <div
          data-name="top-header-content"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: space('Spacing/8'),
            ...rowPad,
            paddingTop: 0,
          }}
        >
          <div data-name="top-header-leading-action">
            <button
              type="button"
              aria-label="Back"
              onClick={onBackClick}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                color: primary,
                cursor: onBackClick ? 'pointer' : 'default',
                display: 'flex',
              }}
            >
              <span data-name="top-header-icon">
                <IconBack />
              </span>
            </button>
          </div>
          {titleBlock}
        </div>
        <div
          data-name="top-header-subtitle"
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingLeft: space('Spacing/32'),
            paddingRight: space('Spacing/32'),
            paddingBottom: space('Spacing/16'),
          }}
        >
          <span
            style={{
              ...typographyBodyBoldStyle(),
              color: secondary,
            }}
          >
            {subtitle}
          </span>
        </div>
      </header>
    );
  }

  if (variant === 'Title + Back') {
    return (
      <header
        className={className}
        style={{
          ...shell(bg, style),
          paddingTop: space('Spacing/40'),
        }}
        aria-label="Header"
      >
        <div
          data-name="top-header-content"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: space('Spacing/8'),
            width: '100%',
            ...rowPad,
            paddingTop: 0,
          }}
        >
          <div data-name="top-header-leading-action">
            <button
              type="button"
              aria-label="Back"
              onClick={onBackClick}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                color: primary,
                cursor: onBackClick ? 'pointer' : 'default',
                display: 'flex',
              }}
            >
              <span data-name="top-header-icon">
                <IconBack />
              </span>
            </button>
          </div>
          {titleBlock}
        </div>
      </header>
    );
  }

  // Accent variants: Profile | Only | Inbox
  const titleOnly = variant === 'Title Only';

  return (
    <header
      className={className}
      style={{
        ...shell(bg, style),
        gap: showAccent ? space('Spacing/40') : 0,
      }}
      aria-label="Header"
    >
      {showAccent && (
        <div
          data-name="top-header-accent-strip"
          style={{
            height: 6,
            width: '100%',
            backgroundColor: accent,
            flexShrink: 0,
          }}
        />
      )}
      <div
        data-name="top-header-content"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          ...rowPad,
          paddingTop: 0,
          minHeight: titleOnly ? 48 : 40,
        }}
      >
        {titleOnly ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'stretch',
              flex: '1 1 0',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <TitleText style={{ flex: '1 1 0' }}>
              {displayTitle ?? ''}
            </TitleText>
          </div>
        ) : (
          <>
            <TitleText style={{ flex: '1 1 auto' }}>
              {displayTitle ?? ''}
            </TitleText>

            {variant === 'Title + Profile' && (
              <button
                type="button"
                data-name="top-header-trailing-action"
                aria-label="Profile"
                onClick={onProfileClick}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  border: 'none',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: primary,
                  backgroundColor: 'transparent',
                  cursor: onProfileClick ? 'pointer' : 'default',
                }}
              >
                <span data-name="top-header-icon">
                  <IconProfile />
                </span>
              </button>
            )}

            {variant === 'Title + Inbox' && (
              <button
                type="button"
                data-name="top-header-trailing-action"
                aria-label="Inbox"
                onClick={onInboxClick}
                style={{
                  width: 40,
                  height: 40,
                  border: 'none',
                  flexShrink: 0,
                  backgroundColor: 'transparent',
                  color: primary,
                  cursor: onInboxClick ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <InboxIcon
                  property1={
                    inboxBadgeCount != null && inboxBadgeCount > 0
                      ? 'Default'
                      : 'No Notifications'
                  }
                  badgeCount={inboxBadgeCount ?? 0}
                  size={40}
                />
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
