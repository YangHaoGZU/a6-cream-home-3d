// Metres: x east, z south, y up. Labelled dimension chains are exact transcriptions.
export const DIMENSIONS = { width:15.2, westLength:17.8, eastLength:16.7, height:3, terraceHeight:6,
 northChain:[2.1,1.9,3,3.2,3.3,1.7], southChain:[4,3.2,1.8,4.1,2.1],
 westChain:[1.4,3.6,7.8,5], eastChain:[1.4,.9,2.6,1.7,5,1.8,2.7,.6] };
export type Rect = [number,number,number,number];
export type Room = {id:string;name:string;rect:Rect;height:number;position:[number,number];yaw:number;note:string;outdoor?:boolean};
export const rooms:Room[] = [
 {id:'living',name:'客厅',rect:[2.1,7.6,8.6,12.8],height:3,position:[7.15,10.45],yaw:2.1,note:'电视置于南侧实墙，米白亚麻沙发朝南，搭配浅石色茶几。'},
 {id:'dining',name:'餐厅',rect:[2.1,5,8.6,7.6],height:3,position:[3.1,6.4],yaw:-1.57,note:'浅木色餐桌、六把藤编餐椅与餐边柜，北接厨房。'},
 {id:'kitchen',name:'厨房',rect:[4,1.4,7,5],height:3,position:[5.5,3.4],yaw:0,note:'图示开间 3m；保留北侧生活阳台通道。'},
 {id:'balcony',name:'长阳台',rect:[0,5,2.1,12.8],height:3,position:[1.05,8.6],yaw:Math.PI,note:'西侧 7.8m 长段，层高 3m，防滑瓷砖。',outdoor:true},
 {id:'terrace',name:'挑空阳台',rect:[0,12.8,4,17.8],height:6,position:[2.9,14],yaw:.6,note:'4×5m、层高 6m；遮阳伞、木制桌椅与绿植。',outdoor:true},
 {id:'master',name:'主卧',rect:[9,11.6,15.2,16.7],height:3,position:[10.1,14.25],yaw:-1.95,note:'按房开图将床头靠东，北侧设 L 形衣帽间；地面保持瓷砖。'},
 {id:'entry',name:'玄关',rect:[7.2,8.9,8.6,11.6],height:3,position:[7.8,9.65],yaw:Math.PI/2,note:'东侧入户，面向客厅；大门与电梯厅相通。'},
 {id:'south',name:'南次卧',rect:[4,12.8,7.2,16.7],height:3,position:[6.65,14.05],yaw:2,note:'床头靠西，衣柜沿北墙布置；保留朝向公卫过道的东向门。'},
 {id:'north',name:'北次卧',rect:[7,1.4,10.2,5],height:3,position:[9.65,4.35],yaw:.85,note:'床头靠西，衣柜沿南墙布置，留出东南侧进门通道。'},
 {id:'suite',name:'北套房',rect:[10.2,1.4,15.2,6.6],height:3,position:[10.65,4.5],yaw:-.95,note:'床头靠东，南侧按图设置 L 形衣帽区及独立卫生间。'},
 {id:'bath1',name:'北卫',rect:[13.5,2.3,15.2,4.9],height:3,position:[14.4,4.5],yaw:0,note:'浴室柜、镜柜、智能马桶及玻璃淋浴隔断。'},
 {id:'bath2',name:'公卫',rect:[7.2,14.25,9,16.7],height:3,position:[8.15,14.6],yaw:Math.PI,note:'浅灰墙地砖、洗手台、智能马桶与独立淋浴区。'},
 {id:'bath3',name:'主卫',rect:[13.1,13.4,15.2,16.7],height:3,position:[13.65,14.4],yaw:-2.3,note:'浴室柜、背光镜、智能马桶、淋浴区与独立浴缸。'},
 {id:'utility',name:'生活阳台',rect:[4,0,7,1.4],height:3,position:[5.5,.7],yaw:0,note:'北侧进深 1.4m，层高 3m。',outdoor:true},
 {id:'lobby',name:'电梯厅',rect:[8.6,8.95,11.8,11.6],height:3,position:[10.65,10.55],yaw:1.4,note:'电梯正对厅内，西侧入户；大门南边增设白色鞋柜。'},
 {id:'hall',name:'公共走廊',rect:[11.8,10.22,16.4,11.6],height:3,position:[14.35,10.88],yaw:Math.PI/2,note:'北侧设备井门，走廊东端实墙封闭，西接电梯厅。'},
 {id:'stairs',name:'步梯',rect:[11.8,6.6,16.4,9.4],height:3,position:[12.3,8.7],yaw:-Math.PI/2,note:'双跑楼梯、休息平台与金属扶手；每层高差 3m，可沿踏步行走。'},
 {id:'lift',name:'电梯',rect:[8.6,6.6,10.85,8.95],height:3,position:[9.72,7.85],yaw:Math.PI,note:'20 层电梯轿厢，配金属门套、按钮面板与层显。'},
];
export const floorRects:Rect[] = [[4,0,7,5],[7,1.4,13.5,5],[13.5,2.3,15.2,6.6],[7,5,13.5,6.6],[0,5,8.6,11.6],[0,11.6,15.2,12.8],[0,12.8,4,17.8],[4,12.8,15.2,16.7],[8.6,6.6,16.4,11.6]];
export type Opening = {a:number;b:number;bottom:number;top:number;kind:'door'|'window'};
export type Wall = {a:[number,number];b:[number,number];height?:number;thickness?:number;openings?:Opening[];external?:boolean};
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
