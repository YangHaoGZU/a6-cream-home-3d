"""Render the actual Three.js model as north-centred equirectangular Cycles images.
blender -b -t 12 --python scripts/render-panoramas.py -- --width 3072 --samples 96
"""
import bpy, json, math, sys, argparse, time
from pathlib import Path
from mathutils import Matrix, Vector
parser=argparse.ArgumentParser()
parser.add_argument('--width',type=int,default=3072)
parser.add_argument('--samples',type=int,default=96)
parser.add_argument('--only',default='')
parser.add_argument('--draft',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
root=Path(__file__).resolve().parent.parent
data_dir=root.parent/'render-data'
data=json.loads((data_dir/'scene.json').read_text())
output=root/'public/panoramas';output.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES'
scene.cycles.samples=args.samples;scene.cycles.use_denoising=True
scene.cycles.adaptive_threshold=.045
scene.cycles.adaptive_min_samples=8
scene.cycles.max_bounces=8;scene.cycles.diffuse_bounces=4;scene.cycles.glossy_bounces=4
scene.cycles.transmission_bounces=8;scene.cycles.transparent_max_bounces=12
scene.cycles.sample_clamp_indirect=5
scene.cycles.use_light_tree=True
scene.render.use_persistent_data=True
scene.render.resolution_x=args.width;scene.render.resolution_y=args.width//2;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=95
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.45
try:
 prefs=bpy.context.preferences.addons['cycles'].preferences
 prefs.compute_device_type='METAL';prefs.get_devices()
 gpu=False
 for dev in prefs.devices:
  dev.use=dev.type!='CPU';gpu=gpu or dev.use
 if gpu:scene.cycles.device='GPU'
except Exception:pass
print('Render device',scene.cycles.device,flush=True)

def node(nt,kind):return nt.nodes.new(kind)
def connect(nt,a,out,b,inp):nt.links.new(a.outputs[out],b.inputs[inp])
images={}
def image(path):
 path=str(path)
 if path not in images:images[path]=bpy.data.images.load(path,check_existing=True)
 return images[path]

materials={}
stone_path=root/'render-assets/cream-stone-base.png'
for key,m in data['materials'].items():
 mat=bpy.data.materials.new(m['name'] or key[:8]);mat.use_nodes=True
 nt=mat.node_tree;nt.nodes.clear();out=node(nt,'ShaderNodeOutputMaterial');bs=node(nt,'ShaderNodeBsdfPrincipled')
 bs.inputs['Base Color'].default_value=(*m['color'],1)
 bs.inputs['Roughness'].default_value=m['roughness'];bs.inputs['Metallic'].default_value=m['metalness']
 bs.inputs['Coat Weight'].default_value=m['clearcoat'];bs.inputs['Coat Roughness'].default_value=.2
 bs.inputs['Sheen Weight'].default_value=m['sheen'];bs.inputs['Sheen Roughness'].default_value=.75
 connect(nt,bs,'BSDF',out,'Surface')
 if m['glass']:
  bs.inputs['Base Color'].default_value=(.94,.98,.97,1)
  bs.inputs['Transmission Weight'].default_value=1;bs.inputs['Roughness'].default_value=.035
  bs.inputs['IOR'].default_value=1.46
  # Thin clear panes transmit direct daylight without biased opaque glass shadows.
  lp=node(nt,'ShaderNodeLightPath');tr=node(nt,'ShaderNodeBsdfTransparent');mix=node(nt,'ShaderNodeMixShader')
  connect(nt,lp,'Is Shadow Ray',mix,0);connect(nt,bs,'BSDF',mix,1);connect(nt,tr,0,mix,2);connect(nt,mix,0,out,'Surface')
 if m['emissiveIntensity'] and max(m['emissive'] or [0])>0:
  bs.inputs['Emission Color'].default_value=(*m['emissive'],1)
  bs.inputs['Emission Strength'].default_value=4*m['emissiveIntensity']
 tc=node(nt,'ShaderNodeTexCoord')
 noise=node(nt,'ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180 if m['sheen'] else 95
 noise.inputs['Detail'].default_value=3
 connect(nt,tc,'Object',noise,'Vector')
 bump=node(nt,'ShaderNodeBump');bump.inputs['Strength'].default_value=.19
 bump.inputs['Distance'].default_value=.0007 if m['sheen'] else .00015
 connect(nt,noise,'Fac',bump,'Height')
 if not m['glass']:connect(nt,bump,'Normal',bs,'Normal')
 if m['map']:
  mapping=node(nt,'ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(*m['map']['repeat'],1)
  connect(nt,tc,'UV',mapping,0)
  tex=node(nt,'ShaderNodeTexImage');tex.extension='REPEAT'
  # Large repeated UVs identify ceramic tile maps; the small 128px map is fabric.
  original=image(data_dir/m['map']['file']);tile=original.size[0]>128
  tex.image=image(stone_path) if tile else original
  connect(nt,mapping,'Vector',tex,'Vector')
  connect(nt,tex,'Color',bs,'Base Color')
  if tile:
   split=node(nt,'ShaderNodeSeparateXYZ');connect(nt,mapping,'Vector',split,'Vector')
   masks=[]
   for axis,limit in [('X',.002),('Y',.0035)]:
    fract=node(nt,'ShaderNodeMath');fract.operation='FRACT';connect(nt,split,axis,fract,0)
    edge=node(nt,'ShaderNodeMath');edge.operation='LESS_THAN';edge.inputs[1].default_value=limit;connect(nt,fract,0,edge,0);masks.append(edge)
   maximum=node(nt,'ShaderNodeMath');maximum.operation='MAXIMUM';connect(nt,masks[0],0,maximum,0);connect(nt,masks[1],0,maximum,1)
   mix=node(nt,'ShaderNodeMixRGB');mix.inputs[2].default_value=(.37,.34,.28,1)
   connect(nt,maximum,0,mix,0);connect(nt,tex,'Color',mix,1);connect(nt,mix,0,bs,'Base Color')
   relief=node(nt,'ShaderNodeBump');relief.invert=True;relief.inputs['Distance'].default_value=.001
   relief.inputs['Strength'].default_value=.6;connect(nt,maximum,0,relief,'Height');connect(nt,bump,'Normal',relief,'Normal');connect(nt,relief,'Normal',bs,'Normal')
   bs.inputs['Roughness'].default_value=.33
  elif m['sheen']:
   # Preserve each fabric's cream/taupe tint and add a fine woven normal.
   mix=node(nt,'ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.5;mix.inputs[2].default_value=(*m['color'],1)
   connect(nt,tex,'Color',mix,1);connect(nt,mix,0,bs,'Base Color')
 materials[key]=mat

convert=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
geometries={}
for key,g in data['geometries'].items():
 verts=[(g['position'][i],-g['position'][i+2],g['position'][i+1]) for i in range(0,len(g['position']),3)]
 ids=g['index'] or list(range(len(verts)));faces=[ids[i:i+3] for i in range(0,len(ids),3)]
 mesh=bpy.data.meshes.new(g['type']);mesh.from_pydata(verts,[],faces);mesh.update()
 if g['uv']:
  uv=mesh.uv_layers.new(name='UVMap')
  for loop in mesh.loops:uv.data[loop.index].uv=g['uv'][loop.vertex_index*2:loop.vertex_index*2+2]
 if g['type']!='BoxGeometry':
  for poly in mesh.polygons:poly.use_smooth=True
  if g['normal']:
   normals=[(g['normal'][i],-g['normal'][i+2],g['normal'][i+1]) for i in range(0,len(g['normal']),3)]
   mesh.normals_split_custom_set_from_vertices(normals)
 geometries[key]=mesh
for o in data['objects']:
 # Shared geometry gets per-object material overrides.
 mesh=geometries[o['geometry']]
 if not mesh.materials:mesh.materials.append(materials[o['material']])
 obj=bpy.data.objects.new(o['name'],mesh);scene.collection.objects.link(obj)
 obj.material_slots[0].link='OBJECT';obj.material_slots[0].material=materials[o['material']]
 a=o['matrix'];mat=Matrix([[a[c*4+r] for c in range(4)] for r in range(4)])
 obj.matrix_world=convert@mat@convert.inverted()

# Real sky illumination and the existing 20F city panorama share north orientation.
world=bpy.data.worlds.new('20F afternoon');scene.world=world;world.use_nodes=True
nt=world.node_tree;nt.nodes.clear();out=node(nt,'ShaderNodeOutputWorld')
env=node(nt,'ShaderNodeTexEnvironment');env.image=image(root/'public/city-panorama.png')
background=node(nt,'ShaderNodeBackground');background.inputs['Strength'].default_value=.65;connect(nt,env,'Color',background,'Color');connect(nt,background,0,out,'Surface')
sun_data=bpy.data.lights.new('Southwest afternoon','SUN');sun_data.energy=2.0;sun_data.angle=math.radians(7);sun_data.color=(1,.89,.73)
sun=bpy.data.objects.new('Southwest afternoon',sun_data);scene.collection.objects.link(sun)
sun.rotation_euler=Vector((22,28,-23)).to_track_quat('-Z','Y').to_euler()
def area(name,x,y,z,power,size,color=(1,.89,.74)):
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;light.color=color
 obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=(x,-z,y)
 return obj
for room in data['rooms']:
 if room.get('outdoor'):continue
 x,z,x2,z2=room['rect'];cx=(x+x2)/2;cz=(z+z2)/2
 power=85 if room['id'].startswith('bath') else 150 if room['id'] in ['living','master','suite'] else 105
 area(room['id']+' soft ceiling illumination',cx,2.77 if room['id']!='stairs' else 5.73,cz,power,min(1.6,(x2-x)*.55))
# Below-apartment facade gives the balcony actual height without adding a ground floor at y=0.
base_mat=bpy.data.materials.new('lower building warm concrete');base_mat.diffuse_color=(.5,.48,.43,1)
for x,z,x2,z2 in [[0,5,8.6,12.8],[0,12.8,4,17.8],[4,12.8,15.2,16.7]]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=((x+x2)/2,-(z+z2)/2,-28.65))
 obj=bpy.context.object;obj.name='57m lower facade';obj.scale=(x2-x,z2-z,56.75);obj.data.materials.append(base_mat)

camera_data=bpy.data.cameras.new('Full sphere');camera=bpy.data.objects.new('Full sphere',camera_data)
scene.collection.objects.link(camera);scene.camera=camera;camera_data.type='PANO';camera_data.panorama_type='EQUIRECTANGULAR'
camera.rotation_euler=(math.pi/2,0,0) # Center pixel looks north (+Y in Blender, -Z in Three).
camera_data.clip_start=.05;camera_data.clip_end=1500
selected=set(args.only.split(',')) if args.only else None
metadata=[]
for point in data['points']:
 if selected and point['id'] not in selected:continue
 target=output/(point['id']+('-draft' if args.draft else '')+'.jpg')
 if target.exists() and not args.draft:print('Already rendered',point['id'],flush=True);continue
 camera.location=(point['position'][0],-point['position'][1],1.65)
 scene.render.filepath=str(target);start=time.time();bpy.ops.render.render(write_still=True)
 print('PANORAMA_READY',point['id'],round(time.time()-start,1),'seconds',flush=True)
 metadata.append({'id':point['id'],'seconds':round(time.time()-start,1)})
if not args.draft:
 (output/'render-info.json').write_text(json.dumps({'engine':'Blender Cycles','width':args.width,'height':args.width//2,'maxSamples':args.samples,'denoising':True,'sourceHash':data['sourceHash'],'cameraHeight':1.65,'rendered':metadata},ensure_ascii=False,indent=2))
