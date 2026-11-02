import { verdictWord } from "@/lib/steps";

export function Pill({ v }: { v: string }) {
  return <span className={`vpill v-${v}`}>{verdictWord(v)}</span>;
}
