import { useMemo, useState, type KeyboardEvent } from "react";
import type { RulesFile } from "../rules/types";

type SymptomFlag = RulesFile["flags"][number];

interface SymptomNotesComposerProps {
  flags: SymptomFlag[];
  selectedFlags: string[];
  onToggleFlag: (flagId: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

const QUICK_PICK_IDS = [
  "unusual_fatigue",
  "severe_headache",
  "dizziness",
  "sleep_aid_used",
] as const;

export function getAutocompleteQuery(text: string): string {
  return text.match(/([^\s,.;:!?]+)$/)?.[1] ?? "";
}

export function removeAutocompleteQuery(text: string, query: string): string {
  const trimmed = text.trimEnd();
  if (!query || !trimmed.toLowerCase().endsWith(query.toLowerCase())) {
    return text;
  }
  const remaining = trimmed.slice(0, -query.length).trimEnd();
  return remaining ? `${remaining} ` : "";
}

export function getSymptomSuggestions(
  flags: SymptomFlag[],
  query: string,
  selectedFlags: string[],
): SymptomFlag[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }
  const selected = new Set(selectedFlags);
  return flags
    .filter((flag) => {
      if (selected.has(flag.id)) {
        return false;
      }
      return (
        flag.label.toLowerCase().includes(normalizedQuery) ||
        flag.id.replace(/_/g, " ").includes(normalizedQuery)
      );
    })
    .slice(0, 6);
}

function SymptomNotesComposer({
  flags,
  selectedFlags,
  onToggleFlag,
  notes,
  onNotesChange,
}: SymptomNotesComposerProps) {
  const [composerFocused, setComposerFocused] = useState(false);
  const [browseAllOpen, setBrowseAllOpen] = useState(false);
  const query = getAutocompleteQuery(notes);
  const suggestions = useMemo(
    () => getSymptomSuggestions(flags, query, selectedFlags),
    [flags, query, selectedFlags],
  );
  const selectedTags = selectedFlags
    .map((id) => flags.find((flag) => flag.id === id))
    .filter((flag): flag is SymptomFlag => flag !== undefined);
  const quickPicks = QUICK_PICK_IDS
    .map((id) => flags.find((flag) => flag.id === id))
    .filter((flag): flag is SymptomFlag => flag !== undefined);
  const showSuggestions = composerFocused && suggestions.length > 0;

  function chooseSuggestion(flag: SymptomFlag): void {
    onToggleFlag(flag.id);
    onNotesChange(removeAutocompleteQuery(notes, query));
    setBrowseAllOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    const firstSuggestion = suggestions[0];
    if (
      (event.key === "Enter" || event.key === "Tab") &&
      showSuggestions &&
      firstSuggestion
    ) {
      event.preventDefault();
      chooseSuggestion(firstSuggestion);
      return;
    }
    if (event.key === "Escape") {
      setComposerFocused(false);
      setBrowseAllOpen(false);
      return;
    }
    if (event.key === "Backspace" && notes.length === 0 && selectedFlags.length > 0) {
      event.preventDefault();
      const lastSelectedFlag = selectedFlags[selectedFlags.length - 1];
      if (lastSelectedFlag) {
        onToggleFlag(lastSelectedFlag);
      }
    }
  }

  return (
    <section className="symptoms-column" aria-label="Symptoms and clinical notes">
      <div className="symptom-heading">
        <div>
          <h3>Symptoms &amp; Clinical Notes</h3>
          <p>Tag a symptom or add a note for your crew medical officer.</p>
        </div>
        <span className="selection-count">{selectedFlags.length} selected</span>
      </div>

      <div className="symptom-composer">
        <div className="symptom-composer-box">
          {selectedTags.length > 0 && (
            <div className="selected-symptom-tags" aria-label="Selected symptoms">
              {selectedTags.map((flag) => (
                <span className="selected-symptom-tag" key={flag.id}>
                  <span>{flag.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${flag.label}`}
                    title={`Remove ${flag.label}`}
                    onClick={() => onToggleFlag(flag.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <label className="visually-hidden" htmlFor="checkup-notes">
            Symptoms and clinical notes
          </label>
          <textarea
            id="checkup-notes"
            rows={4}
            placeholder="Type a note or a symptom keyword, such as “head” or “fatig”…"
            value={notes}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            onChange={(event) => {
              onNotesChange(event.currentTarget.value);
              setComposerFocused(true);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {showSuggestions && (
          <div className="symptom-autocomplete" role="listbox" aria-label="Matching symptoms">
            {suggestions.map((flag) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={flag.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(flag)}
              >
                <span>{flag.label}</span>
                <span className="autocomplete-kind">
                  {flag.kind === "event" ? "Event" : "Symptom"}
                </span>
              </button>
            ))}
          </div>
        )}

        {browseAllOpen && (
          <div
            className="symptom-browse-popover"
            id="symptom-browse-popover"
            role="listbox"
            aria-label="All symptoms and events"
          >
            <p className="symptom-browse-heading">Symptoms &amp; events</p>
            {flags.map((flag) => {
              const selected = selectedFlags.includes(flag.id);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? "is-selected" : ""}
                  key={flag.id}
                  onClick={() => onToggleFlag(flag.id)}
                >
                  <span>{flag.label}</span>
                  <span className="autocomplete-kind">
                    {selected ? "Selected" : flag.kind === "event" ? "Event" : "Symptom"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="symptom-pick-row">
        <div className="symptom-quick-picks" aria-label="Common symptoms">
          {quickPicks.map((flag) => {
            const selected = selectedFlags.includes(flag.id);
            return (
              <button
                className={`symptom-quick-pick${selected ? " is-selected" : ""}`}
                type="button"
                key={flag.id}
                aria-pressed={selected}
                onClick={() => onToggleFlag(flag.id)}
              >
                {flag.label}
              </button>
            );
          })}
        </div>
        <button
          className="symptom-browse-toggle"
          type="button"
          aria-expanded={browseAllOpen}
          aria-controls="symptom-browse-popover"
          onClick={() => setBrowseAllOpen((open) => !open)}
        >
          {browseAllOpen ? "− Close list" : `+ Browse all (${flags.length})`}
        </button>
      </div>
    </section>
  );
}

export default SymptomNotesComposer;
