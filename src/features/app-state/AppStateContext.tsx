// #TODO(storage): Replace localStorage mock history & preflight baselines with persistent Storage & Baseline modules
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import rulesJson from "../../data/rules.json";
import { checkCheckup, type CheckupCheck, type RawEntry } from "../input-check/inputCheck";
import { computeBaselines } from "../personal-baseline/baseline";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import type { RulesFile } from "../../rules/types";
import { getToday, historyStore, missionDayForDate } from "../synthetic-data";

const rules = loadRules(rulesJson);

export interface AppState {
  today: string;
  missionDay: number;
  rules: RulesFile;
  preflight: ReturnType<typeof historyStore.getPreflight>;
  readings: ReturnType<typeof historyStore.getReadings>;
  flagsToday: string[];
  baselines: ReturnType<typeof computeBaselines>;
  evaluation: ReturnType<typeof evaluate>;
  hasCheckup: boolean;
  validateCheckup: (entries: RawEntry[]) => CheckupCheck;
  submitCheckup: (entries: RawEntry[], flags: string[]) => CheckupCheck;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [revision, setRevision] = useState(0);
  const today = getToday();

  useEffect(
    () => historyStore.subscribe(() => setRevision((current) => current + 1)),
    [],
  );

  const validateCheckup = useCallback(
    (entries: RawEntry[]) => checkCheckup(entries, today, rules),
    [today],
  );

  const submitCheckup = useCallback(
    (entries: RawEntry[], flags: string[]) => {
      const check = checkCheckup(entries, today, rules);
      if (check.allOk) {
        historyStore.addReadings(check.readings);
        historyStore.setFlags(today, flags);
      }
      return check;
    },
    [today],
  );

  const state = useMemo(() => {
    const preflight = historyStore.getPreflight();
    const readings = historyStore.getReadings();
    const flagsToday = historyStore.getFlags(today);
    const baselines = computeBaselines({ today, preflight, history: readings, rules });
    const evaluation = evaluate({ today, readings, flags: flagsToday, baselines, rules });

    return {
      today,
      missionDay: missionDayForDate(today),
      rules,
      preflight,
      readings,
      flagsToday,
      baselines,
      evaluation,
      hasCheckup: historyStore.hasCheckup(today),
      validateCheckup,
      submitCheckup,
    };
  }, [revision, today, validateCheckup, submitCheckup]);

  return <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return state;
}
