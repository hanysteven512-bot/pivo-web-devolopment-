import React from 'react';

interface PivoLogoProps {
  className?: string;
  inverted?: boolean;
}

/**
 * Official PIVO Brand Identity
 * Bold black architectural PIVO lettering on a clean white background
 * (or inverted white lettering on a dark surface).
 */
export const PivoLogo: React.FC<PivoLogoProps> = ({ className = 'h-7', inverted = false }) => {
  const fg = inverted ? '#FFFFFF' : '#0A0A0A';
  return (
    <svg
      viewBox="0 0 184 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
      aria-label="PIVO"
      role="img"
    >
      {/* P */}
      <path
        d="M4 6H25.5C33.5 6 39 10.8 39 18.5C39 26.2 33.5 31 25.5 31H13.5V42H4V6ZM13.5 23H24.2C27.6 23 29.6 21.3 29.6 18.5C29.6 15.7 27.6 14 24.2 14H13.5V23Z"
        fill={fg}
      />
      {/* I */}
      <path d="M47 6H56.5V42H47V6Z" fill={fg} />
      {/* V */}
      <path
        d="M64 6H74.2L84.5 31.4L94.8 6H104.8L89.3 42H79.5L64 6Z"
        fill={fg}
      />
      {/* O */}
      <path
        d="M128.5 5.2C140.4 5.2 148.8 13.1 148.8 24C148.8 34.9 140.4 42.8 128.5 42.8C116.6 42.8 108.2 34.9 108.2 24C108.2 13.1 116.6 5.2 128.5 5.2ZM128.5 34.2C134.8 34.2 139.1 30.1 139.1 24C139.1 17.9 134.8 13.8 128.5 13.8C122.2 13.8 117.9 17.9 117.9 24C117.9 30.1 122.2 34.2 128.5 34.2Z"
        fill={fg}
      />
      {/* Minimal architectural square period mark */}
      <rect x="156" y="33" width="9" height="9" fill={fg} />
    </svg>
  );
};
