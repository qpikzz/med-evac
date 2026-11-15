// Body map: draws the Rules engine's EvaluationResult on a layered 2D figure.
// It never decides anything about health — it only shows the worst status the engine already gave.
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
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
import { AnatomyArt } from "./AnatomyArt";
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
  return <AnatomyArt layer={layer} />;
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
          {(style === "yellow" || style === "red") &&
            [0, 1, 2].map((i) => (
              <ellipse
                key={i}
                className="bm-wave"
                style={{ animationDelay: `${i * (style === "red" ? 0.4 : 0.8)}s` }}
                cx={shape.cx}
                cy={shape.cy}
                rx={shape.rx}
                ry={shape.ry}
              />
            ))}
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

  // When the parent selects a zone on another layer (e.g. from an indicator card or an alert), show that layer.
  useEffect(() => {
    if (!selectedZone) return;
    const zone = ZONES.find((z) => z.id === selectedZone);
    if (zone) setLayer(zone.layer);
  }, [selectedZone]);
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
        <span className="si-mark si-mark-corner">SI-assisted illustration</span>
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
            {hoveredView.zone.note && <p className="bm-tooltip-note">{hoveredView.zone.note}</p>}
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
              {zone.note && <p className="bm-zone-note">{zone.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default BodyMap;
export { BodyMap };
