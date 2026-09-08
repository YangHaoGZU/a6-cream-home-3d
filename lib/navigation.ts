export function fittedCameraDistance(mode: "plan" | "overview", aspect: number, fov = 46) {
  const vertical = (fov * Math.PI) / 360,
    tangent = Math.tan(vertical),
    ratio = Math.max(0.2, aspect);
  if (mode === "plan") return Math.max(10.8 / tangent, 9.2 / (tangent * ratio)) + 6;
  return (14 / Math.sin(Math.min(vertical, Math.atan(tangent * ratio)))) * 1.08;
}

// A second touch must not steal the finger that is already looking around.
export class LookPointer {
  id: number | null = null;
  begin(id: number) {
    if (this.id !== null) return false;
    this.id = id;
    return true;
  }
  owns(id: number) {
    return this.id === id;
  }
  end(id: number) {
    if (!this.owns(id)) return false;
    this.id = null;
    return true;
  }
  reset() {
    this.id = null;
  }
}
