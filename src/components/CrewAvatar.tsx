import { useId } from "react";

interface CrewAvatarProps {
  profileId: string;
  size: number;
  className?: string;
}

type CrewAvatarVariant = "commander" | "medical" | "ground";

const KNOWN_VARIANTS: Record<string, CrewAvatarVariant> = {
  "astro-01": "commander",
  "astro-02": "medical",
  "ground-01": "ground",
};

const VARIANTS: CrewAvatarVariant[] = ["commander", "medical", "ground"];

export function crewAvatarVariantForProfile(profileId: string): CrewAvatarVariant {
  const knownVariant = KNOWN_VARIANTS[profileId];
  if (knownVariant) {
    return knownVariant;
  }
  let hash = 0;
  for (const character of profileId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return VARIANTS[hash % VARIANTS.length];
}

function CrewAvatar({ profileId, size, className }: CrewAvatarProps) {
  const variant = crewAvatarVariantForProfile(profileId);
  const gradientId = `crew-avatar-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          {variant === "commander" && (
            <>
              <stop offset="0" stopColor="#2563EB" />
              <stop offset="1" stopColor="#1D4ED8" />
            </>
          )}
          {variant === "medical" && (
            <>
              <stop offset="0" stopColor="#0284C7" />
              <stop offset="1" stopColor="#0369A1" />
            </>
          )}
          {variant === "ground" && (
            <>
              <stop offset="0" stopColor="#4F46E5" />
              <stop offset="1" stopColor="#3730A3" />
            </>
          )}
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${gradientId})`} />
      <circle
        cx="16"
        cy="16"
        r="13.5"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity=".25"
        strokeWidth="1"
      />
      {variant === "commander" && (
        <path
          d="m16 8 2.3 5.7L24 16l-5.7 2.3L16 24l-2.3-5.7L8 16l5.7-2.3L16 8Z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeLinejoin="round"
          strokeWidth=".5"
        />
      )}
      {variant === "medical" && (
        <path
          d="M8 16h4l2-4 3.5 8 2.5-5h4"
          fill="none"
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      )}
      {variant === "ground" && (
        <>
          <path
            d="M11 20a7 7 0 0 1 10 0M8 17a11 11 0 0 1 16 0"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
          <circle cx="16" cy="22" r="1.5" fill="#FFFFFF" />
        </>
      )}
    </svg>
  );
}

export default CrewAvatar;
