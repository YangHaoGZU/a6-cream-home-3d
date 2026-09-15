// Camera coordinates use the same metres and north orientation as lib/plan.ts.
export type PanoramaPoint = {
  id: string;
  room: string;
  name: string;
  position: [number, number];
  yaw: number;
  links: string[];
};
export const panoramaPoints: PanoramaPoint[] = [
  {
    id: "living-entry",
    room: "living",
    name: "客厅 · 入户视角",
    position: [7.15, 10.45],
    yaw: 2.1,
    links: ["living-window", "dining-east", "entry"],
  },
  {
    id: "living-window",
    room: "living",
    name: "客厅 · 阳台视角",
    position: [3.9, 11.85],
    yaw: -1.7,
    links: ["living-entry", "balcony-south", "terrace-north"],
  },
  {
    id: "dining-west",
    room: "dining",
    name: "餐厅 · 窗边",
    position: [3.1, 6.4],
    yaw: -1.57,
    links: ["dining-east", "kitchen-south", "balcony-north"],
  },
  {
    id: "dining-east",
    room: "dining",
    name: "餐厅 · 客厅侧",
    position: [7.45, 6.7],
    yaw: 1.4,
    links: ["dining-west", "living-entry", "north", "suite"],
  },
  {
    id: "kitchen-south",
    room: "kitchen",
    name: "厨房 · 操作区",
    position: [5.5, 3.4],
    yaw: 0,
    links: ["kitchen-north", "dining-west"],
  },
  {
    id: "kitchen-north",
    room: "kitchen",
    name: "厨房 · 生活阳台侧",
    position: [5.55, 1.98],
    yaw: Math.PI,
    links: ["kitchen-south", "utility"],
  },
  {
    id: "balcony-north",
    room: "balcony",
    name: "长阳台 · 北段",
    position: [1.35, 6.15],
    yaw: Math.PI,
    links: ["balcony-south", "dining-west"],
  },
  {
    id: "balcony-south",
    room: "balcony",
    name: "长阳台 · 南段",
    position: [1.05, 11.9],
    yaw: Math.PI,
    links: ["balcony-north", "terrace-north", "living-window"],
  },
  {
    id: "terrace-north",
    room: "terrace",
    name: "挑空阳台 · 玻璃窗边",
    position: [2.9, 14],
    yaw: 0.6,
    links: ["terrace-south", "balcony-south"],
  },
  {
    id: "terrace-south",
    room: "terrace",
    name: "挑空阳台 · 花园侧",
    position: [2.8, 15.8],
    yaw: 0,
    links: ["terrace-north"],
  },
  {
    id: "master-entry",
    room: "master",
    name: "主卧 · 衣帽间侧",
    position: [10.1, 14.25],
    yaw: -1.95,
    links: ["master-window", "bath3", "entry"],
  },
  {
    id: "master-window",
    room: "master",
    name: "主卧 · 窗边",
    position: [10.45, 16.05],
    yaw: -0.6,
    links: ["master-entry"],
  },
  {
    id: "south",
    room: "south",
    name: "南次卧",
    position: [6.65, 14.05],
    yaw: 2,
    links: ["bath2", "entry"],
  },
  {
    id: "north",
    room: "north",
    name: "北次卧",
    position: [9.65, 4.35],
    yaw: 0.85,
    links: ["dining-east"],
  },
  {
    id: "suite",
    room: "suite",
    name: "北套房",
    position: [10.65, 4.5],
    yaw: -0.95,
    links: ["bath1", "dining-east"],
  },
  {
    id: "entry",
    room: "entry",
    name: "玄关",
    position: [7.8, 9.65],
    yaw: Math.PI / 2,
    links: ["living-entry", "lobby", "south", "master-entry", "bath2"],
  },
  { id: "bath1", room: "bath1", name: "北卫", position: [14.4, 4.5], yaw: 0, links: ["suite"] },
  {
    id: "bath2",
    room: "bath2",
    name: "公卫",
    position: [8.15, 14.6],
    yaw: Math.PI,
    links: ["south", "entry"],
  },
  {
    id: "bath3",
    room: "bath3",
    name: "主卫",
    position: [13.65, 14.4],
    yaw: -2.3,
    links: ["master-entry"],
  },
  {
    id: "utility",
    room: "utility",
    name: "生活阳台",
    position: [5.5, 0.7],
    yaw: 0,
    links: ["kitchen-north"],
  },
  {
    id: "lobby",
    room: "lobby",
    name: "电梯厅",
    position: [10.65, 10.55],
    yaw: 1.4,
    links: ["entry", "hall", "lift", "stairs"],
  },
  {
    id: "hall",
    room: "hall",
    name: "公共走廊",
    position: [14.35, 10.88],
    yaw: Math.PI / 2,
    links: ["lobby"],
  },
  {
    id: "lift",
    room: "lift",
    name: "电梯轿厢",
    position: [9.72, 7.85],
    yaw: Math.PI,
    links: ["lobby"],
  },
  {
    id: "stairs",
    room: "stairs",
    name: "步梯",
    position: [12.3, 8.7],
    yaw: -Math.PI / 2,
    links: ["lobby"],
  },
];
export function pointForRoom(room: string) {
  return panoramaPoints.find((point) => point.room === room) ?? panoramaPoints[0];
}
export function panoramaUrl(id: string, preview = false) {
  return `./panoramas/${id}${preview ? "-preview" : ""}.jpg?v=ai-photo-v1-tinypng`;
}
export function hotspotDirection(from: PanoramaPoint, to: PanoramaPoint) {
  const dx = to.position[0] - from.position[0],
    dz = to.position[1] - from.position[1];
  return { yaw: Math.atan2(-dx, -dz), pitch: -0.18 };
}
