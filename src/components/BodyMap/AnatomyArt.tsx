// Stylised, coloured vector anatomy for the four body-map layers (own drawing, Apache-2.0).
// Decoration only: status colour is drawn by the hotspot layer on top. ViewBox 0 0 400 800.
import type { LayerId } from "./zones";

export const BODY_OUTLINE =
  "M184 124 C160 136 132 140 122 162 C112 186 108 250 100 320 C96 360 90 400 88 430 " +
  "C86 446 104 448 108 432 C114 400 122 350 132 290 L140 240 C142 300 136 360 138 420 " +
  "C140 500 146 620 150 740 C150 760 140 770 150 776 L186 776 C192 760 192 740 192 720 " +
  "C192 620 196 520 200 450 C204 520 208 620 208 720 C208 740 208 760 214 776 L250 776 " +
  "C260 770 250 760 250 740 C254 620 260 500 262 420 C264 360 258 300 260 240 L268 290 " +
  "C278 350 286 400 292 432 C296 448 314 446 312 430 C310 400 304 360 300 320 " +
  "C292 250 288 186 278 162 C268 140 240 136 216 124 Z";

function Defs() {
  return (
    <defs>
      <linearGradient id="an-skin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a5794" />
        <stop offset="0.55" stopColor="#24386a" />
        <stop offset="1" stopColor="#16244a" />
      </linearGradient>
      <radialGradient id="an-rim" cx="35%" cy="25%" r="80%">
        <stop offset="0" stopColor="#9fc0ff" stopOpacity="0.35" />
        <stop offset="1" stopColor="#9fc0ff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="an-muscle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff8a7a" />
        <stop offset="1" stopColor="#b8394d" />
      </linearGradient>
      <linearGradient id="an-bone" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f4efe2" />
        <stop offset="1" stopColor="#c9c1aa" />
      </linearGradient>
      <radialGradient id="an-brain" cx="45%" cy="40%" r="65%">
        <stop offset="0" stopColor="#ffc2d6" />
        <stop offset="1" stopColor="#d9799c" />
      </radialGradient>
      <radialGradient id="an-heart" cx="40%" cy="35%" r="70%">
        <stop offset="0" stopColor="#ff7b86" />
        <stop offset="1" stopColor="#b3203a" />
      </radialGradient>
      <linearGradient id="an-lung" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a9c8ff" stopOpacity="0.85" />
        <stop offset="1" stopColor="#6f8fe0" stopOpacity="0.7" />
      </linearGradient>
    </defs>
  );
}

function Body({ fill = "url(#an-skin)", opacity = 1 }: { fill?: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <circle cx="200" cy="78" r="44" fill={fill} />
      <path d={BODY_OUTLINE} fill={fill} />
    </g>
  );
}

function Outline() {
  return (
    <g fill="none" stroke="#7fa8ff" strokeOpacity="0.45" strokeWidth="1.4">
      <circle cx="200" cy="78" r="44" />
      <path d={BODY_OUTLINE} />
    </g>
  );
}

function SkinLayer() {
  return (
    <g>
      <Body />
      <Body fill="url(#an-rim)" />
      <g fill="none" stroke="#9fc0ff" strokeOpacity="0.18" strokeWidth="1">
        <path d="M168 160 C185 172 215 172 232 160" />
        <path d="M200 180 V420" strokeDasharray="2 8" />
        <path d="M170 520 C175 560 175 600 172 640 M230 520 C225 560 225 600 228 640" />
      </g>
      <Outline />
    </g>
  );
}

function MuscleLayer() {
  const m = "url(#an-muscle)";
  return (
    <g>
      <Body opacity={0.55} />
      <g fill={m} stroke="#ffb3a8" strokeOpacity="0.35" strokeWidth="1">
        <path d="M184 124 C176 132 162 140 152 146 L200 160 L248 146 C238 140 224 132 216 124 Z" />
        <ellipse cx="141" cy="170" rx="20" ry="24" />
        <ellipse cx="259" cy="170" rx="20" ry="24" />
        <path d="M160 168 C170 160 192 162 198 170 L198 214 C182 222 162 214 156 200 Z" />
        <path d="M240 168 C230 160 208 162 202 170 L202 214 C218 222 238 214 244 200 Z" />
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <rect x="182" y={228 + row * 38} width="16" height="32" rx="7" />
            <rect x="202" y={228 + row * 38} width="16" height="32" rx="7" />
          </g>
        ))}
        <path d="M158 226 C152 270 150 320 156 372 L176 378 L178 228 Z" />
        <path d="M242 226 C248 270 250 320 244 372 L224 378 L222 228 Z" />
        <ellipse cx="121" cy="236" rx="13" ry="34" transform="rotate(8 121 236)" />
        <ellipse cx="279" cy="236" rx="13" ry="34" transform="rotate(-8 279 236)" />
        <ellipse cx="106" cy="340" rx="10" ry="40" transform="rotate(6 106 340)" />
        <ellipse cx="294" cy="340" rx="10" ry="40" transform="rotate(-6 294 340)" />
        <ellipse cx="172" cy="510" rx="24" ry="78" transform="rotate(3 172 510)" />
        <ellipse cx="228" cy="510" rx="24" ry="78" transform="rotate(-3 228 510)" />
        <ellipse cx="168" cy="664" rx="16" ry="56" />
        <ellipse cx="232" cy="664" rx="16" ry="56" />
      </g>
      <g fill="none" stroke="#5a1424" strokeOpacity="0.35" strokeWidth="1">
        <path d="M166 470 C170 510 170 550 168 586 M178 466 C180 506 180 546 176 586" />
        <path d="M234 470 C230 510 230 550 232 586 M222 466 C220 506 220 546 224 586" />
        <path d="M168 182 L192 200 M232 182 L208 200" />
      </g>
      <Outline />
    </g>
  );
}

function OrganLayer() {
  return (
    <g>
      <Body opacity={0.45} />
      {/* blood vessels */}
      <g fill="none" strokeLinecap="round" strokeWidth="2.2">
        <path d="M206 250 V430 M206 430 C196 470 184 520 176 600 M206 430 C214 470 222 520 226 600" stroke="#ff5c6c" strokeOpacity="0.55" />
        <path d="M194 250 V430 M194 430 C186 470 176 520 170 600 M194 430 C200 470 214 520 232 600" stroke="#6f9bff" strokeOpacity="0.45" />
        <path d="M200 200 C170 196 140 200 124 240 C114 280 108 320 104 380" stroke="#ff5c6c" strokeOpacity="0.5" />
        <path d="M200 200 C230 196 260 200 276 240 C286 280 292 320 296 380" stroke="#ff5c6c" strokeOpacity="0.5" />
        <path d="M200 124 V150" stroke="#ff5c6c" strokeOpacity="0.55" />
      </g>
      {/* brain */}
      <ellipse cx="200" cy="72" rx="32" ry="26" fill="url(#an-brain)" />
      <path d="M200 48 V96 M182 60 C188 66 186 74 180 80 M218 60 C212 66 214 74 220 80 M174 74 C182 76 186 84 182 92 M226 74 C218 76 214 84 218 92" fill="none" stroke="#a2416a" strokeOpacity="0.6" strokeWidth="1.4" />
      {/* lungs */}
      <path d="M190 178 C168 172 152 196 150 236 C148 270 154 296 172 302 C186 304 192 290 192 270 Z" fill="url(#an-lung)" />
      <path d="M210 178 C232 172 248 196 250 236 C252 270 246 296 228 302 C214 304 208 290 208 270 Z" fill="url(#an-lung)" />
      {/* heart */}
      <path d="M212 236 C204 222 186 228 190 246 C193 260 206 270 214 278 C222 268 236 258 238 244 C240 226 220 222 212 236 Z" fill="url(#an-heart)" stroke="#ffb3bb" strokeOpacity="0.6" />
      {/* liver */}
      <path d="M150 304 C170 296 206 300 214 312 C204 330 178 340 156 336 C146 330 144 314 150 304 Z" fill="#b5524d" />
      {/* stomach */}
      <path d="M216 304 C238 300 254 312 250 330 C246 346 226 350 214 340 C206 330 206 312 216 304 Z" fill="#e58aa6" />
      {/* spleen */}
      <ellipse cx="258" cy="312" rx="9" ry="16" fill="#8e6bff" transform="rotate(20 258 312)" />
      {/* pancreas */}
      <path d="M178 340 C196 336 220 336 238 342 C236 350 214 352 196 350 C186 350 178 346 178 340 Z" fill="#f2a65a" />
      {/* kidneys */}
      <ellipse cx="174" cy="362" rx="9" ry="15" fill="#8f2e3e" />
      <ellipse cx="226" cy="362" rx="9" ry="15" fill="#8f2e3e" />
      {/* intestines */}
      <rect x="168" y="368" width="64" height="52" rx="22" fill="#d97a7a" opacity="0.85" />
      <path d="M176 380 C188 372 196 392 208 382 S226 376 224 392 S204 404 196 396 S178 400 180 410 S206 414 220 408" fill="none" stroke="#7a2b3a" strokeOpacity="0.5" strokeWidth="2" />
      {/* lymph nodes */}
      <g fill="#3fe0b0">
        <circle cx="182" cy="130" r="4" />
        <circle cx="218" cy="130" r="4" />
        <circle cx="148" cy="186" r="4" />
        <circle cx="252" cy="186" r="4" />
        <circle cx="182" cy="438" r="4" />
        <circle cx="218" cy="438" r="4" />
      </g>
      <Outline />
    </g>
  );
}

function SkeletonLayer() {
  const b = "url(#an-bone)";
  return (
    <g>
      <Body opacity={0.35} />
      <g fill={b} stroke="#8d8672" strokeWidth="1">
        <ellipse cx="200" cy="74" rx="34" ry="38" />
        <path d="M180 100 C186 116 214 116 220 100 L216 112 C210 120 190 120 184 112 Z" />
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} x="194" y={128 + i * 22} width="12" height="16" rx="4" />
        ))}
        <path d="M148 150 C170 142 186 144 196 150 L196 156 C186 152 170 152 150 158 Z" />
        <path d="M252 150 C230 142 214 144 204 150 L204 156 C214 152 230 152 250 158 Z" />
        <path d="M156 410 C164 392 184 390 200 400 C216 390 236 392 244 410 C246 432 230 446 216 440 L200 430 L184 440 C170 446 154 432 156 410 Z" />
      </g>
      <g fill="none" stroke={b} strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} strokeWidth="5">
            <path d={`M194 ${178 + i * 24} C170 ${170 + i * 24} 152 ${182 + i * 24} 150 ${200 + i * 24}`} />
            <path d={`M206 ${178 + i * 24} C230 ${170 + i * 24} 248 ${182 + i * 24} 250 ${200 + i * 24}`} />
          </g>
        ))}
        <path d="M140 168 L120 290 M260 168 L280 290" strokeWidth="10" />
        <path d="M118 296 L104 420 M282 296 L296 420" strokeWidth="7" />
        <path d="M126 298 L114 420 M274 298 L286 420" strokeWidth="5" />
        <path d="M180 440 L172 600 M220 440 L228 600" strokeWidth="13" />
        <path d="M172 610 L166 750 M228 610 L234 750" strokeWidth="9" />
        <path d="M182 612 L178 750 M218 612 L222 750" strokeWidth="5" />
      </g>
      <g fill={b} stroke="#8d8672" strokeWidth="1">
        <circle cx="172" cy="604" r="8" />
        <circle cx="228" cy="604" r="8" />
        <ellipse cx="100" cy="434" rx="10" ry="14" />
        <ellipse cx="300" cy="434" rx="10" ry="14" />
        <ellipse cx="168" cy="764" rx="18" ry="8" />
        <ellipse cx="232" cy="764" rx="18" ry="8" />
      </g>
      <Outline />
    </g>
  );
}

export function AnatomyArt({ layer }: { layer: LayerId }) {
  return (
    <g className="bm-art bm-art-placeholder">
      <Defs />
      {layer === "skin" && <SkinLayer />}
      {layer === "muscles" && <MuscleLayer />}
      {layer === "organs" && <OrganLayer />}
      {layer === "skeleton" && <SkeletonLayer />}
    </g>
  );
}
