import {walls, coreObstacles, type Rect} from './plan.ts';
// Navigation only: the Blender model supplies every visible surface.
export function buildWalkCollisions(): Rect[] {
  const collisions: Rect[] = [];
  for (const wall of walls) {
    const [ax, az] = wall.a, [bx, bz] = wall.b;
    const vertical = ax === bx;
    const length = Math.hypot(bx - ax, bz - az);
    const height = wall.height ?? 3;
    const th = wall.thickness ?? (wall.external ? .2 : .12);
    const part = (start: number, end: number, bottom: number, top: number) => {
      if (end - start < .001 || top - bottom < .001 || bottom >= 1.9 || top <= .25) return;
      const mid = (start + end) / 2;
      const x = vertical ? ax : ax + mid, z = vertical ? az + mid : az;
      const w = vertical ? th : end - start, d = vertical ? end - start : th;
      collisions.push([x-w/2,z-d/2,x+w/2,z+d/2]);
    };
    let cursor = 0;
    for (const opening of [...(wall.openings ?? [])].sort((a,b)=>a.a-b.a)) {
      part(cursor,opening.a,0,height);
      part(opening.a,opening.b,0,opening.bottom);
      part(opening.a,opening.b,opening.top,height);
      if (opening.kind === 'window' && opening.bottom < 1.9)
        collisions.push(vertical ? [ax-.06,az+opening.a,ax+.06,az+opening.b] : [ax+opening.a,az-.06,ax+opening.b,az+.06]);
      cursor = opening.b;
    }
    part(cursor,length,0,height);
  }
  for (const [ax,az,bx,bz] of [[0,5,0,17.8],[0,17.8,4,17.8],[4,16.7,4,17.8]])
    collisions.push([Math.min(ax,bx)-.1,Math.min(az,bz)-.1,Math.max(ax,bx)+.1,Math.max(az,bz)+.1]);
  for (const [x,z] of [[0,5],[0,12.8],[0,17.8],[4,17.8]]) collisions.push([x-.16,z-.16,x+.16,z+.16]);
  return [...collisions,...coreObstacles];
}
