// Recognize a deliberate tap independently of OrbitControls. Once movement or
// a second finger occurs, returning to the start cannot turn the gesture into a tap.
export class OverviewTap {
  private pointers = new Set<number>();
  private start: { id: number; x: number; y: number; time: number; target: string | null; limit: number } | null = null;
  private invalid = false;
  begin(id: number, x: number, y: number, time: number, target: string | null, touch = false, button = 0) {
    this.pointers.add(id);
    if (this.pointers.size !== 1) { this.invalid = true; return; }
    this.invalid = button !== 0;
    this.start = { id, x, y, time, target, limit: touch ? 10 : 6 };
  }
  move(id: number, x: number, y: number) {
    if (this.start?.id === id && Math.hypot(x - this.start.x, y - this.start.y) > this.start.limit)
      this.invalid = true;
  }
  end(id: number, x: number, y: number, time: number, target: string | null) {
    this.move(id, x, y);
    const s = this.start;
    const chosen = !this.invalid && this.pointers.size === 1 && s?.id === id &&
      time - s.time < 500 && s.target === target ? target : null;
    this.pointers.delete(id);
    if (this.pointers.size === 0) { this.start = null; this.invalid = false; }
    return chosen;
  }
  invalidate() { this.invalid = true; }
  cancel(id: number) {
    this.invalid = true;
    this.pointers.delete(id);
    if (!this.pointers.size) this.start = null;
  }
  reset() { this.pointers.clear(); this.start = null; this.invalid = false; }
}
