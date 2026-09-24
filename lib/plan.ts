// Metres: x east, z south, y up. Labelled dimension chains are exact transcriptions.
export const DIMENSIONS = { width:15.2, westLength:17.8, eastLength:16.4, height:3, terraceHeight:6,
 northChain:[2.1,1.9,3,3.2,3.3,1.7], southChain:[4,3.2,1.8,4.1,2.1],
 westChain:[1.4,3.6,7.8,5], eastChain:[1.4,.6,2.6,1.7,5,1.8,2.7,.6] };
export type Rect = [number,number,number,number];
export type Room = {id:string;name:string;rect:Rect;height:number;position:[number,number];yaw:number;note:string;outdoor?:boolean};
export const rooms:Room[] = [
  {
    "id": "living",
    "name": "客厅与南墙电视",
    "rect": [
      2.1,
      8.8,
      8.8,
      12.8
    ],
    "height": 3,
    "position": [
      7.8,
      8.65
    ],
    "yaw": 2.411256885566015,
    "note": "南墙电视，沙发朝南；保留窗边单椅，茶几西侧留空。"
  },
  {
    "id": "dining",
    "name": "餐厅与宽厨房入口",
    "rect": [
      4,
      5,
      8.8,
      8.8
    ],
    "height": 3,
    "position": [
      6.5,
      8.72
    ],
    "yaw": 0.6480282408431547,
    "note": "六人餐桌，厨房居中扩大开口，通道保持通畅。"
  },
  {
    "id": "study",
    "name": "开放书房",
    "rect": [
      0,
      5,
      4,
      8.5
    ],
    "height": 3,
    "position": [
      3.45,
      8.5
    ],
    "yaw": 0.547284380987437,
    "note": "北侧实墙设2.6m书柜，柜前1.8×0.75m独立书桌。"
  },
  {
    "id": "balcony",
    "name": "西侧阳台休闲区",
    "rect": [
      0,
      8.5,
      2.1,
      12.8
    ],
    "height": 3,
    "position": [
      2.62,
      8.5
    ],
    "yaw": 2.5785115755365746,
    "note": "并入室内公共区，南侧可通往挑空庭院。"
  },
  {
    "id": "terrace",
    "name": "6米挑空庭院",
    "rect": [
      0,
      12.8,
      4,
      17.8
    ],
    "height": 6,
    "position": [
      0.3,
      13.15
    ],
    "yaw": -2.4410962836420667,
    "note": "4×5m，层高6m；保留与客厅之间的玻璃隔断。",
    "outdoor": true
  },
  {
    "id": "entry",
    "name": "玄关及卧室通道",
    "rect": [
      7.2,
      8.8,
      8.8,
      12.8
    ],
    "height": 3,
    "position": [
      6.38,
      10.25
    ],
    "yaw": -0.9817996877894449,
    "note": "东侧入户与鞋柜，连接南北卧室及公共空间。"
  },
  {
    "id": "kitchen",
    "name": "厨房",
    "rect": [
      4,
      1.4,
      7,
      5
    ],
    "height": 3,
    "position": [
      5.5,
      5.66
    ],
    "yaw": -0.0,
    "note": "3×3.6m标注范围；1.8m入口，两侧橱柜，中间约1.5m过道。"
  },
  {
    "id": "utility",
    "name": "生活阳台洗烘区",
    "rect": [
      4,
      0,
      7,
      1.4
    ],
    "height": 3,
    "position": [
      5.7,
      1.15
    ],
    "yaw": 1.1441688336680205,
    "note": "3×1.4m，洗烘叠放、浅储物柜与折叠台。"
  },
  {
    "id": "master",
    "name": "东南主卧",
    "rect": [
      9,
      13.1,
      13.1,
      16.4
    ],
    "height": 3,
    "position": [
      9.38,
      13.5
    ],
    "yaw": -1.9720251257997454,
    "note": "床垫1.8×2m，浅橡木床架，南侧落地窗边空间计入室内。"
  },
  {
    "id": "master-dressing",
    "name": "主卧衣帽区",
    "rect": [
      9,
      11.3,
      15.2,
      13.1
    ],
    "height": 3,
    "position": [
      11.02,
      13.05
    ],
    "yaw": -1.0534030591317967,
    "note": "北侧定制衣柜，连接主卧与独立主卫。"
  },
  {
    "id": "suite",
    "name": "东北套房床区",
    "rect": [
      10.2,
      1.4,
      13.5,
      4.6
    ],
    "height": 3,
    "position": [
      10.55,
      4.75
    ],
    "yaw": -0.760403369778528,
    "note": "床垫1.8×2m，北侧落地空间与室内齐平。"
  },
  {
    "id": "suite-dressing",
    "name": "东北套房衣帽区",
    "rect": [
      10.2,
      4.6,
      15.2,
      6.3
    ],
    "height": 3,
    "position": [
      10.65,
      4.92
    ],
    "yaw": -1.788350445928905,
    "note": "与东北卧室连通的定制衣柜及套卫入口。"
  },
  {
    "id": "south",
    "name": "南侧次卧",
    "rect": [
      4,
      12.8,
      7.2,
      16.4
    ],
    "height": 3,
    "position": [
      6.08,
      16.04
    ],
    "yaw": 0.11425432796143965,
    "note": "床垫1.5×2m；门在东侧公共洗手区入口，向内靠北墙开启。"
  },
  {
    "id": "north",
    "name": "北侧次卧",
    "rect": [
      7,
      1.4,
      10.2,
      5
    ],
    "height": 3,
    "position": [
      7.45,
      1.92
    ],
    "yaw": -2.6042265789442336,
    "note": "床垫1.5×2m；北侧落地窗边带计入可用空间。"
  },
  {
    "id": "bath3",
    "name": "主卫生间",
    "rect": [
      13.1,
      13.1,
      15.2,
      15.8
    ],
    "height": 3,
    "position": [
      13.57,
      13.36
    ],
    "yaw": -2.8405288029729956,
    "note": "2.1×2.7m标注范围；马桶水箱背靠西墙、向东摆放。"
  },
  {
    "id": "bath1",
    "name": "东北套卫",
    "rect": [
      13.5,
      2,
      15.2,
      4.6
    ],
    "height": 3,
    "position": [
      14.53,
      4.36
    ],
    "yaw": 0.1179336000300519,
    "note": "1.7×2.6m标注范围；马桶水箱背靠西墙、向东摆放。"
  },
  {
    "id": "bath2",
    "name": "公共卫生间",
    "rect": [
      7.2,
      13.9,
      9,
      16.4
    ],
    "height": 3,
    "position": [
      7.62,
      14.15
    ],
    "yaw": -2.743964662067664,
    "note": "1.8×2.5m标注范围；玻璃淋浴隔断。"
  },
  {
    "id": "wash",
    "name": "公共洗手区与南次卧入口",
    "rect": [
      7.2,
      12.8,
      9,
      13.9
    ],
    "height": 3,
    "position": [
      7.65,
      11.95
    ],
    "yaw": -2.7696750223390127,
    "note": "外置洗手台，连接南次卧和公共卫生间。"
  }
];
export const floorRects:Rect[] = [[4,0,7,5],[7,1.4,13.5,5],[13.5,2,15.2,6.3],[7,5,13.5,6.3],[0,5,8.8,12.8],[8.8,11.3,15.2,12.8],[0,12.8,4,17.8],[4,12.8,13.1,16.4],[13.1,12.8,15.2,15.8]];
export type Opening = {a:number;b:number;bottom:number;top:number;kind:'door'|'window'};
export type Wall = {a:[number,number];b:[number,number];height?:number;thickness?:number;openings?:Opening[];external?:boolean};
// Legacy walkthrough definitions; active overview uses the exported Blender mesh.
// Unlabelled wall thickness, door/window widths and partition positions are proportional estimates.
const door=(a:number,b:number):Opening=>({a,b,bottom:0,top:2.35,kind:'door'});
const win=(a:number,b:number,bottom=.65,top=2.65):Opening=>({a,b,bottom,top,kind:'window'});
export const walls:Wall[]=[
 {a:[4,0],b:[7,0],external:true,openings:[win(.15,2.85,.15)]},
 {a:[4,0],b:[4,5],external:true,openings:[win(.12,1.25,.15),win(1.8,4.35,1.05)]},
 {a:[7,0],b:[7,5]},
 {a:[4,1.4],b:[7,1.4],openings:[win(.1,.92,1),door(1.02,2.02)]},
 {a:[4,5],b:[7,5],openings:[door(.25,2.75)]},
 {a:[7,1.4],b:[13.5,1.4],external:true,openings:[win(.18,3.02),win(3.38,6.3)]},
 {a:[13.5,1.4],b:[13.5,2.3],external:true},
 {a:[13.5,2.3],b:[15.2,2.3],external:true,openings:[win(.18,1.52,1.2)]},
 {a:[15.2,2.3],b:[15.2,6.6],external:true,openings:[win(.35,2.2,1.2)]},
 {a:[10.2,1.4],b:[10.2,6.6],openings:[door(3.8,4.75)]},
 {a:[7,5],b:[10.2,5],openings:[door(2.05,3)]},
 {a:[13.5,2.3],b:[13.5,4.9]},
 {a:[13.5,4.9],b:[15.2,4.9],openings:[door(.25,1.1)]},
 {a:[8.6,6.6],b:[11.8,6.6],external:true},
 {a:[11.8,6.6],b:[16.4,6.6],height:6,external:true},
 {a:[8.6,6.6],b:[8.6,11.6],external:true,openings:[door(2.45,3.75)]},
 {a:[8.6,11.6],b:[15.2,11.6],external:true},
 {a:[15.2,11.6],b:[15.2,16.7],external:true,openings:[win(2,3.6,1.2)]},
 {a:[4,16.7],b:[15.2,16.7],external:true,openings:[win(.18,3.02),win(3.38,4.82,1.3),win(5.18,8.92),win(9.28,11.02,.8)]},
 {a:[4,12.8],b:[4,16.7],height:6,external:true},
 {a:[4,12.8],b:[7.2,12.8]},
 // Glazed return between the long balcony inner edge and the south bedroom.
 // The west 2.1m passage remains open to the double-height terrace.
 {a:[2.1,12.8],b:[4,12.8],thickness:.07,openings:[win(.045,1.855,.04,2.8)]},
 {a:[7.2,12.8],b:[7.2,16.7],openings:[door(.25,1.15)]},
 {a:[7.2,14.25],b:[9,14.25],openings:[door(.2,1.08)]},
 {a:[9,11.6],b:[9,16.7],openings:[door(.35,1.4)]},
 {a:[13.1,13.4],b:[13.1,16.7]},
 {a:[13.1,13.4],b:[15.2,13.4],openings:[door(1.05,1.95)]},
 {a:[0,5],b:[4,5],external:true},
 // Living room and long balcony are connected in V3; the glazing is on the exterior west edge.
 // Shared core from the developer diagram; east corridor end is deliberately closed.
 {a:[15.2,11.6],b:[16.4,11.6],external:true},
 {a:[16.4,6.6],b:[16.4,9.4],height:6,external:true},
 {a:[16.4,9.4],b:[16.4,11.6],external:true},
 {a:[10.85,6.6],b:[10.85,8.95],thickness:.18},
 {a:[8.6,8.95],b:[10.85,8.95],thickness:.18,openings:[door(.4,1.7)]},
 {a:[11.8,6.6],b:[11.8,9.4],height:6,thickness:.16,openings:[door(1.45,2.65)]},
 {a:[11.8,9.4],b:[16.4,9.4],height:6,thickness:.16},
];
export const coreObstacles:Rect[]=[
 [11.8,9.4,16.4,10.22], // service cupboards along corridor north wall
 [12.72,7.787,15.18,8.168], // central stair balustrade, including the handrail radius
 [11.91,7.78,12.77,7.84], // edge of upper landing
 [8.56,9.095,8.64,10.305], // closed entrance door synced from Blender
 [8.702,6.75,8.738,8.805], // lift cabin side walls, inset from the shaft
 [10.717,6.75,10.753,8.805],
 [8.695,6.737,10.745,6.773],
];
// Stepped floor heights match the nine risers in each half-flight.
export function floorElevation(x:number,z:number){
 if(x>=15.15&&x<=16.27&&z>=6.77&&z<=9.25)return 1.5;
 if(x>=12.8&&x<15.15&&z>=8.18&&z<=9.25)return Math.ceil((x-12.8)/2.35*9)*1.5/9;
 if(x>=12.8&&x<15.15&&z>=6.77&&z<=7.78)return 1.5+Math.ceil((15.15-x)/2.35*9)*1.5/9;
 if(x>=11.91&&x<12.8&&z>=6.77&&z<=7.78)return 3;
 return 0;
}
export function contains(rect:Rect,x:number,z:number,margin=0){return x>=rect[0]+margin&&x<=rect[2]-margin&&z>=rect[1]+margin&&z<=rect[3]-margin}
export function roomAt(x:number,z:number){return [...rooms].reverse().find(r=>contains(r.rect,x,z))}
