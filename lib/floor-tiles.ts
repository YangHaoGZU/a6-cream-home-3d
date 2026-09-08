import { floorRects, rooms, contains, type Rect } from "./plan";
// Partition the union: overlapping floor rectangles must never create coplanar faces.
export function floorTileCells() {
  const xs = [...new Set(floorRects.flatMap((r) => [r[0], r[2]]))].sort((a, b) => a - b);
  const zs = [...new Set(floorRects.flatMap((r) => [r[1], r[3]]))].sort((a, b) => a - b);
  const cells: { rect: Rect; outdoor: boolean }[] = [];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      const rect: Rect = [xs[i], zs[j], xs[i + 1], zs[j + 1]],
        x = (rect[0] + rect[2]) / 2,
        z = (rect[1] + rect[3]) / 2;
      if (floorRects.some((r) => contains(r, x, z)))
        cells.push({ rect, outdoor: rooms.some((r) => r.outdoor && contains(r.rect, x, z)) });
    }
  return cells;
}
