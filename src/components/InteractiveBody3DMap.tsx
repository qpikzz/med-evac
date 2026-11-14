import type { IndicatorResult, Status } from "../rules/types";

type AnatomicalLayer = "Skin" | "Muscles" | "Organs";

interface InteractiveBody3DMapProps {
  indicators: IndicatorResult[];
  selectedIndicator: string | null;
  activeLayer: AnatomicalLayer;
  onSelectIndicator: (indicatorId: string) => void;
}

const LAYER_INDICATORS: Record<AnatomicalLayer, string[]> = {
  Skin: ["skin_health", "body_temperature", "radiation_dose"],
  Muscles: ["body_mass", "sleep_hours"],
  Organs: [
    "heart_rate",
    "blood_pressure",
    "blood_sugar",
    "body_temperature",
    "sleep_hours",
    "immune_signs",
    "mood",
  ],
};

const ZONES = [
  {
    id: "head",
    label: "Head / CNS",
    indicators: ["sleep_hours", "mood"],
    position: { left: "50%", top: "15%" },
    line: { x1: 200, y1: 92, x2: 90, y2: 65 },
    cardClass: "callout-head",
  },
  {
    id: "heart",
    label: "Cardiac",
    indicators: ["heart_rate", "blood_pressure"],
    position: { left: "55%", top: "38%" },
    line: { x1: 217, y1: 207, x2: 315, y2: 170 },
    cardClass: "callout-heart",
  },
  {
    id: "core",
    label: "Metabolic / Immune",
    indicators: ["blood_sugar", "body_temperature", "body_mass", "immune_signs"],
    position: { left: "50%", top: "53%" },
    line: { x1: 200, y1: 280, x2: 90, y2: 300 },
    cardClass: "callout-core",
  },
  {
    id: "surface",
    label: "Skin / Exposure",
    indicators: ["skin_health", "radiation_dose"],
    position: { left: "44%", top: "44%" },
    line: { x1: 160, y1: 240, x2: 315, y2: 330 },
    cardClass: "callout-surface",
  },
] as const;

function statusRank(status: Status): number {
  switch (status) {
    case "red":
      return 3;
    case "yellow":
      return 2;
    case "green":
      return 1;
    default:
      return 0;
  }
}

function statusForZone(zone: (typeof ZONES)[number], indicators: IndicatorResult[]): Status {
  return zone.indicators.reduce<Status>((status, indicatorId) => {
    const indicator = indicators.find((item) => item.indicator_id === indicatorId);
    return indicator && statusRank(indicator.status) > statusRank(status) ? indicator.status : status;
  }, "no_data");
}

function InteractiveBody3DMap({
  indicators,
  selectedIndicator,
  activeLayer,
  onSelectIndicator,
}: InteractiveBody3DMapProps) {
  const activeIds = new Set(LAYER_INDICATORS[activeLayer]);

  function selectZone(zone: (typeof ZONES)[number]): void {
    const target = zone.indicators.find((indicatorId) => activeIds.has(indicatorId)) ?? zone.indicators[0];
    onSelectIndicator(target);
    document.getElementById(`indicator-${target}`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  return (
    <section className={`body-map-panel dashboard-card layer-${activeLayer.toLowerCase()}`} aria-label="Interactive body map">
      <div className="body-map-heading">
        <div>
          <p className="section-eyebrow">Anatomical overview</p>
          <h2>Body map</h2>
        </div>
        <span className="body-map-current-layer">{activeLayer} layer</span>
      </div>

      <div className="body-map-stage">
        <svg className="body-map-svg" viewBox="0 0 400 500" preserveAspectRatio="none" role="img" aria-label={`Opaque anatomical figure, ${activeLayer} layer`}>
          <defs>
            <linearGradient id="body-surface" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#f8fbff" />
              <stop offset="0.42" stopColor="#d8e6f4" />
              <stop offset="0.72" stopColor="#a9bfd5" />
              <stop offset="1" stopColor="#e9f1f8" />
            </linearGradient>
            <linearGradient id="body-highlight" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="1" stopColor="#365b7d" stopOpacity="0.25" />
            </linearGradient>
            <radialGradient id="body-pedestal">
              <stop offset="0" stopColor="#94a3b8" stopOpacity="0.22" />
              <stop offset="1" stopColor="#94a3b8" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="organ-fill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#fca5a5" />
              <stop offset="1" stopColor="#be123c" />
            </linearGradient>
            <linearGradient id="muscle-fill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#fca5a5" stopOpacity="0.82" />
              <stop offset="1" stopColor="#b91c1c" stopOpacity="0.62" />
            </linearGradient>
            <filter id="body-shadow" x="-30%" y="-20%" width="160%" height="150%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#334155" floodOpacity="0.22" />
            </filter>
          </defs>
          <ellipse cx="200" cy="462" rx="136" ry="25" fill="url(#body-pedestal)" />
          <ellipse cx="200" cy="456" rx="82" ry="12" fill="none" stroke="#94a3b8" strokeOpacity="0.32" />
          <ellipse cx="200" cy="456" rx="112" ry="18" fill="none" stroke="#94a3b8" strokeOpacity="0.2" />
          <g className="body-silhouette" filter="url(#body-shadow)">
            <path d="M170 124 C153 130 142 148 137 174 L147 254 C151 270 168 280 185 281 L182 320 L158 409 C153 428 163 440 179 440 C191 440 197 431 200 414 C203 431 209 440 221 440 C237 440 247 428 242 409 L218 320 L215 281 C232 280 249 270 253 254 L263 174 C258 148 247 130 230 124 C215 134 185 134 170 124Z" />
            <path d="M145 151 C129 161 119 184 112 210 L91 287 C87 302 95 313 106 313 C116 313 122 306 126 292 L153 220" />
            <path d="M255 151 C271 161 281 184 288 210 L309 287 C313 302 305 313 294 313 C284 313 278 306 274 292 L247 220" />
            <ellipse cx="200" cy="73" rx="34" ry="42" />
            <path d="M184 105 L184 137 Q200 146 216 137 L216 105Z" />
          </g>
          <g className="body-highlight" aria-hidden="true">
            <path d="M170 124 C153 130 142 148 137 174 L147 254 C151 270 168 280 185 281 L182 320 L158 409 C153 428 163 440 179 440 C191 440 197 431 200 414 C203 431 209 440 221 440 C237 440 247 428 242 409 L218 320 L215 281 C232 280 249 270 253 254 L263 174 C258 148 247 130 230 124 C215 134 185 134 170 124Z" fill="url(#body-highlight)" />
            <ellipse cx="189" cy="62" rx="18" ry="27" fill="#fff" opacity="0.2" />
          </g>
          <g className="anatomy-muscles" aria-hidden={activeLayer !== "Muscles"}>
            <path d="M160 153 Q175 137 194 147 L188 214 Q169 209 157 194Z" fill="url(#muscle-fill)" />
            <path d="M240 153 Q225 137 206 147 L212 214 Q231 209 243 194Z" fill="url(#muscle-fill)" />
            <path d="M181 286 L199 286 L197 383 L174 405Z" fill="url(#muscle-fill)" />
            <path d="M219 286 L201 286 L203 383 L226 405Z" fill="url(#muscle-fill)" />
          </g>
          <g className="anatomy-organs" aria-hidden={activeLayer !== "Organs"}>
            <path d="M200 182 C184 165 166 179 173 198 C178 211 192 219 200 227 C208 219 222 211 227 198 C234 179 216 165 200 182Z" fill="url(#organ-fill)" stroke="#fff" strokeOpacity="0.75" strokeWidth="2" />
            <path d="M184 170 C170 161 162 178 165 197 C168 212 177 222 188 222 L194 203Z" fill="#60a5fa" fillOpacity="0.7" stroke="#fff" strokeWidth="2" />
            <path d="M216 170 C230 161 238 178 235 197 C232 212 223 222 212 222 L206 203Z" fill="#60a5fa" fillOpacity="0.7" stroke="#fff" strokeWidth="2" />
            <path d="M189 236 Q200 229 211 236 L210 259 Q200 267 190 259Z" fill="#fbbf24" fillOpacity="0.8" stroke="#fff" strokeWidth="2" />
            <path d="M193 268 Q200 260 207 268 Q212 279 200 286 Q188 279 193 268Z" fill="#a78bfa" fillOpacity="0.7" stroke="#fff" strokeWidth="2" />
          </g>
          {ZONES.map((zone) => {
            const active = zone.indicators.some((indicatorId) => activeIds.has(indicatorId));
            const zoneStatus = statusForZone(zone, indicators);
            return (
              <line
                key={zone.id}
                x1={zone.line.x1}
                y1={zone.line.y1}
                x2={zone.line.x2}
                y2={zone.line.y2}
                className={`anatomy-leader status-line-${zoneStatus}${active ? "" : " is-dimmed"}`}
              />
            );
          })}
        </svg>

        {ZONES.map((zone) => {
          const active = zone.indicators.some((indicatorId) => activeIds.has(indicatorId));
          const selected = zone.indicators.some((indicatorId) => indicatorId === selectedIndicator);
          const zoneStatus = statusForZone(zone, indicators);
          const zoneIndicators = zone.indicators
            .filter((indicatorId) => activeIds.has(indicatorId))
            .map((indicatorId) => indicators.find((item) => item.indicator_id === indicatorId))
            .filter((indicator): indicator is IndicatorResult => Boolean(indicator));
          const alerts = zoneIndicators.filter(
            (indicator) => indicator.status === "yellow" || indicator.status === "red",
          );
          return (
            <div className={`map-zone ${zone.cardClass}`} key={zone.id}>
              <button
                className={`map-hotspot status-hotspot-${zoneStatus}${active ? "" : " is-dimmed"}${selected ? " is-selected" : ""}`}
                style={zone.position}
                type="button"
                aria-label={`Focus ${zone.label} indicators`}
                aria-pressed={selected}
                onClick={() => selectZone(zone)}
              />
              {active && alerts.length > 0 && (
                <button className={`body-callout status-callout-${zoneStatus}`} type="button" onClick={() => selectZone(zone)}>
                  <span>{zone.label}</span>
                  {alerts.map((indicator) => (
                    <strong key={indicator.indicator_id}>
                      {indicator.indicator_id.replace(/_/g, " ")} · {indicator.status}
                    </strong>
                  ))}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="body-map-legend" aria-label="Map status legend">
        <span><i className="legend-dot status-green" />Green</span>
        <span><i className="legend-dot status-yellow" />Yellow</span>
        <span><i className="legend-dot status-red" />Red</span>
        <span><i className="legend-dot status-no_data" />No Data</span>
      </div>

    </section>
  );
}

export function LayerSwitcher({
  activeLayer,
  onLayerChange,
}: {
  activeLayer: AnatomicalLayer;
  onLayerChange: (layer: AnatomicalLayer) => void;
}) {
  return (
    <aside className="layer-switcher-panel dashboard-card" aria-label="Anatomical layers">
      <p>Layers</p>
      <div className="layer-switcher">
        {(["Skin", "Muscles", "Organs"] as const).map((layer) => (
        <button
          className={`layer-option${activeLayer === layer ? " is-active" : ""}`}
          key={layer}
          type="button"
          aria-pressed={activeLayer === layer}
          onClick={() => onLayerChange(layer)}
        >
          <span className={`layer-icon layer-icon-${layer.toLowerCase()}`} aria-hidden="true" />
          <span>{layer}</span>
        </button>
        ))}
      </div>
    </aside>
  );
}

export default InteractiveBody3DMap;
