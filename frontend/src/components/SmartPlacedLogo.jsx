import React from 'react';

/**
 * SmartPlacedLogo
 * Reusable brand logo component matching the official SmartPlaced AI visual identity.
 * Uses inline SVG — no external asset dependency.
 *
 * Props:
 *   size        – pixel size of the icon square (default 40)
 *   variant     – "light" (icon teal on cream, for dark backgrounds)
 *               | "dark"  (icon cream on teal, for light backgrounds)
 *   showText    – render wordmark alongside icon (default true)
 *   showTagline – render the tagline below wordmark (default true)
 */
export default function SmartPlacedLogo({
  size = 40,
  variant = 'light',
  showText = true,
  showTagline = true,
  onClickDashboard,
}) {
  const bg    = variant === 'light' ? '#1C4A57' : '#F1EEE3';
  const arrow = variant === 'light' ? '#CFE3E0' : '#1C4A57';
  const gear  = variant === 'light' ? '#EAE5D6' : '#1C4A57';
  const node  = variant === 'light' ? '#2E7D68' : '#2E7D68';
  const wordmarkColor  = variant === 'light' ? '#FFFFFF' : '#1C4A57';
  const taglineColor   = variant === 'light' ? 'rgba(207,227,224,0.85)' : 'rgba(28,74,87,0.65)';
  const iconRadius = Math.round(size * 0.22);

  return (
    <div
      className="flex items-center gap-3 cursor-pointer select-none"
      onClick={onClickDashboard}
      role="button"
      aria-label="Go to Dashboard"
    >
      {/* Icon Mark */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: iconRadius,
          background: bg,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(28,74,87,0.18)',
        }}
      >
        <svg
          width={size * 0.78}
          height={size * 0.78}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Upward trending arrow */}
          <polyline
            points="6,38 18,24 27,30 42,8"
            stroke={arrow}
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Arrow head */}
          <polyline
            points="34,7 43,7 43,16"
            stroke={arrow}
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Small gear top-left */}
          <circle cx="11" cy="13" r="4" stroke={gear} strokeWidth="2.2" fill="none" />
          <line x1="11" y1="8"  x2="11" y2="6"  stroke={gear} strokeWidth="2"  strokeLinecap="round" />
          <line x1="11" y1="18" x2="11" y2="20" stroke={gear} strokeWidth="2"  strokeLinecap="round" />
          <line x1="6"  y1="13" x2="4"  y2="13" stroke={gear} strokeWidth="2"  strokeLinecap="round" />
          <line x1="16" y1="13" x2="18" y2="13" stroke={gear} strokeWidth="2"  strokeLinecap="round" />
          {/* Network node bottom-right */}
          <circle cx="38" cy="38" r="2.5" fill={node} />
          <circle cx="30" cy="42" r="2"   fill={node} />
          <circle cx="44" cy="43" r="2"   fill={node} />
          <line x1="38" y1="38" x2="30" y2="42" stroke={node} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="38" y1="38" x2="44" y2="43" stroke={node} strokeWidth="1.5" strokeLinecap="round" />
          {/* Highlight dot on arrow peak */}
          <circle cx="42" cy="8" r="2.4" fill={arrow} />
        </svg>
      </div>

      {/* Wordmark */}
      {showText && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontWeight: 900,
                fontSize: size * 0.42,
                letterSpacing: '-0.02em',
                color: wordmarkColor,
                lineHeight: 1.1,
              }}
            >
              <span style={{ color: wordmarkColor }}>SmartPlaced</span>
              <span style={{ color: variant === 'light' ? '#CFE3E0' : '#2E7D68' }}> AI</span>
            </span>
          </div>
          {showTagline && (
            <p
              style={{
                fontSize: size * 0.225,
                color: taglineColor,
                fontWeight: 600,
                marginTop: 1,
                letterSpacing: '0.03em',
              }}
            >
              Assess. Learn. Practice. Improve. Get Placed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
