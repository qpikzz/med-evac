import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import type { RulesFile } from "../rules/types";

type SymptomFlag = RulesFile["flags"][number];
export type ComposerSegment =
  | { kind: "text"; text: string }
  | { kind: "symptom"; id: string; label: string };

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

function appendText(segments: ComposerSegment[], text: string): void {
  const normalized = text.replace(/\u00a0/g, " ");
  if (!normalized) {
    return;
  }
  const last = segments[segments.length - 1];
  if (last?.kind === "text") {
    last.text += normalized;
  } else {
    segments.push({ kind: "text", text: normalized });
  }
}

function normalizeSegments(segments: ComposerSegment[]): ComposerSegment[] {
  const normalized: ComposerSegment[] = [];
  for (const segment of segments) {
    if (segment.kind === "text") {
      appendText(normalized, segment.text);
    } else {
      normalized.push(segment);
    }
  }
  return normalized;
}

export function serializeSegments(segments: ComposerSegment[]): string {
  return segments.map((segment) => segment.kind === "text" ? segment.text : segment.label).join("");
}

export function removeSymptomSegment(
  segments: ComposerSegment[],
  flagId: string,
): ComposerSegment[] {
  const result: ComposerSegment[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.kind !== "symptom" || segment.id !== flagId) {
      result.push(segment);
      continue;
    }

    const previous = result[result.length - 1];
    const next = segments[index + 1];
    const hasSpaceBefore =
      previous?.kind === "text" && /\s$/.test(previous.text);
    if (
      next?.kind === "text" &&
      /^\s/.test(next.text) &&
      (hasSpaceBefore || !previous)
    ) {
      result.push({ kind: "text", text: next.text.slice(1) });
      index += 1;
    }
  }
  return normalizeSegments(result);
}

function findLabel(text: string, label: string, occupied: Array<{ start: number; end: number }>) {
  const normalizedText = text.toLowerCase();
  const normalizedLabel = label.toLowerCase();
  let start = normalizedText.indexOf(normalizedLabel);
  while (start >= 0) {
    const end = start + label.length;
    const before = text[start - 1] ?? "";
    const after = text[end] ?? "";
    const hasWordBoundary =
      !/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after);
    const overlaps = occupied.some((range) => start < range.end && end > range.start);
    if (hasWordBoundary && !overlaps) {
      return { start, end };
    }
    start = normalizedText.indexOf(normalizedLabel, start + 1);
  }
  return null;
}

export function getSegmentsFromSavedNotes(
  notes: string,
  selectedFlags: string[],
  flags: SymptomFlag[],
): ComposerSegment[] {
  const matches: Array<{ start: number; end: number; flag: SymptomFlag }> = [];
  const occupied: Array<{ start: number; end: number }> = [];
  const selected = selectedFlags
    .map((id) => flags.find((flag) => flag.id === id))
    .filter((flag): flag is SymptomFlag => flag !== undefined)
    .sort((left, right) => right.label.length - left.label.length);

  for (const flag of selected) {
    const range = findLabel(notes, flag.label, occupied);
    if (range) {
      matches.push({ ...range, flag });
      occupied.push(range);
    }
  }

  matches.sort((left, right) => left.start - right.start);
  const segments: ComposerSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    appendText(segments, notes.slice(cursor, match.start));
    segments.push({ kind: "symptom", id: match.flag.id, label: match.flag.label });
    cursor = match.end;
  }
  appendText(segments, notes.slice(cursor));

  const included = new Set(matches.map((match) => match.flag.id));
  for (const flag of selected) {
    if (included.has(flag.id)) {
      continue;
    }
    const currentText = serializeSegments(segments);
    if (currentText && !/\s$/.test(currentText)) {
      appendText(segments, " ");
    }
    segments.push({ kind: "symptom", id: flag.id, label: flag.label });
    appendText(segments, " ");
  }
  return normalizeSegments(segments);
}

function splitSegmentsAtOffset(
  segments: ComposerSegment[],
  targetOffset: number,
): [ComposerSegment[], ComposerSegment[]] {
  const left: ComposerSegment[] = [];
  let remaining = Math.max(0, targetOffset);

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const length = segment.kind === "text" ? segment.text.length : segment.label.length;
    if (remaining >= length) {
      left.push(segment);
      remaining -= length;
      continue;
    }
    if (segment.kind === "text" && remaining > 0) {
      left.push({ kind: "text", text: segment.text.slice(0, remaining) });
      return [
        normalizeSegments(left),
        normalizeSegments([
          { kind: "text", text: segment.text.slice(remaining) },
          ...segments.slice(index + 1),
        ]),
      ];
    }
    return [normalizeSegments(left), normalizeSegments(segments.slice(index))];
  }
  return [normalizeSegments(left), []];
}

function addSpacingAroundTag(
  before: ComposerSegment[],
  after: ComposerSegment[],
  flag: SymptomFlag,
): ComposerSegment[] {
  const beforeText = serializeSegments(before);
  const afterText = serializeSegments(after);
  const needsSpaceBefore =
    beforeText.length > 0 && !/\s$/.test(beforeText) && !/[(\[{]$/.test(beforeText);
  const needsSpaceAfter =
    !afterText ||
    (!/^\s/.test(afterText) && !/^[,.;:!?)}\]]/.test(afterText));
  const insertion: ComposerSegment[] = [];
  if (needsSpaceBefore) {
    appendText(insertion, " ");
  }
  insertion.push({ kind: "symptom", id: flag.id, label: flag.label });
  if (needsSpaceAfter) {
    appendText(insertion, " ");
  }
  return normalizeSegments([...before, ...insertion, ...after]);
}

function getEditableText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\u00a0/g, " ") ?? "";
  }
  if (
    node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ||
    node.nodeType === Node.DOCUMENT_NODE
  ) {
    return Array.from(node.childNodes, getEditableText).join("");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }
  const element = node as Element;
  if (element.classList.contains("inline-symptom-remove")) {
    return "";
  }
  if (element.tagName === "BR") {
    return "\n";
  }
  return Array.from(element.childNodes, getEditableText).join("");
}

function readEditorSegments(editor: HTMLElement, flags: SymptomFlag[]): ComposerSegment[] {
  const segments: ComposerSegment[] = [];

  function visit(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(segments, node.textContent ?? "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const element = node as HTMLElement;
    if (element.classList.contains("inline-symptom-remove")) {
      return;
    }
    const flagId = element.dataset.symptomId;
    if (flagId) {
      const flag = flags.find((item) => item.id === flagId);
      if (flag) {
        segments.push({ kind: "symptom", id: flag.id, label: flag.label });
      }
      return;
    }
    if (element.tagName === "BR") {
      appendText(segments, "\n");
      return;
    }

    const children = Array.from(element.childNodes);
    children.forEach((child, index) => {
      const childIsBlock =
        child.nodeType === Node.ELEMENT_NODE &&
        ["DIV", "P"].includes((child as Element).tagName);
      if (childIsBlock && segments.length > 0) {
        const last = segments[segments.length - 1];
        if (last?.kind !== "text" || !last.text.endsWith("\n")) {
          appendText(segments, "\n");
        }
      }
      visit(child);
      if (childIsBlock && index < children.length - 1) {
        appendText(segments, "\n");
      }
    });
  }

  visit(editor);
  return normalizeSegments(segments);
}

function getCaretOffset(editor: HTMLElement): number | null {
  const selection = globalThis.getSelection();
  if (!selection?.focusNode || !editor.contains(selection.focusNode)) {
    return null;
  }
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.setEnd(selection.focusNode, selection.focusOffset);
  return getEditableText(range.cloneContents()).length;
}

function restoreCaretOffset(editor: HTMLElement, targetOffset: number): void {
  type CaretPoint =
    | { node: Text; offset: number }
    | { node: Node; edge: "before" | "after" };

  let consumed = 0;
  const pointRef: { current: CaretPoint | null } = { current: null };

  function visit(node: Node): void {
    if (pointRef.current) {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent?.closest(".inline-symptom-remove")) {
        return;
      }
      const length = node.textContent?.length ?? 0;
      if (targetOffset <= consumed + length) {
        pointRef.current = {
          node: node as Text,
          offset: Math.max(0, targetOffset - consumed),
        };
      } else {
        consumed += length;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const element = node as HTMLElement;
    if (element.classList.contains("inline-symptom-remove")) {
      return;
    }
    if (element.dataset.symptomId) {
      const labelLength =
        element.querySelector<HTMLElement>(".inline-symptom-label")?.textContent?.length ?? 0;
      if (targetOffset === consumed) {
        pointRef.current = { node: element, edge: "before" };
      } else if (targetOffset < consumed + labelLength) {
        pointRef.current = { node: element, edge: "after" };
      } else {
        consumed += labelLength;
      }
      return;
    }
    for (const child of Array.from(element.childNodes)) {
      visit(child);
      if (pointRef.current) {
        return;
      }
    }
  }

  visit(editor);
  const selection = globalThis.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  const point = pointRef.current;
  if (point && "offset" in point) {
    range.setStart(point.node, point.offset);
  } else if (point) {
    if (point.edge === "before") {
      range.setStartBefore(point.node);
    } else {
      range.setStartAfter(point.node);
    }
  } else {
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function SymptomNotesComposer({
  flags,
  selectedFlags,
  onToggleFlag,
  notes,
  onNotesChange,
}: SymptomNotesComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<ComposerSegment[]>(() =>
    getSegmentsFromSavedNotes(notes, selectedFlags, flags),
  );
  const segmentsRef = useRef(segments);
  const [composerFocused, setComposerFocused] = useState(false);
  const [browseAllOpen, setBrowseAllOpen] = useState(false);
  const [caretOffset, setCaretOffset] = useState(0);
  const [, setEditorRevision] = useState(0);
  const pendingCaretOffset = useRef<number | null>(null);
  const lastEmittedNotes = useRef<string | null>(null);
  const previousProps = useRef({ notes, selectedFlags });
  const plainNotes = serializeSegments(segmentsRef.current);
  const query = getAutocompleteQuery(plainNotes.slice(0, caretOffset));
  const suggestions = useMemo(
    () => getSymptomSuggestions(flags, query, selectedFlags),
    [flags, query, selectedFlags],
  );
  const quickPicks = QUICK_PICK_IDS
    .map((id) => flags.find((flag) => flag.id === id))
    .filter((flag): flag is SymptomFlag => flag !== undefined);
  const showSuggestions = composerFocused && suggestions.length > 0;

  useEffect(() => {
    const propsChanged =
      notes !== previousProps.current.notes ||
      selectedFlags.join("\u0000") !== previousProps.current.selectedFlags.join("\u0000");
    previousProps.current = { notes, selectedFlags };
    if (!propsChanged || notes === lastEmittedNotes.current) {
      return;
    }
    const restored = getSegmentsFromSavedNotes(notes, selectedFlags, flags);
    segmentsRef.current = restored;
    setSegments(restored);
    setCaretOffset(0);
  }, [flags, notes, selectedFlags]);

  useLayoutEffect(() => {
    if (pendingCaretOffset.current === null || !editorRef.current) {
      return;
    }
    restoreCaretOffset(editorRef.current, pendingCaretOffset.current);
    setCaretOffset(pendingCaretOffset.current);
    pendingCaretOffset.current = null;
  }, [segments]);

  function syncSelectedFlags(nextSegments: ComposerSegment[]): void {
    const nextIds = new Set(
      nextSegments
        .filter((segment): segment is Extract<ComposerSegment, { kind: "symptom" }> =>
          segment.kind === "symptom",
        )
        .map((segment) => segment.id),
    );
    for (const id of selectedFlags) {
      if (!nextIds.has(id)) {
        onToggleFlag(id);
      }
    }
    for (const id of nextIds) {
      if (!selectedFlags.includes(id)) {
        onToggleFlag(id);
      }
    }
  }

  function emitSegments(nextSegments: ComposerSegment[], nextCaretOffset: number | null): void {
    const normalized = normalizeSegments(nextSegments);
    const serialized = serializeSegments(normalized);
    segmentsRef.current = normalized;
    lastEmittedNotes.current = serialized;
    pendingCaretOffset.current = nextCaretOffset;
    setSegments(normalized);
    onNotesChange(serialized);
    syncSelectedFlags(normalized);
  }

  function updateCaretOffset(): void {
    if (!editorRef.current) {
      return;
    }
    const offset = getCaretOffset(editorRef.current);
    if (offset !== null) {
      setCaretOffset(offset);
    }
  }

  function handleInput(): void {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const nextCaretOffset = getCaretOffset(editor);
    const nextSegments = readEditorSegments(editor, flags);
    const previousIds = segmentsRef.current
      .filter((segment): segment is Extract<ComposerSegment, { kind: "symptom" }> =>
        segment.kind === "symptom",
      )
      .map((segment) => segment.id)
      .join("\u0000");
    const nextIds = nextSegments
      .filter((segment): segment is Extract<ComposerSegment, { kind: "symptom" }> =>
        segment.kind === "symptom",
      )
      .map((segment) => segment.id)
      .join("\u0000");
    const tagStructureChanged = previousIds !== nextIds;
    segmentsRef.current = nextSegments;
    const serialized = serializeSegments(nextSegments);
    lastEmittedNotes.current = serialized;
    if (tagStructureChanged) {
      pendingCaretOffset.current = nextCaretOffset;
      setSegments(nextSegments);
    } else {
      setEditorRevision((revision) => revision + 1);
      if (nextCaretOffset !== null) {
        setCaretOffset(nextCaretOffset);
      }
    }
    onNotesChange(serialized);
    syncSelectedFlags(nextSegments);
  }

  function insertFlag(flag: SymptomFlag, offset: number, queryLength = 0): void {
    const start = Math.max(0, offset - queryLength);
    const [before, remainder] = splitSegmentsAtOffset(segmentsRef.current, start);
    const [, after] = splitSegmentsAtOffset(remainder, queryLength);
    const nextSegments = addSpacingAroundTag(before, after, flag);
    const beforeText = serializeSegments(before);
    const afterText = serializeSegments(after);
    const needsSpaceBefore =
      beforeText.length > 0 && !/\s$/.test(beforeText) && !/[(\[{]$/.test(beforeText);
    const needsSpaceAfter =
      !afterText ||
      (!/^\s/.test(afterText) && !/^[,.;:!?)}\]]/.test(afterText));
    const nextCaretOffset =
      beforeText.length +
      (needsSpaceBefore ? 1 : 0) +
      flag.label.length +
      (needsSpaceAfter ? 1 : 0);
    setComposerFocused(true);
    emitSegments(nextSegments, nextCaretOffset);
  }

  function removeFlag(flagId: string): void {
    const nextSegments = removeSymptomSegment(segmentsRef.current, flagId);
    emitSegments(nextSegments, caretOffset);
  }

  function toggleFlag(flag: SymptomFlag): void {
    if (selectedFlags.includes(flag.id)) {
      removeFlag(flag.id);
      return;
    }
    const editorOffset =
      editorRef.current && composerFocused
        ? getCaretOffset(editorRef.current)
        : null;
    insertFlag(flag, editorOffset ?? serializeSegments(segmentsRef.current).length);
  }

  function chooseSuggestion(flag: SymptomFlag): void {
    const editorOffset =
      editorRef.current
        ? getCaretOffset(editorRef.current)
        : null;
    const offset = editorOffset ?? caretOffset;
    const textBeforeCaret = serializeSegments(segmentsRef.current).slice(0, offset);
    const activeQuery = getAutocompleteQuery(textBeforeCaret);
    if (activeQuery.length < 2) {
      return;
    }
    insertFlag(flag, offset, activeQuery.length);
    setBrowseAllOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const offset =
      editorRef.current
        ? getCaretOffset(editorRef.current)
        : null;
    const currentOffset = offset ?? caretOffset;
    const currentQuery = getAutocompleteQuery(
      serializeSegments(segmentsRef.current).slice(0, currentOffset),
    );
    const firstSuggestion = suggestions[0];
    if (
      (event.key === "Enter" || event.key === "Tab") &&
      showSuggestions &&
      currentQuery.length >= 2 &&
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
    if (
      event.key === "Backspace" &&
      currentOffset === 0 &&
      segmentsRef.current[0]?.kind === "symptom"
    ) {
      event.preventDefault();
      removeFlag(segmentsRef.current[0].id);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>): void {
    event.preventDefault();
    const editor = editorRef.current;
    const selection = globalThis.getSelection();
    if (!editor || !selection?.rangeCount) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }
    range.deleteContents();
    range.insertNode(document.createTextNode(event.clipboardData.getData("text/plain")));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    handleInput();
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
          <label className="visually-hidden" htmlFor="checkup-notes">
            Symptoms and clinical notes
          </label>
          <div className="symptom-editor-wrap">
            {plainNotes.length === 0 && (
              <span className="symptom-editor-placeholder">
                Type a note or symptom keyword, such as “head” or “fatig”…
              </span>
            )}
            <div
              id="checkup-notes"
              ref={editorRef}
              className="symptom-editor"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Symptoms and clinical notes"
              aria-multiline="true"
              onFocus={() => {
                setComposerFocused(true);
                updateCaretOffset();
              }}
              onBlur={() => setComposerFocused(false)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onKeyUp={updateCaretOffset}
              onMouseUp={updateCaretOffset}
              onPaste={handlePaste}
            >
              {segments.map((segment, index) =>
                segment.kind === "text" ? (
                  <span className="symptom-editor-text" key={`text-${index}`}>
                    {segment.text}
                  </span>
                ) : (
                  <span
                    className="inline-symptom-tag"
                    contentEditable={false}
                    data-symptom-id={segment.id}
                    key={`symptom-${segment.id}-${index}`}
                  >
                    <span className="inline-symptom-label">{segment.label}</span>
                    <button
                      className="inline-symptom-remove"
                      type="button"
                      contentEditable={false}
                      aria-label={`Remove ${segment.label}`}
                      title={`Remove ${segment.label}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => removeFlag(segment.id)}
                    >
                      ×
                    </button>
                  </span>
                ),
              )}
            </div>
          </div>
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
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleFlag(flag)}
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
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => toggleFlag(flag)}
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
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setBrowseAllOpen((open) => !open)}
        >
          {browseAllOpen ? "− Close list" : `+ Browse all (${flags.length})`}
        </button>
      </div>
    </section>
  );
}

export default SymptomNotesComposer;
