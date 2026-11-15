import { useId } from "react";

interface OrbitaLogoProps {
  size?: number;
  className?: string;
}

function OrbitaLogo({ size = 32, className }: OrbitaLogoProps) {
  const idPrefix = `orbita-logo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const gradientId = `${idPrefix}-g`;
  const orbitGradientId = `${idPrefix}-g2`;
  const frontClipId = `${idPrefix}-front`;

  return (
    <svg
      className={className}
      width={(size * 432) / 316}
      height={size}
      viewBox="40 98 432 316"
      role="img"
      aria-label="ORBITA"
      focusable="false"
    >
      <title>ORBITA</title>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="70"
          y1="440"
          x2="450"
          y2="70"
        >
          <stop offset="0" stopColor="#3FB2FF" />
          <stop offset="1" stopColor="#9B6BFF" />
        </linearGradient>
        <linearGradient
          id={orbitGradientId}
          gradientUnits="userSpaceOnUse"
          gradientTransform="rotate(18 256 256)"
          x1="70"
          y1="440"
          x2="450"
          y2="70"
        >
          <stop offset="0" stopColor="#3FB2FF" />
          <stop offset="1" stopColor="#9B6BFF" />
        </linearGradient>
        <clipPath id={frontClipId}>
          <rect x="0" y="256" width="512" height="256" />
        </clipPath>
      </defs>

      <g transform="rotate(-18 256 256)">
        <path
          fill={`url(#${orbitGradientId})`}
          fillRule="evenodd"
          d="M51 256A205 54 0 1 0 461 256A205 54 0 1 0 51 256Z
             M53 252A203 44 0 1 0 459 252A203 44 0 1 0 53 252Z"
        />
      </g>

      <path
        fill={`url(#${gradientId})`}
        d="M256 148A108 108 0 0 0 256 364A86 108 0 0 1 256 148Z
           M256 148A108 108 0 0 1 256 364A86 108 0 0 0 256 148Z"
      />

      <ellipse
        cx="256"
        cy="256"
        rx="68"
        ry="94"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
      />

      <path fill="#D6ECFF" d="M256 112Q262 256 256 400Q250 256 256 112Z" />

      <path
        fill="#D6ECFF"
        d="M256 218Q263 249 290 256Q263 263 256 294Q249 263 222 256Q249 249 256 218Z"
      />

      <g transform="rotate(-18 256 256)">
        <g clipPath={`url(#${frontClipId})`}>
          <path
            fill={`url(#${orbitGradientId})`}
            fillRule="evenodd"
            d="M51 256A205 54 0 1 0 461 256A205 54 0 1 0 51 256Z
               M53 252A203 44 0 1 0 459 252A203 44 0 1 0 53 252Z"
          />
        </g>
      </g>
    </svg>
  );
}

export default OrbitaLogo;
