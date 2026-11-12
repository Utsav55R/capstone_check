import React from 'react';

/**
 * InterviewerAvatar
 * Visual avatar component for Saraswati — Senior Technical Recruiter & Talent Acquisition Lead.
 * Features clean Indian corporate recruiter branding with live Online / Typing... badge.
 */
export default function InterviewerAvatar({ 
  size = 48, 
  isTyping = false, 
  showDetails = true,
  statusText = "Online • AI Recruiter" 
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Avatar Container with pulse ring */}
      <div className="relative shrink-0">
        <div 
          style={{ width: size, height: size }}
          className="rounded-full bg-gradient-to-tr from-[#1C4A57] via-[#2E7D68] to-[#CFE3E0] p-0.5 shadow-md flex items-center justify-center"
        >
          <div className="w-full h-full rounded-full bg-[#1C4A57] flex items-center justify-center overflow-hidden border-2 border-white">
            {/* Stylized Avatar SVG for Saraswati (Indian Corporate Working Professional) */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full text-[#EAE5D6]"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background gradient */}
              <circle cx="50" cy="50" r="50" fill="#1C4A57" />
              {/* Corporate Blazer / Sari Collar */}
              <path d="M20 90 C 25 68, 40 60, 50 60 C 60 60, 75 68, 80 90 Z" fill="#143741" />
              <path d="M40 60 L50 85 L60 60 Z" fill="#CFE3E0" />
              <path d="M35 65 Q 50 78 65 65 L 50 100 Z" fill="#D95D39" opacity="0.85" />
              {/* Neck */}
              <rect x="44" y="48" width="12" height="15" rx="4" fill="#E8B896" />
              {/* Face */}
              <ellipse cx="50" cy="38" rx="16" ry="19" fill="#E8B896" />
              {/* Bindi dot */}
              <circle cx="50" cy="30" r="1.5" fill="#D95D39" />
              {/* Hair (Professional Corporate Bun/Hairstyle) */}
              <path d="M32 36 Q 30 20 50 18 Q 70 20 68 36 Q 66 22 50 22 Q 34 22 32 36 Z" fill="#2A1B17" />
              <path d="M32 34 C 30 15, 70 15, 68 34 C 74 20, 26 20, 32 34 Z" fill="#1A100C" />
              <circle cx="50" cy="14" r="8" fill="#1A100C" />
              {/* Eyes & Warm Smile */}
              <ellipse cx="44" cy="37" rx="2" ry="2.5" fill="#2A1B17" />
              <ellipse cx="56" cy="37" rx="2" ry="2.5" fill="#2A1B17" />
              {/* Eyebrows */}
              <path d="M41 33 Q 44 31 47 33" stroke="#2A1B17" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M53 33 Q 56 31 59 33" stroke="#2A1B17" strokeWidth="1.2" strokeLinecap="round" />
              {/* Gentle Smile */}
              <path d="M45 46 Q 50 50 55 46" stroke="#2A1B17" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              {/* Headset Mic (Recruiter Call Gear) */}
              <path d="M32 36 Q 28 42 34 50 L 42 50" stroke="#CFE3E0" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="42" cy="50" r="2.5" fill="#CFE3E0" />
            </svg>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
          <span className="relative flex h-3.5 w-3.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isTyping ? 'bg-[#D95D39]' : 'bg-[#2E7D68]'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white ${isTyping ? 'bg-[#D95D39]' : 'bg-[#2E7D68]'}`}></span>
          </span>
        </div>
      </div>

      {/* Recruiter Details */}
      {showDetails && (
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <h3 className="font-extrabold text-sm text-[#1C4A57] tracking-tight">Saraswati</h3>
            <span className="bg-[#CFE3E0] text-[#1C4A57] text-[10px] font-bold px-2 py-0.2 rounded-full border border-[#1C4A57]/20">
              AI Recruiter
            </span>
          </div>
          <p className="text-[11px] text-[#1C4A57]/75 font-medium leading-tight">
            Senior Talent Acquisition Lead
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[10px] font-bold ${isTyping ? 'text-[#D95D39] animate-pulse' : 'text-[#2E7D68]'}`}>
              {isTyping ? 'Saraswati is typing response...' : statusText}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
