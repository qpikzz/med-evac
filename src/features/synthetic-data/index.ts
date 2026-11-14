import syntheticData from "../../data/synthetic_history.json";
import { createHistoryStore, loadSyntheticDataset } from "./historyStore";

export * from "./historyStore";
export * from "./missionClock";

export const syntheticDataset = loadSyntheticDataset(syntheticData);
export const historyStore = createHistoryStore(syntheticDataset);
