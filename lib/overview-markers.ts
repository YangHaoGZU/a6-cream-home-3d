export type ProjectedPoint = {id:string;x:number;y:number;anchorX:number;anchorY:number;visible:boolean};
// Separate nearby labels on small screens. Leader lines keep their true model
// locations clear, and hit testing uses these same displayed coordinates.
export function separateMarkers(points:ProjectedPoint[],width:number,height:number) {
  const shown=points.filter(p=>p.visible);
  const gap=34;
  for(let pass=0;pass<36;pass++)for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++){
    const a=shown[i],b=shown[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
    if(dist>=gap)continue;
    const nx=dist>.01?dx/dist:1,ny=dist>.01?dy/dist:0,shift=(gap-dist)/2+.02;
    a.x=Math.max(18,Math.min(width-18,a.x-nx*shift));a.y=Math.max(18,Math.min(height-18,a.y-ny*shift));
    b.x=Math.max(18,Math.min(width-18,b.x+nx*shift));b.y=Math.max(18,Math.min(height-18,b.y+ny*shift));
  }
  return points;
}
