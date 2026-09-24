import bpy, math, json, time, hashlib, sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2]
out=R/'models/nordic/panorama-references'
out.mkdir(parents=True,exist_ok=True)
points=json.loads((R/'lib/generated/panorama-points.json').read_text())
s=bpy.context.scene;s.timeline_markers.clear()
s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=32;s.cycles.use_denoising=True;s.cycles.adaptive_threshold=.06
s.render.use_persistent_data=True;s.render.resolution_x=2048;s.render.resolution_y=1024;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG'
camdata=bpy.data.cameras.new('Nordic panorama camera');camdata.type='PANO';camdata.panorama_type='EQUIRECTANGULAR'
cam=bpy.data.objects.new('Nordic panorama camera',camdata);s.collection.objects.link(cam);s.camera=cam
# With this orientation, equirectangular center = plan north, right quarter = east.
cam.rotation_euler=(math.pi/2,0,0)
only=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
report=json.loads((R/'lib/generated/render-report.json').read_text()) if (R/'lib/generated/render-report.json').exists() else []
for p in points:
 if only and p['id'] not in only:continue
 if not only and (out/(p['id']+'.png')).exists():continue
 cam.rotation_euler=(math.pi/2,0,p.get('textureYaw',0))
 cam.location=(p['position'][0],-p['position'][1],p['height']);bpy.context.view_layer.update()
 near=[]
 for k in range(8):
  v=Vector((math.cos(k*math.pi/4),math.sin(k*math.pi/4),0))
  hit,loc,n,idx,obj,m=s.ray_cast(bpy.context.evaluated_depsgraph_get(),cam.location,v,distance=.11)
  if hit:near.append(obj.name)
 if near:raise RuntimeError('Camera too close to surface: '+p['id']+str(near))
 s.render.filepath=str(out/(p['id']+'.png'));start=time.time();print('PANO_START',p['id'],flush=True)
 bpy.ops.render.render(write_still=True)
 item=dict(p,seconds=round(time.time()-start,2),nearSurfaceCheck='pass',width=2048,height=1024)
 report=[v for v in report if v['id']!=p['id']];report.append(item);(R/'lib/generated/render-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('PANO_DONE',p['id'],item['seconds'],flush=True)
