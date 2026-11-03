// Reorder a vertical list with a mouse drag or a touch long-press (written for this showcase).
// Mouse: starts after a few pixels of movement. Touch: hold ~300 ms, otherwise the gesture is a scroll.
import { useRef, useState } from 'react';

type Drag = { id: string; index: number };

export function useLongPressReorder<T extends { id: string }>(
  items: T[],
  onCommit: (next: T[]) => void,
  itemSelector = '[data-reorder-id]',
) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const lastDragEnd = useRef(0);

  // Items as they should look while dragging (the dragged one moved to its preview slot).
  const preview = drag ? move(items, drag.id, drag.index) : items;

  function onPointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0 || items.length < 2) return;
    const touch = e.pointerType !== 'mouse';
    const startY = e.clientY;
    let started = false;
    let index = items.findIndex((i) => i.id === id);
    let timer: number | undefined;

    const start = () => { started = true; setDrag({ id, index }); navigator.vibrate?.(15); };
    if (touch) timer = window.setTimeout(start, 300);

    // How many other items have their middle above the pointer = target index.
    const indexAt = (y: number) =>
      Array.from(document.querySelectorAll<HTMLElement>(itemSelector))
        .filter((el) => el.dataset.reorderId !== id)
        .filter((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 < y; }).length;

    const onMove = (ev: PointerEvent) => {
      if (!started) {
        if (Math.abs(ev.clientY - startY) <= (touch ? 8 : 4)) return;
        if (touch) return finish(false); // moved before the long-press: it's a scroll
        start();
      }
      index = indexAt(ev.clientY);
      setDrag({ id, index });
    };
    const blockScroll = (ev: TouchEvent) => { if (started) ev.preventDefault(); };
    const finish = (commit: boolean) => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('touchmove', blockScroll);
      if (!started) return;
      lastDragEnd.current = Date.now();
      setDrag(null);
      const next = move(items, id, index);
      if (commit && next.some((it, i) => it.id !== items[i].id)) onCommit(next);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchmove', blockScroll, { passive: false });
  }

  // A drag ends with a click on the same element; ignore it so dropping doesn't "open" the item.
  const shouldIgnoreClick = () => Date.now() - lastDragEnd.current < 300;

  return { preview, draggingId: drag?.id ?? null, onPointerDown, shouldIgnoreClick };
}

function move<T extends { id: string }>(list: T[], id: string, to: number): T[] {
  const rest = list.filter((i) => i.id !== id);
  const item = list.find((i) => i.id === id);
  if (item) rest.splice(Math.min(to, rest.length), 0, item);
  return rest;
}
