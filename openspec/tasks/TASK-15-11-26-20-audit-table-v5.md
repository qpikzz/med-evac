# TASK-15-11-26-20 — Full audit: science base (table v5), story, specs

## Solution Idea

Judge-style audit of the whole chain (story steps 1–7, input edge cases, rules vs the medical table, knowledge base, combinations, AI guardrails, specs vs code), then fix every finding.

## ToDo Plan

- [x] Story replayed in a browser with the network blocked; edge-case input and engine probes.
- [x] rules.json ← table v5: links instead of SOURCE PENDING; temp_y_abs removed (Q-TEMP); imm_r_fever_symptoms enabled; rad_y_bfo30; glucose ≥ 20 + mmol/L hint; body mass ≥ 30.
- [x] knowledge_base.json ← table v5 (3 fields, 2 source lists, repaired truncated NASA-STD link).
- [x] combinations.json: 16 combinations from the table's own criteria.
- [x] Engine `pending` rules + card note; Local AI layer-1 panel; AI output review; multilingual safety phrases.
- [x] SYNTHETIC badge + mission date in the header and Earth chat; Day 40 not pre-filled; demo fill button; card auto-opens with whole-mission chart and escalation; tidy sources.
- [x] Red-status draft banner; automatic simulated receipt from Earth.
- [x] Specs: rules-engine §14, API_CONTRACT, ai-helper §12, earth-link, synthetic-data, input-check; README science base; demo checklist.

## Task Report

180 tests passing, `tsc` clean, build OK; story 1–7 passes in the browser with 0 external requests.
