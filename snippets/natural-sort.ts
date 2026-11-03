// A–Z that people expect: "2 · Ops" before "10 · Roadmap", accents and case ignored
// (written for this showcase).
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function sortByTitle<T extends { title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => collator.compare(a.title.trim(), b.title.trim()));
}

// Cards inside a list: by due date, completion date, newest or title.
// Items without a value go last; ties keep the manual position.
export type CardSort = 'due' | 'done' | 'created' | 'title';

export function sortCards<T extends {
  title: string; pos: number; due_at: string | null; done_at: string | null; created_at: string;
}>(cards: T[], by: CardSort): T[] {
  const key: Record<CardSort, (c: T) => string | null> = {
    due: (c) => c.due_at,
    done: (c) => c.done_at,
    created: (c) => c.created_at,
    title: (c) => c.title,
  };
  const desc = by === 'created' || by === 'done'; // newest first
  return [...cards].sort((a, b) => {
    const x = key[by](a), y = key[by](b);
    if (x == null || y == null) return x == null && y == null ? a.pos - b.pos : x == null ? 1 : -1;
    const c = by === 'title' ? collator.compare(x, y) : x < y ? -1 : x > y ? 1 : 0;
    return (desc ? -c : c) || a.pos - b.pos;
  });
}
