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
import { useAuth } from "../auth/AuthContext";
import { getProfileHistoryStore } from "../auth/profileHistory";
import type { AuthProfile } from "../auth/types";
import { checkCheckup, type CheckupCheck, type RawEntry } from "../input-check/inputCheck";
import { computeBaselines } from "../personal-baseline/baseline";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import type { Baseline, EvaluationResult, Reading, RulesFile } from "../../rules/types";
import type { HistoryStore } from "../synthetic-data/historyStore";
import { getToday, missionDayForDate } from "../synthetic-data";

const rules = loadRules(rulesJson);

const GUEST_PROFILE: Pick<AuthProfile, "profile_id" | "history_seed"> = {
  profile_id: "guest",
  history_seed: "empty",
};

export interface AppState {
  today: string;
  missionDay: number;
  rules: RulesFile;
  store: HistoryStore;
  preflight: Reading[];
  readings: Reading[];
  flagsToday: string[];
  baselines: Record<string, Baseline>;
  evaluation: EvaluationResult;
  hasCheckup: boolean;
  validateCheckup: (entries: RawEntry[]) => CheckupCheck;
  submitCheckup: (entries: RawEntry[], flags: string[]) => CheckupCheck;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const { activeProfile } = useAuth();
  const [revision, setRevision] = useState(0);
  const today = getToday();
  const profileId = activeProfile?.profile_id ?? GUEST_PROFILE.profile_id;
  const historySeed = activeProfile?.history_seed ?? GUEST_PROFILE.history_seed;

  const store = useMemo(
    () => getProfileHistoryStore({ profile_id: profileId, history_seed: historySeed }),
    [profileId, historySeed],
  );

  useEffect(
    () => store.subscribe(() => setRevision((current) => current + 1)),
    [store],
  );

  const validateCheckup = useCallback(
    (entries: RawEntry[]) => checkCheckup(entries, today, rules),
    [today],
  );

  const submitCheckup = useCallback(
    (entries: RawEntry[], flags: string[]) => {
      const check = checkCheckup(entries, today, rules);
      if (check.allOk) {
        store.addReadings(check.readings);
        store.setFlags(today, flags);
      }
      return check;
    },
    [store, today],
  );

  const state = useMemo(() => {
    const preflight = store.getPreflight();
    const readings = store.getReadings();
    const flagsToday = store.getFlags(today);
    const baselines = computeBaselines({ today, preflight, history: readings, rules });
    const evaluation = evaluate({ today, readings, flags: flagsToday, baselines, rules });

    return {
      today,
      missionDay: missionDayForDate(today),
      rules,
      store,
      preflight,
      readings,
      flagsToday,
      baselines,
      evaluation,
      hasCheckup: store.hasCheckup(today),
      validateCheckup,
      submitCheckup,
    };
  }, [revision, store, today, validateCheckup, submitCheckup]);

  return <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return state;
}
