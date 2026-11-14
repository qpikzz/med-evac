// Kept at this path with the same exports so MainDashboard does not change.
// Internals now delegate to the 2D layered BodyMap (src/components/BodyMap).
import { useAppState } from "../features/app-state/AppStateContext";
import type { IndicatorResult } from "../rules/types";
import BodyMap from "./BodyMap/BodyMap";
import { ZONES } from "./BodyMap/zones";

type AnatomicalLayer = "Skin" | "Muscles" | "Organs";

interface InteractiveBody3DMapProps {
  indicators: IndicatorResult[];
  selectedIndicator: string | null;
  /** Ignored: BodyMap owns its own Skin · Organs · Skeleton tabs. */
  activeLayer?: AnatomicalLayer;
  onSelectIndicator: (indicatorId: string) => void;
}

function InteractiveBody3DMap({
  indicators,
  selectedIndicator,
  onSelectIndicator,
}: InteractiveBody3DMapProps) {
  const { evaluation, rules, hasCheckup } = useAppState();
  const result = hasCheckup ? { ...evaluation, indicators } : null;
  const selectedZone =
    ZONES.find((zone) => selectedIndicator !== null && zone.indicatorIds.includes(selectedIndicator))
      ?.id ?? null;

  return (
    <BodyMap
      result={result}
      rules={rules}
      selectedZone={selectedZone}
      onSelect={(_zone, indicatorIds) => {
        const target = indicatorIds[0];
        if (!target) return;
        onSelectIndicator(target);
        document.getElementById(`indicator-${target}`)?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }}
    />
  );
}

/** @deprecated Layer tabs now live inside BodyMap. Kept so existing imports still compile; renders nothing. */
export function LayerSwitcher(_props: {
  activeLayer: AnatomicalLayer;
  onLayerChange: (layer: AnatomicalLayer) => void;
}) {
  return null;
}

export default InteractiveBody3DMap;
