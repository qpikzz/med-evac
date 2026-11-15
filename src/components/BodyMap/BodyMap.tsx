// Body map: draws the Rules engine's EvaluationResult on a layered 2D figure.
// It never decides anything about health — it only shows the worst status the engine already gave.
import { useMemo, useState, type KeyboardEvent } from "react";
import type { EvaluationResult, RulesFile } from "../../rules/types";
import {
  MONITORING_TEXT,
  STATUS_ICON,
  STATUS_WORD,
  allLayerBadges,
  allZoneViews,
  zoneAriaLabel,
  type ZoneView,
} from "./status";
import { DEFAULT_LAYER, LAYERS, ZONES, type LayerId, type ZoneConfig, type ZoneId } from "./zones";
import "./BodyMap.css";

export type { LayerId, ZoneId } from "./zones";

export interface BodyMapProps {
  result: EvaluationResult | null;
  rules: RulesFile; // used only to detect monitoring-only indicators
  selectedZone?: ZoneId | null;
  onSelect: (zone: ZoneId, indicatorIds: string[]) => void;
}

// Optional art from Rəna: src/assets/body/{skin,organs,skeleton}.{svg,png,webp}. Bundled locally; missing → placeholder.
const ART_FILES = import.meta.glob<string>("../../assets/body/*.{svg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

function artFor(layer: LayerId): string | null {
  const key = Object.keys(ART_FILES).find((path) => {
    const base = path.split("/").pop() ?? "";
    return base.slice(0, base.lastIndexOf(".")) === layer;
  });
  return key ? ART_FILES[key] : null;
}

const VIEW_W = 400;
const VIEW_H = 800;

// Minimal line-art silhouette, used when no art file is present.
const BODY_OUTLINE =
  "M184 124 C160 136 132 140 122 162 C112 186 108 250 100 320 C96 360 90 400 88 430 " +
  "C86 446 104 448 108 432 C114 400 122 350 132 290 L140 240 C142 300 136 360 138 420 " +
  "C140 500 146 620 150 740 C150 760 140 770 150 776 L186 776 C192 760 192 740 192 720 " +
  "C192 620 196 520 200 450 C204 520 208 620 208 720 C208 740 208 760 214 776 L250 776 " +
  "C260 770 250 760 250 740 C254 620 260 500 262 420 C264 360 258 300 260 240 L268 290 " +
  "C278 350 286 400 292 432 C296 448 314 446 312 430 C310 400 304 360 300 320 " +
  "C292 250 288 186 278 162 C268 140 240 136 216 124 Z";

function Silhouette() {
  return (
    <g className="bm-outline">
      <circle cx="200" cy="78" r="44" />
      <path d={BODY_OUTLINE} />
    </g>
  );
}

function PlaceholderArt({ layer }: { layer: LayerId }) {
  if (layer === "skin") {
    return (
      <g className="bm-art bm-art-placeholder">
        <g className="bm-skin-fill">
          <circle cx="200" cy="78" r="44" />
          <path d={BODY_OUTLINE} />
        </g>
        <Silhouette />
      </g>
    );
  }
  if (layer === "organs") {
    return (
      <g className="bm-art bm-art-placeholder">
        <g className="bm-dim">
          <Silhouette />
        </g>
        <g className="bm-detail">
          <ellipse cx="200" cy="76" rx="30" ry="24" />
          <path d="M200 54 V98" />
          <path d="M184 230 C166 222 156 250 160 290 C162 310 180 312 188 300 L190 240 Z" />
          <path d="M216 230 C234 222 244 250 240 290 C238 310 220 312 212 300 L210 240 Z" />
          <path d="M214 240 C204 230 192 238 196 252 C199 262 210 270 214 274 C218 270 229 262 232 252 C236 238 224 230 214 240 Z" />
          <path d="M174 330 C174 316 226 316 226 330 C226 350 210 362 200 362 C190 362 174 350 174 330 Z" />
          <path d="M112 300 C110 330 108 350 106 380" />
          <circle cx="178" cy="345" r="3" />
          <circle cx="198" cy="352" r="3" />
          <circle cx="188" cy="368" r="3" />
          <circle cx="180" cy="140" r="3" />
          <circle cx="220" cy="140" r="3" />
        </g>
      </g>
    );
  }
  return (
    <g className="bm-art bm-art-placeholder">
      <g className="bm-dim">
        <Silhouette />
      </g>
      <g className="bm-detail">
        <circle cx="200" cy="74" r="34" />
        <path d="M200 112 V430" />
        <path d="M150 168 H250" />
        {[200, 224, 248, 272].map((y) => (
          <path key={y} d={`M200 ${y} C176 ${y - 6} 160 ${y + 4} 158 ${y + 16} M200 ${y} C224 ${y - 6} 240 ${y + 4} 242 ${y + 16}`} />
        ))}
        <path d="M156 410 C170 440 230 440 244 410 L232 396 H168 Z" />
        <path d="M150 168 L118 300 L102 430 M250 168 L282 300 L298 430" />
        <path d="M172 430 L168 600 L160 760 M228 430 L232 600 L240 760" />
        <circle cx="168" cy="600" r="5" />
        <circle cx="232" cy="600" r="5" />
      </g>
    </g>
  );
}

function LayerArt({ layer }: { layer: LayerId }) {
  const src = artFor(layer);
  if (src) {
    return (
      <image
        className="bm-art"
        href={src}
        x="0"
        y="0"
        width={VIEW_W}
        height={VIEW_H}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }
  return <PlaceholderArt layer={layer} />;
}

interface HotspotProps {
  view: ZoneView;
  ariaLabel: string;
  selected: boolean;
  onActivate: () => void;
  onHover: (zone: ZoneId | null) => void;
}

function Hotspot({ view, ariaLabel, selected, onActivate, onHover }: HotspotProps) {
  const { zone, style } = view;
  const shape = zone.shape;

  function onKeyDown(event: KeyboardEvent<SVGGElement>): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  }

  return (
    <g
      className={`bm-hotspot bm-${shape.kind} bm-style-${style}${selected ? " is-selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      onMouseEnter={() => onHover(zone.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(zone.id)}
      onBlur={() => onHover(null)}
    >
      {shape.kind === "point" ? (
        <>
          <circle className="bm-glow" cx={shape.x} cy={shape.y} r={shape.r} />
          <circle className="bm-core" cx={shape.x} cy={shape.y} r={shape.r * 0.62} />
          <text className="bm-icon" x={shape.x} y={shape.y} aria-hidden="true">
            {STATUS_ICON[style]}
          </text>
          <circle className="bm-focus-ring" cx={shape.x} cy={shape.y} r={shape.r + 6} />
          <circle className="bm-selected-ring" cx={shape.x} cy={shape.y} r={shape.r + 6} />
        </>
      ) : (
        <>
          <ellipse className="bm-glow" cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
          <ellipse className="bm-aura-hit" cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
          <circle className="bm-core" cx={shape.cx + shape.rx * 0.707} cy={shape.cy - shape.ry * 0.707} r={16} />
          <text className="bm-icon" x={shape.cx + shape.rx * 0.707} y={shape.cy - shape.ry * 0.707} aria-hidden="true">
            {STATUS_ICON[style]}
          </text>
          <ellipse className="bm-focus-ring" cx={shape.cx} cy={shape.cy} rx={shape.rx + 6} ry={shape.ry + 6} />
          <ellipse className="bm-selected-ring" cx={shape.cx} cy={shape.cy} rx={shape.rx + 6} ry={shape.ry + 6} />
        </>
      )}
    </g>
  );
}

function tooltipAnchor(zone: ZoneConfig): { left: string; top: string } {
  const s = zone.shape;
  const x = s.kind === "point" ? s.x : s.cx;
  const y = s.kind === "point" ? s.y - s.r - 8 : s.cy - s.ry + 24;
  return { left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` };
}

function StatusTag({ style }: { style: ZoneView["style"] }) {
  return (
    <span className={`bm-tag bm-style-${style}`}>
      <span aria-hidden="true">{STATUS_ICON[style]}</span> {STATUS_WORD[style]}
    </span>
  );
}

function BodyMap({ result, rules, selectedZone, onSelect }: BodyMapProps) {
  const [layer, setLayer] = useState<LayerId>(DEFAULT_LAYER);
  const [hovered, setHovered] = useState<ZoneId | null>(null);
  const [localSelected, setLocalSelected] = useState<ZoneId | null>(null);
  const selected = selectedZone !== undefined ? selectedZone : localSelected;

  const views = useMemo(() => allZoneViews(result, rules), [result, rules]);
  const badges = useMemo(() => allLayerBadges(views), [views]);

  function select(zone: ZoneConfig): void {
    setLocalSelected(zone.id);
    onSelect(zone.id, [...zone.indicatorIds]);
  }

  function selectFromList(zone: ZoneConfig): void {
    setLayer(zone.layer);
    select(zone);
  }

  const hoveredView = hovered ? views[hovered] : null;
  const showTooltip = hoveredView !== null && hoveredView.zone.layer === layer;

  return (
    <section className="body-map" aria-label="Body map">
      <header className="bm-header">
        <div>
          <p className="bm-eyebrow">Body map</p>
          <p className="bm-caption">
            {result === null ? "No check-up yet today" : `Check-up · ${result.today}`}
          </p>
        </div>
        <div className="bm-tabs" aria-label="Body layers">
          {LAYERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`bm-tab${layer === item.id ? " is-active" : ""}`}
              aria-pressed={layer === item.id}
              aria-label={`${item.label} layer: ${STATUS_WORD[badges[item.id]]}`}
              onClick={() => setLayer(item.id)}
            >
              <span>{item.label}</span>
              <StatusTag style={badges[item.id]} />
            </button>
          ))}
        </div>
      </header>

      <div className="bm-stage">
        <svg
          className="bm-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label={`Body figure, ${layer} layer`}
        >
          {LAYERS.map((item) => {
            const active = item.id === layer;
            return (
              <g
                key={item.id}
                className={`bm-layer${active ? " is-active" : ""}`}
                aria-hidden={!active}
              >
                <LayerArt layer={item.id} />
                {ZONES.filter((zone) => zone.layer === item.id).map((zone) => (
                  <Hotspot
                    key={zone.id}
                    view={views[zone.id]}
                    ariaLabel={zoneAriaLabel(views[zone.id], rules)}
                    selected={selected === zone.id}
                    onActivate={() => select(zone)}
                    onHover={setHovered}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {showTooltip && hoveredView && (
          <div className="bm-tooltip" role="tooltip" style={tooltipAnchor(hoveredView.zone)}>
            <p className="bm-tooltip-title">{hoveredView.zone.label}</p>
            <StatusTag style={hoveredView.style} />
            <p className="bm-tooltip-hazard">Hazard: {hoveredView.zone.hazard}</p>
            {hoveredView.monitoringIds.length > 0 && (
              <p className="bm-tooltip-note">{MONITORING_TEXT}</p>
            )}
          </div>
        )}
      </div>

      <ul className="bm-zone-list" aria-label="All body zones">
        {ZONES.map((zone) => {
          const view = views[zone.id];
          return (
            <li key={zone.id}>
              <button
                type="button"
                className={`bm-zone-item${selected === zone.id ? " is-selected" : ""}`}
                aria-pressed={selected === zone.id}
                aria-label={zoneAriaLabel(view, rules)}
                onClick={() => selectFromList(zone)}
              >
                <span className="bm-zone-name">{zone.label}</span>
                <StatusTag style={view.style} />
              </button>
              {view.style === "monitoring" && <p className="bm-zone-note">{MONITORING_TEXT}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default BodyMap;
export { BodyMap };
