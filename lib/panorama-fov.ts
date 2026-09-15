// Keep landscape screens from turning a 75° vertical view into an exaggerated
// 110°+ horizontal view. This controls display perspective, not image geometry.
const degrees = (radians: number) => radians * 180 / Math.PI;
const verticalForHorizontal = (horizontal: number, aspect: number) =>
  degrees(2 * Math.atan(Math.tan(horizontal * Math.PI / 360) / Math.max(aspect, .1)));
export function panoramaDefaultFov(aspect: number) {
  return Math.min(75, verticalForHorizontal(90, aspect));
}
export function panoramaFovBounds(aspect: number): [number, number] {
  return [panoramaDefaultFov(aspect) * .5, Math.min(95, verticalForHorizontal(110, aspect))];
}
