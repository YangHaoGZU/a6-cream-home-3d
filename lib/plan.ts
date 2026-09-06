// Metres: x east, z south, y up. Labelled dimension chains are exact transcriptions.
export const DIMENSIONS = { width:15.2, westLength:17.8, eastLength:16.7, height:3, terraceHeight:6,
 northChain:[2.1,1.9,3,3.2,3.3,1.7], southChain:[4,3.2,1.8,4.1,2.1],
 westChain:[1.4,3.6,7.8,5], eastChain:[1.4,.9,2.6,1.7,5,1.8,2.7,.6] };
export type Rect = [number,number,number,number];
export type Room = {id:string;name:string;rect:Rect;height:number;position:[number,number];yaw:number;note:string;outdoor?:boolean};
export const rooms:Room[] = [
 {id:'living',name:'客厅',rect:[2.1,7.6,8.6,12.8],height:3,position:[5.2,9.4],yaw:Math.PI,note:'电视墙预留在南侧；本阶段不安装电视或家具。'},
 {id:'dining',name:'餐厅',rect:[2.1,5,8.6,7.6],height:3,position:[5.2,6.5],yaw:0,note:'与客厅连通，北接厨房，西邻长阳台。'},
 {id:'kitchen',name:'厨房',rect:[4,1.4,7,5],height:3,position:[5.5,3.4],yaw:0,note:'图示开间 3m；保留北侧生活阳台通道。'},
 {id:'balcony',name:'长阳台',rect:[0,5,2.1,12.8],height:3,position:[1.05,8.6],yaw:Math.PI,note:'西侧 7.8m 长段，层高 3m，防滑瓷砖。',outdoor:true},
 {id:'terrace',name:'挑空阳台',rect:[0,12.8,4,17.8],height:6,position:[1.6,15.5],yaw:-1.1,note:'图标 4×5m，层高 6m；无夹层、无家具。',outdoor:true},
 {id:'master',name:'主卧',rect:[9,13.4,13.1,16.7],height:3,position:[11,15],yaw:Math.PI,note:'南侧主卧套房；全屋延续浅米色瓷砖。'},
 {id:'entry',name:'玄关',rect:[7.2,8.9,8.6,11.6],height:3,position:[7.8,10.2],yaw:Math.PI/2,note:'东侧入户，面向客厅；保留南北通行。'},
 {id:'south',name:'南次卧',rect:[4,12.8,7.2,16.7],height:3,position:[5.5,14.8],yaw:Math.PI,note:'图示开间 3.2m；西侧相邻挑空阳台。'},
 {id:'north',name:'北次卧',rect:[7,1.4,10.2,5],height:3,position:[8.5,3.5],yaw:0,note:'图示开间 3.2m；保留北向窗。'},
 {id:'suite',name:'北套房',rect:[10.2,1.4,13.5,6.6],height:3,position:[11.7,3.8],yaw:0,note:'卧室开间 3.3m，南接衣帽区，东接卫生间。'},
 {id:'bath1',name:'北卫',rect:[13.5,2.3,15.2,4.9],height:3,position:[14.3,3.5],yaw:0,note:'图示 1.7×2.6m；仅展示墙地砖与吊顶。'},
 {id:'bath2',name:'公卫',rect:[7.2,14.25,9,16.7],height:3,position:[8.1,15.3],yaw:Math.PI,note:'图示开间 1.8m；门洞与进深按图暂定。'},
 {id:'bath3',name:'主卫',rect:[13.1,13.4,15.2,16.7],height:3,position:[14.2,15],yaw:Math.PI,note:'图示开间 2.1m；仅展示墙地砖与吊顶。'},
 {id:'utility',name:'生活阳台',rect:[4,0,7,1.4],height:3,position:[5.5,.7],yaw:0,note:'北侧进深 1.4m，层高 3m。',outdoor:true},
];
export const floorRects:Rect[] = [[4,0,7,5],[7,1.4,13.5,5],[13.5,2.3,15.2,6.6],[7,5,13.5,6.6],[0,5,8.6,11.6],[0,11.6,15.2,12.8],[0,12.8,4,17.8],[4,12.8,15.2,16.7]];
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
 {a:[8.6,6.6],b:[15.2,6.6],external:true},
 {a:[8.6,6.6],b:[8.6,11.6],external:true,openings:[door(2.45,3.75)]},
 {a:[8.6,11.6],b:[15.2,11.6],external:true},
 {a:[15.2,11.6],b:[15.2,16.7],external:true,openings:[win(2,3.6,1.2)]},
 {a:[4,16.7],b:[15.2,16.7],external:true,openings:[win(.18,3.02),win(3.38,4.82,1.3),win(5.18,8.92),win(9.28,11.02,.8)]},
 {a:[4,12.8],b:[4,16.7],height:6,external:true},
 {a:[4,12.8],b:[7.2,12.8],openings:[door(2.05,3.02)]},
 {a:[7.2,12.8],b:[7.2,16.7]},
 {a:[7.2,14.25],b:[9,14.25],openings:[door(.2,1.08)]},
 {a:[9,11.6],b:[9,16.7],openings:[door(.35,1.4)]},
 {a:[13.1,13.4],b:[13.1,16.7],openings:[door(.25,1.1)]},
 {a:[13.1,13.4],b:[15.2,13.4]},
 {a:[0,5],b:[4,5],external:true,openings:[win(.2,3.8,.2)]},
 {a:[2.1,5],b:[2.1,12.8],thickness:.07,openings:[win(.1,2.35,.05),door(2.4,4.3),win(4.35,7.7,.05)]},
];
export function contains(rect:Rect,x:number,z:number,margin=0){return x>=rect[0]+margin&&x<=rect[2]-margin&&z>=rect[1]+margin&&z<=rect[3]-margin}
export function roomAt(x:number,z:number){return [...rooms].reverse().find(r=>contains(r.rect,x,z))}
