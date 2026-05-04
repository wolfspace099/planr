export type DetailPanelState =
  | { kind: "lesson"; id: string }
  | { kind: "appointment"; id: string }
  | { kind: "homework"; id: string }
  | { kind: "test"; id: string }
  | { kind: "task"; id: string }
  | null;

export type EventChip = {
  key: string;
  startMs: number;
  endMs: number;
  title: string;
  subtitle?: string;
  color: string;
  select?: { kind: "lesson" | "appointment"; id: string };
};
