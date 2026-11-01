import type { Step } from "@/lib/types";
import { tapeDuration } from "@/lib/format";

interface Props {
  steps: Pick<Step, "idx" | "t" | "t_label" | "verdict" | "action">[];
  selected?: number | null;
  liveIdx?: number | null;
  onSelect?: (idx: number) => void;
}

// The signature visual: the tutorial as a tape, one tick per step at its timestamp.
export function Tape({ steps, selected, liveIdx, onSelect }: Props) {
  const duration = tapeDuration(steps);
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return (
    <div className="tape" role="group" aria-label="Tutorial timeline">
      <div className="tape-track">
        {steps.map((s, i) => {
          const cls = [
            "tick",
            `v-${s.verdict ?? "pending"}`,
            selected === s.idx ? "on" : "",
            liveIdx === s.idx ? "live" : "",
            onSelect ? "" : "static",
          ].join(" ");
          const style = { left: `${(Number(s.t) / duration) * 100}%`, animationDelay: `${i * 70}ms` };
          const tip = <span className="tip">{s.t_label} {s.verdict ?? "pending"}</span>;
          return onSelect ? (
            <button key={s.idx} className={cls} style={style} onClick={() => onSelect(s.idx)} aria-label={`Step ${s.idx + 1} at ${s.t_label}`}>
              {tip}
            </button>
          ) : (
            <span key={s.idx} className={cls} style={style}>{tip}</span>
          );
        })}
      </div>
      <span className="tape-end l">0:00</span>
      <span className="tape-end r">{mm(duration)}</span>
    </div>
  );
}
