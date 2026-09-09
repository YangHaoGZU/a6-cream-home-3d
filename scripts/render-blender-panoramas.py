import bpy,math,json,time,hashlib,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parent.parent;source=R/'models/A6-modern-minimalist-v3.blend';out=R/'public/panoramas';out.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene
s.timeline_markers.clear() # Do not let perspective camera markers override pano selection.
s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=48;s.cycles.adaptive_threshold=.055;s.cycles.adaptive_min_samples=12;s.cycles.use_denoising=True
s.render.use_persistent_data=True;s.render.resolution_x=3072;s.render.resolution_y=1536;s.render.resolution_percentage=100
s.render.image_settings.file_format='JPEG';s.render.image_settings.quality=95
points=json.loads((R/'public/models/panorama-cameras.json').read_text())
cameras={o['point_id']:o for o in s.objects if o.type=='CAMERA' and o.get('point_id')}
manifest=[];report=out/'render-info.json'
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
previous=json.loads(report.read_text()) if report.exists() else {}
reusable={p['id'] for p in previous.get('rendered',[])} if previous.get('sourceHash')==source_hash else set()
only=sys.argv[sys.argv.index('--')+1].split(',') if '--' in sys.argv else None
for point in points:
 id=point['id']
 if only and id not in only:continue
 c=cameras[id];s.camera=c;c.data.type='PANO';c.data.panorama_type='EQUIRECTANGULAR';c.rotation_euler=(math.pi/2,0,0)
 # Use the named camera's actual position and detect accidental near-surface placement.
 bpy.context.view_layer.update();near=[]
 for direction in [Vector((1,0,0)),Vector((-1,0,0)),Vector((0,1,0)),Vector((0,-1,0))]:
  hit,loc,normal,idx,obj,matrix=s.ray_cast(bpy.context.evaluated_depsgraph_get(),c.location,direction,distance=.12)
  if hit:near.append(obj.name)
 if near:raise RuntimeError('Panorama camera too close: '+id+str(near))
 s.render.filepath=str(out/(id+'.jpg'));start=time.time()
 if id not in reusable or not Path(s.render.filepath).exists():bpy.ops.render.render(write_still=True)
 item={'id':id,'seconds':round(time.time()-start,1),'position':list(c.location),'bytes':Path(s.render.filepath).stat().st_size};manifest.append(item)
 report.write_text(json.dumps({'engine':'Blender Cycles','revision':'modern-v3-closed-door','sourceHash':hashlib.sha256(source.read_bytes()).hexdigest(),'width':3072,'height':1536,'maxSamples':48,'denoising':True,'rendered':manifest},ensure_ascii=False,indent=2))
 print('PANO_READY',id,item['seconds'],len(manifest),flush=True)
print('PANORAMAS_COMPLETE',len(manifest),flush=True)
