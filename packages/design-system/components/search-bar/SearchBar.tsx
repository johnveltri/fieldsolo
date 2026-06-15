import type { CSSProperties, InputHTMLAttributes } from 'react';
import { useId, useRef, useState } from 'react';
import {
  color,
  colorWithAlpha,
  shadow,
  space,
  typographyBodyBoldStyle,
  typographyBodySmallStyle,
  typographyInputSmallStyle,
  typographyInputStyle,
} from '../../lib/tokens';

const fieldShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Card/Default'),
};

const panelShadow: CSSProperties = {
  boxShadow: shadow('Shadow/Card/Default'),
};

function SearchGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx={11}
        cy={11}
        r={7}
        stroke="currentColor"
        strokeWidth={2}
      />
      <path
        d="M20 20l-4.2-4.2"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClearGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.5 3.5l7 7M10.5 3.5l-7 7"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export type SearchBarProps = {
  value: string;
  onChange: (next: string) => void;
  /** Default: `Search jobs or customers...` */
  placeholder?: string;
  /** Renders Figma **Empty State Results** panel below the field. */
  showEmptyHint?: boolean;
  emptyHintTitle?: string;
  emptyHintSubtitle?: string;
  onClear?: () => void;
  /** Max width matches Figma frame (345). */
  maxWidth?: number;
  className?: string;
  style?: CSSProperties;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'placeholder' | 'type' | 'style'
  >;
};

/**
 * Search field (Figma: **Search bar** component set `790:261`).
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search by short description or customer',
  showEmptyHint = false,
  emptyHintTitle = 'Start typing to search jobs',
  emptyHintSubtitle = 'Search by short description or customer',
  onClear,
  maxWidth = 345,
  className,
  style,
  inputProps,
}: SearchBarProps) {
  const {
    className: inputClassNameProp,
    ...restInputProps
  } = inputProps ?? {};
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const inputClass = [inputClassNameProp, `fieldsolo-search-bar-${uid}`]
    .filter(Boolean)
    .join(' ');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholderColor = color('Foundation/Text/Secondary');

  const showClear = value.length > 0;

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const borderColor = focused
    ? color('Brand/PrimaryStroke')
    : color('Foundation/Border/Subtle');
  const borderWidth = focused ? 2 : 1;

  const inputStyle: CSSProperties = {
    ...typographyInputStyle(),
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color:
      value.length > 0
        ? color('Foundation/Text/Primary')
        : color('Foundation/Text/Secondary'),
  };

  const row: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth,
    display: 'flex',
    flexDirection: 'column',
    gap: space('Spacing/8'),
  };

  const fieldRow: CSSProperties = {
    position: 'relative',
    height: 48,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 48,
    paddingRight: space('Spacing/20'),
    paddingTop: space('Spacing/12'),
    paddingBottom: space('Spacing/12'),
    backgroundColor: color('Foundation/Surface/White'),
    border: `${borderWidth}px solid ${borderColor}`,
    borderRadius: 12,
    ...fieldShadow,
  };

  const iconAbs: CSSProperties = {
    position: 'absolute',
    left: space('Spacing/16'),
    top: 14,
    width: 20,
    height: 20,
    color: color('Foundation/Text/Secondary'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  const clearBtn: CSSProperties = {
    flexShrink: 0,
    width: 14 + 10,
    height: 14 + 10,
    padding: 5,
    boxSizing: 'border-box',
    border: 'none',
    borderRadius: 9999,
    backgroundColor: colorWithAlpha('Foundation/Text/Primary', 0.1),
    color: color('Foundation/Text/Secondary'),
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const hintPanel: CSSProperties = {
    width: '100%',
    maxWidth,
    boxSizing: 'border-box',
    minHeight: 159,
    paddingLeft: space('Spacing/20'),
    paddingRight: space('Spacing/20'),
    paddingTop: space('Spacing/16'),
    paddingBottom: space('Spacing/16'),
    backgroundColor: color('Foundation/Surface/Default'),
    border: `1px solid ${color('Foundation/Border/Subtle')}`,
    borderRadius: 16,
    ...panelShadow,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space('Spacing/8'),
    position: 'relative',
    overflow: 'hidden',
  };

  const hintIconWrap: CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: 14,
    width: 32,
    height: 32,
    color: color('Foundation/Text/Secondary'),
    opacity: 0.35,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div data-name="search-bar" className={className} style={{ ...row, ...style }}>
      <style>{`
        .fieldsolo-search-bar-${uid}::placeholder {
          color: ${placeholderColor};
          opacity: 1;
        }
      `}</style>
      <div data-name="search-bar-field" style={fieldRow}>
        <span data-name="search-bar-search-icon" style={iconAbs}>
          <SearchGlyph size={20} />
        </span>
        <input
          data-name="search-bar-input"
          ref={inputRef}
          className={inputClass}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
          autoComplete="off"
          {...restInputProps}
        />
        {showClear && (
          <button
            type="button"
            data-name="search-bar-clear-button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            style={clearBtn}
          >
            <span data-name="search-bar-clear-icon">
              <ClearGlyph size={14} />
            </span>
          </button>
        )}
      </div>

      {showEmptyHint && (
        <div data-name="search-bar-empty-results-panel" style={hintPanel}>
          <span data-name="search-bar-empty-results-icon" style={hintIconWrap} aria-hidden>
            <SearchGlyph size={32} />
          </span>
          <p
            data-name="search-bar-empty-results-title"
            style={{
              ...typographyBodyBoldStyle(),
              color: color('Foundation/Text/Secondary'),
              textAlign: 'center',
              margin: 0,
            }}
          >
            {emptyHintTitle}
          </p>
          <p
            data-name="search-bar-empty-results-subtitle"
            style={{
              ...typographyInputSmallStyle(),
              color: color('Foundation/Text/Secondary'),
              textAlign: 'center',
              margin: 0,
            }}
          >
            {emptyHintSubtitle}
          </p>
        </div>
      )}
    </div>
  );
}
