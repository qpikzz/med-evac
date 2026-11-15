import { useId } from "react";

interface OrbitaLogoProps {
  size?: number;
  className?: string;
}

function OrbitaLogo({ size = 32, className }: OrbitaLogoProps) {
  const gradientId = `orbita-logo-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="ORBITA"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="6"
          x2="56"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="10" fill={`url(#${gradientId})`} />
      <circle
        cx="32"
        cy="32"
        r="12.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.4"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="23"
        ry="8.5"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.92"
        strokeWidth="2.2"
        transform="rotate(-28 32 32)"
      />
      <circle cx="52.3" cy="21.2" r="2.7" fill="#FFFFFF" />
      <path
        d="M23 32h4.4l2.1-4.2 3 8.8 2.4-6.2 1.6 1.6H41"
        fill="none"
        stroke="#DBEAFE"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default OrbitaLogo;
