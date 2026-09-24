import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2]
source=R/'models/nordic/A6_modern_nordic.blend'
out=R/'lib/generated/nordic-overview.json'
palette={'plaster':'#ebe6dd','white':'#eeeae0','oak':'#c1a47d','stone':'#c8c1b4','linen':'#d4ccbb','sage':'#929f89','blue':'#9aa8a8','clay':'#bd927b','dark':'#424842','green':'#68855b','glass':'#c0d0ca'}
def group(mat):
 n=mat.name.lower() if mat else ''
 for token,key in [('glaz','glass'),('mirror','glass'),('plant','green'),('soil','dark'),('graphite','dark'),('screen','dark'),('sage','sage'),('terracotta','clay'),('gray bedding','blue'),('linen','linen'),('stone','stone'),('quartz','stone'),('oak','oak'),('ceramic','white'),('cabinetry','white')]:
  if token in n:return key
 return 'plaster'
batch={};original=0;removed=[];kept=0
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 o.data.calc_loop_triangles();original+=len(o.data.loop_triangles)
 n=o.name.lower()
 if any(t in n for t in ['ceiling','upper slab underside',' plank',' grout','stone joint','linen curtain fold']) or o.name.startswith(('Book.','Book','Furniture leg')) and 'Bookcase' not in o.name:
  # Bookcase outer panels and shelves remain; individual book spines are omitted.
  if not ('bookcase' in n or 'shelf' in n):removed.append(o.name);continue
 if 'ceiling' in n or 'upper slab underside' in n or ' plank' in n or ' grout' in n or 'stone joint' in n or 'linen curtain fold' in n:
  removed.append(o.name);continue
 material=o.data.materials[0] if o.data.materials else None;key=group(material)
 # Boundaries are sectioned only for the overview, preserving exact plan extents.
 section=(key in ['plaster','glass'] or any(t in n for t in ['mullion','frame','jamb','door','pier','column','rail'])) and not any(t in n for t in ['cabinet','fridge','laundry','basin','pillow','bed','sofa'])
 if 'public circulation core' in n:section=True;key='stone'
 mesh=o.data
 temp=None
 if any(t in n for t in [' leaf','pedestal',' seat']) and len(mesh.polygons)>30:
  tmp=o.copy();tmp.data=o.data.copy();bpy.context.collection.objects.link(tmp)
  for mod in list(tmp.modifiers):tmp.modifiers.remove(mod)
  dec=tmp.modifiers.new('Web simplification','DECIMATE');dec.ratio=.32
  tmp_eval=tmp.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=tmp_eval.to_mesh();temp=(tmp,tmp_eval)
 mesh.calc_loop_triangles();b=batch.setdefault(key,{'positions':[],'indices':[],'lookup':{}})
 for tri in mesh.loop_triangles:
  vertices=[]
  for idx in tri.vertices:
   v=o.matrix_world@mesh.vertices[idx].co
   if section:v.z=min(v.z,1.20)
   vertices.append((round(v.x*1000),round(v.z*1000),round(-v.y*1000)))
  if len(set(vertices))<3:continue
  if (Vector(vertices[1])-Vector(vertices[0])).cross(Vector(vertices[2])-Vector(vertices[0])).length_squared<1:continue
  for v in vertices:
   if v not in b['lookup']:b['lookup'][v]=len(b['positions'])//3;b['positions'].extend(v)
   b['indices'].append(b['lookup'][v])
 if temp:temp[1].to_mesh_clear();bpy.data.objects.remove(temp[0],do_unlink=True)
 kept+=1
groups=[]
for key,b in batch.items():
 if not b['indices']:continue
 groups.append(dict(name=key,color=palette[key],positions=b['positions'],indices=b['indices'],opacity=.16 if key=='glass' else 1))
triangles=sum(len(b['indices'])//3 for b in groups)
data=dict(revision='nordic-r02',sourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),coordinateSystem='x east, y up, z south; metres',quantization=1000,triangles=triangles,sourceBaseTriangles=original,drawCalls=len(groups),wallSectionHeight=1.2,actualRoomHeight=3,actualTerraceHeight=6,omittedObjects=len(removed),sourceObjectsKept=kept,groups=groups)
out.write_text(json.dumps(data,separators=(',',':')))
(R/'models/nordic/overview-report.json').write_text(json.dumps({k:v for k,v in data.items() if k!='groups'},ensure_ascii=False,indent=2))
print('WEB_MODEL',triangles,'triangles',len(groups),'batches',out.stat().st_size,'bytes; original base',original,flush=True)
