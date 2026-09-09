import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Matrix
R=Path(__file__).resolve().parent.parent;source=R/'models/A6-modern-minimalist-v3.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene
bpy.context.preferences.edit.use_global_undo=False
# Web materials use the same neutral palette; procedural micro-detail stays in Cycles panoramas.
for m in bpy.data.materials:
 if not m.use_nodes:continue
 nt=m.node_tree;b=next((n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not b:continue
 color=list(b.inputs['Base Color'].default_value);rough=b.inputs['Roughness'].default_value;metal=b.inputs['Metallic'].default_value;trans=b.inputs['Transmission Weight'].default_value
 emit=list(b.inputs['Emission Color'].default_value);strength=b.inputs['Emission Strength'].default_value
 if any(n.type=='TEX_IMAGE' and n.image and 'cream-stone' in n.image.name for n in nt.nodes):color=[.68,.69,.70,1]
 if 'V3' not in m.name and color[0]>color[2]*1.08 and trans<.1:
  v=sum(color[:3])/3;color=[v*1.01,v,v*.99,1]
 nt.nodes.clear();b=nt.nodes.new('ShaderNodeBsdfPrincipled');out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(b.outputs[0],out.inputs[0])
 b.inputs['Base Color'].default_value=color;b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
 b.inputs['Transmission Weight'].default_value=trans;b.inputs['IOR'].default_value=1.46
 b.inputs['Emission Color'].default_value=emit;b.inputs['Emission Strength'].default_value=strength
 m.diffuse_color=color
print('EVALUATE GEOMETRY',flush=True)
c=bpy.data.collections.new('WEB EXPORT');s.collection.children.link(c);dg=bpy.context.evaluated_depsgraph_get();groups={};catalog=[]
for o in list(s.objects):
 if o.type=='EMPTY' and o.get('product'):catalog.append({'name':o.name,'product':o['product'],'dimensions':list(o['official_dimensions_m']),'url':o['official_reference']})
 if o.type not in ('MESH','CURVE','FONT') or o.hide_render:continue
 names=[x.name for x in o.users_collection];name=o.name
 cat='furniture'
 if any('吊顶' in n for n in names) or name.startswith('architecture-ceilings') or name.startswith('公共区域顶面'):cat='ceilings'
 elif any('下部楼体' in n for n in names) or name.startswith('57m lower facade'):cat='facade'
 elif name.startswith(('architecture-walls','architecture-floors','电梯、步梯与公共走廊','入户大门','顶装连续','双轨','移门','封窗','中空玻璃')) or any('原户型墙地面' in n for n in names):cat='architecture'
 if o.parent and any(t in o.parent.name for t in ['长阳台 · 外侧','阳台封窗','长阳台外侧']):cat='architecture'
 if name.startswith(('吊灯/','吊灯灯体','吊灯下发光面','吊灯钢索','浴霸','排风浴霸','生活阳台LED灯具')):cat='ceilings'
 ev=o.evaluated_get(dg);me=bpy.data.meshes.new_from_object(ev,depsgraph=dg)
 if not me or not len(me.polygons):continue
 obj=bpy.data.objects.new(cat,me);c.objects.link(obj);obj.matrix_world=o.matrix_world.copy()
 if len(me.polygons)>12000:
  mod=obj.modifiers.new('Web decimation','DECIMATE');mod.ratio=min(1,10000/len(me.polygons));bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);obj.select_set(False)
 groups.setdefault(cat,[]).append(obj)
for o in list(s.objects):
 if c not in o.users_collection:bpy.data.objects.remove(o,do_unlink=True)
print('JOIN',[(k,len(v)) for k,v in groups.items()],flush=True)
for cat,objs in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();joined=bpy.context.object;joined.name=cat
 # Apply world transforms before glTF axis conversion.
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 joined['category']=cat
p=R/'public/models';p.mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(p/'a6-modern-v3.glb'),export_format='GLB',use_selection=False,export_cameras=False,export_lights=False,export_extras=True,export_animations=False,export_apply=True,export_yup=True)
meta={'revision':'modern-v3-closed-door','sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'furniture':catalog,'units':'metres','axes':'Three.js Y-up, north=-Z','closedEntrance':True}
(p/'a6-modern-v3.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('EXPORTED', (p/'a6-modern-v3.glb').stat().st_size,flush=True)
