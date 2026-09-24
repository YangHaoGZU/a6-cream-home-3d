// Camera coordinates use the same metres and north orientation as lib/plan.ts.
export type PanoramaPoint = {
  id: string;
  room: string;
  name: string;
  position: [number, number];
  yaw: number;
  textureYaw?: number;
  links: string[];
};
import points from './generated/panorama-points.json';
export const panoramaPoints: PanoramaPoint[] = points.map(p => ({...p, position: [p.position[0], p.position[1]]}));
export function pointForRoom(room: string) {
  return panoramaPoints.find((point) => point.room === room) ?? panoramaPoints[0];
}
export function panoramaUrl(id: string, preview = false) {
  return `./panoramas/${id}${preview ? "-preview" : ""}.jpg?v=nordic-r03-tinypng`;
}
export function hotspotDirection(from: PanoramaPoint, to: PanoramaPoint) {
  const dx = to.position[0] - from.position[0],
    dz = to.position[1] - from.position[1];
  return { yaw: Math.atan2(-dx, -dz), pitch: -0.18 };
}
