import React from 'react';

const initialsOf = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'S';

// Profile photo with an initials fallback, used in the navbar, onboarding form and profile header.
export default function Avatar({ src, name, size = 40, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}` : 'Profile photo'}
        style={style}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      aria-label={name || 'Profile'}
      className={`rounded-full shrink-0 bg-gradient-to-br from-[#2E7D68] to-[#1C4A57] text-[#F1EEE3] font-black flex items-center justify-center select-none ${className}`}
    >
      {initialsOf(name)}
    </div>
  );
}
