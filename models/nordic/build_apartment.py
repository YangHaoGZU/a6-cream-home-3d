"""A6 measured-proxy apartment. Metres, plan x=east, y=south, z=up.
Run: Blender -b --factory-startup -t 6 -P build_apartment.py -- [view ids]
All cameras are inside the apartment/terrace; no wall removal for perspective views.
Plan spans are nominal, not survey-certified. See model_manifest.json.
"""
import bpy, math, json, sys, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
REF = ROOT / '参考渲染'
REF.mkdir(exist_ok=True)
random.seed(19)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.cycles.adaptive_threshold=.08
scene.cycles.max_bounces=6
scene.cycles.diffuse_bounces=4
scene.cycles.glossy_bounces=3
scene.cycles.transmission_bounces=4
scene.render.threads_mode='FIXED'
scene.render.threads=6
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.79,.85,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
CEIL=2.85
objects=[]
furniture=[]
ceilings=[]

def mat(name, rgb, rough=.65, metal=0, noise=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    if noise:
        n=m.node_tree.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value=90
        b=m.node_tree.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value=noise; b.inputs['Distance'].default_value=.018
        m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    return m
wall=mat('Warm white mineral paint',(.82,.795,.74),noise=.025)
wood=mat('Pale natural oak',(.58,.43,.275),noise=.06)
wood_light=mat('Pale oak cabinet doors',(.66,.53,.37),noise=.035)
white=mat('Warm white matte cabinetry',(.82,.805,.76),.42)
stone=mat('Light greige stone porcelain',(.64,.61,.54),noise=.05)
stone_light=mat('Warm ivory quartz worktop',(.84,.82,.76),.38,noise=.025)
fabric=mat('Oatmeal linen upholstery',(.66,.625,.55),noise=.22)
fabric_light=mat('Ivory linen',(.83,.80,.74),noise=.15)
fabric_gray=mat('Soft gray bedding',(.50,.54,.54),noise=.14)
sage=mat('Muted sage accent',(.36,.44,.36),noise=.12)
clay=mat('Muted terracotta accent',(.57,.34,.24),noise=.1)
dark=mat('Graphite metal',(.045,.05,.047),.34,.45)
screen=mat('TV dark screen',(.012,.018,.021),.19)
ceramic=mat('White ceramic',(.90,.91,.89),.2)
mirror=mat('Mirror',(.8,.85,.86),.04,1)
green=mat('Plant green',(.12,.24,.10),.85)
soil=mat('Soil',(.09,.065,.045))
glass=bpy.data.materials.new('Clear reference glazing');glass.use_nodes=True
n=glass.node_tree.nodes;n.clear();o=n.new('ShaderNodeOutputMaterial');t=n.new('ShaderNodeBsdfTransparent');g=n.new('ShaderNodeBsdfGlass');g.inputs['Color'].default_value=(.9,.96,.98,1);g.inputs['Roughness'].default_value=.03;g.inputs['IOR'].default_value=1.45
mix=n.new('ShaderNodeMixShader');mix.inputs[0].default_value=.07
glass.node_tree.links.new(t.outputs[0],mix.inputs[1]);glass.node_tree.links.new(g.outputs[0],mix.inputs[2]);glass.node_tree.links.new(mix.outputs[0],o.inputs['Surface'])

def pos(x,y,z): return (x,-y,z)
def box(name,x,y,z,w,d,h,m=wall,bevel=0,tag=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos(x+w/2,y+d/2,z+h/2))
    ob=bpy.context.object;ob.name=name;ob.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if m:ob.data.materials.append(m)
    if bevel:
        mod=ob.modifiers.new('Small realistic edge','BEVEL');mod.width=bevel;mod.segments=2
        ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    objects.append(ob)
    if tag:
        ob['category']=tag;furniture.append(dict(name=name,xy_m=[x,y],size_m=[w,d,h],z_m=z,category=tag))
    return ob
def cyl(name,x,y,z,r,h,m=wood,vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=pos(x,y,z+h/2))
    ob=bpy.context.object;ob.name=name;ob.data.materials.append(m);objects.append(ob);return ob
def ball(name,x,y,z,sx,sy,sz,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=pos(x,y,z))
    ob=bpy.context.object;ob.name=name;ob.scale=(sx,sy,sz);ob.data.materials.append(m);objects.append(ob);return ob
def wx(name,x1,x2,y,h=CEIL,z=0,m=wall,th=.12):return box(name,x1,y-th/2,z,x2-x1,th,h,m)
def wy(name,x,y1,y2,h=CEIL,z=0,m=wall,th=.12):return box(name,x-th/2,y1,z,th,y2-y1,h,m)
def door_x(name,x1,x2,y):
    wx(name+' lintel',x1,x2,y,CEIL-2.25,2.25)
    for x in [x1,x2]:box(name+' jamb',x-.022,y-.08,0,.044,.16,2.25,wood_light)
def door_y(name,x,y1,y2):
    wy(name+' lintel',x,y1,y2,CEIL-2.25,2.25)
    for y in [y1,y2]:box(name+' jamb',x-.08,y-.022,0,.16,.044,2.25,wood_light)
def glazing_x(name,x1,x2,y,z0=.06,z1=2.72,divisions=3):
    box(name+' glass',x1,y-.012,z0,x2-x1,.024,z1-z0,glass)
    for z in [z0,z1]:box(name+' horizontal frame',x1,y-.035,z,x2-x1,.07,.035,dark)
    for i in range(divisions+1):box(name+' mullion',x1+(x2-x1)*i/divisions-.018,y-.035,z0,.036,.07,z1-z0,dark)
def glazing_y(name,x,y1,y2,z0=.06,z1=2.72,divisions=4):
    box(name+' glass',x-.012,y1,z0,.024,y2-y1,z1-z0,glass)
    for z in [z0,z1]:box(name+' horizontal frame',x-.035,y1,z,.07,y2-y1,.035,dark)
    for i in range(divisions+1):box(name+' mullion',x-.035,y1+(y2-y1)*i/divisions-.018,z0,.07,.036,z1-z0,dark)
def floor_zone(name,x,y,w,d,kind='oak'):
    box(name+' floor',x,y,-.12,w,d,.12,stone if kind=='tile' else wood)
    if kind=='oak':
        # Separate long, low-poly planks; deterministic subtle tone variation.
        step=.20; cnt=int(w/step)
        for i in range(cnt):
            shift=(i%3)*.65
            ys=y
            while ys<y+d-.01:
                length=min((1.8-shift if ys==y else 1.8),y+d-ys)
                if length>.015:box(name+' plank',x+i*step+.003,ys+.003,0,step-.006,length-.006,.012,wood_light if i%5==0 else wood)
                ys+=length;shift=0
    else:
        for i in range(1,int(w/.6)+1):box(name+' grout',x+i*.6,y,.001,.004,d,.003,stone_light)
        for i in range(1,int(d/.6)+1):box(name+' grout',x,y+i*.6,.001,w,.004,.003,stone_light)
    ob=box(name+' ceiling',x,y,CEIL,w,d,.15,wall);ceilings.append(ob)
def area(name,x,y,z,energy,size,target=None,color=(1,.91,.78)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=pos(x,y,z)
    if target:ob.rotation_euler=(Vector(pos(*target))-ob.location).to_track_quat('-Z','Y').to_euler()
    return ob
def curtain_y(x,y1,y2):
    for ya in [y1,y2-.33]:
        for i in range(4):cyl('Linen curtain fold',x,ya+.09*i,.04,.075,2.67,fabric_light,10)
def curtain_x(x1,x2,y):
    for xa in [x1,x2-.3]:
        for i in range(4):cyl('Linen curtain fold',xa+.09*i,y,.04,.075,2.67,fabric_light,10)
def legs(x,y,w,d,h,material=wood):
    for xx in [x+.08,x+w-.08]:
        for yy in [y+.08,y+d-.08]:box('Furniture leg',xx-.025,yy-.025,0,.05,.05,h,material,.009)
def table(name,x,y,w,d,h=.75):
    box(name,x,y,h-.045,w,d,.045,wood_light,.025,'table');legs(x,y,w,d,h-.045)
def chair(name,x,y,w=.5,d=.5,face='north',material=fabric):
    box(name+' seat',x,y,.40,w,d,.09,material,.055);legs(x,y,w,d,.40)
    if face=='north':box(name+' back',x,y+d-.09,.44,w,.09,.40,material,.045)
    if face=='south':box(name+' back',x,y,.44,w,.09,.40,material,.045)
    if face=='east':box(name+' back',x,y,.44,.09,d,.40,material,.045)
    if face=='west':box(name+' back',x+w-.09,y,.44,.09,d,.40,material,.045)
def cabinet(name,x,y,w,d,h=2.45,front='south',m=white):
    box(name,x,y,.08,w,d,h-.08,wood_light,.008,'cabinet')
    count=max(1,round((w if front in ['south','north'] else d)/.55))
    for i in range(count):
        if front in ['south','north']:
            dw=w/count; yy=y+d-.018 if front=='south' else y-.005
            box(name+' door',x+i*dw+.006,yy,.10,dw-.012,.022,h-.12,m,.003)
        else:
            dd=d/count; xx=x+w-.018 if front=='east' else x-.005
            box(name+' door',xx,y+i*dd+.006,.10,.022,dd-.012,h-.12,m,.003)
def bookshelf():
    x,y,w,d=.35,5.10,2.6,.35
    furniture.append(dict(name='Bookcase overall',xy_m=[x,y],size_m=[w,d,2.35],z_m=.05,category='bookshelf'))
    box('Bookcase back',x,y,.05,w,.025,2.35,wood_light)
    for xx in [x,x+w-.035]:box('Bookcase side',xx,y,.05,.035,d,2.35,wood_light)
    for i in [1,2,3]:box('Bookcase divider',x+i*.65-.018,y,.78,.035,d,1.62,wood_light)
    # Front-facing darkened open niches with actual shelves, lower cupboards.
    for col in range(4):
        xx=x+.055+col*.635
        box('Open shelf back',xx,y+.026,.83,.59,.012,1.49,wood)
        for zz in [.82,1.30,1.80,2.34]:box('Oak shelf',xx,y+.06,zz,.59,.31,.035,wood_light)
        for row in range(3):
            z=.855+row*.49
            for j in range(3+(col+row)%3):
                hh=.20+.035*((j+row)%3)
                box('Book',xx+.055+j*.065,y+d-.15,z,.045,.11,hh,[fabric_light,sage,clay,fabric_gray][(j+col)%4],.004)
        box('Lower closed bookcase door',xx,y+d-.014,.10,.59,.025,.66,white,.004)
def bed(name,x,y,w,d,head,accent):
    box(name+' frame',x,y,.16,w,d,.23,wood_light,.035,'bedframe')
    box(name+' mattress',x+.05,y+.05,.39,w-.10,d-.10,.20,fabric_light,.065)
    if head=='east':
        box(name+' headboard',x+w-.08,y,.15,.09,d,1.0,fabric,.045)
        box(name+' duvet',x+.10,y+.06,.595,w-.65,d-.12,.065,fabric_light,.07)
        for py in [y+.18,y+d/2+.02]:box(name+' pillow',x+w-.59,py,.64,.38,d/2-.20,.11,fabric_light,.10)
        box(name+' throw',x+.25,y+.05,.67,.43,d-.1,.035,accent,.02)
    else:
        hy=y if head=='north' else y+d-.08
        box(name+' headboard',x,hy,.15,w,.09,1.0,fabric,.045)
        dy=y+.52 if head=='north' else y+.10
        box(name+' duvet',x+.05,dy,.595,w-.10,d-.62,.065,fabric_light,.07)
        py=y+.20 if head=='north' else y+d-.57
        for px in [x+.12,x+w/2+.02]:box(name+' pillow',px,py,.65,w/2-.16,.35,.10,fabric_light,.10)
        ty=y+d-.52 if head=='north' else y+.23
        box(name+' throw',x+.04,ty,.67,w-.08,.38,.035,accent,.02)
def vanity(name,x,y,w,d,front='west'):
    cabinet(name+' cabinet',x,y,w,d,.75,front,wood_light)
    box(name+' basin rim',x-.025,y-.015,.77,w+.05,d+.03,.08,ceramic,.025)
    box(name+' basin depression',x+.06,y+.10,.85,w-.12,d-.2,.009,stone_light,.05)
    if front=='west':
        box(name+' mirror',x+w-.025,y+.04,1.04,.022,d-.08,1.12,mirror)
        cyl(name+' tap',x+w-.1,y+d*.5,.85,.018,.21,dark)
    else:
        box(name+' mirror',x+.04,y+.01,1.04,w-.08,.022,1.12,mirror)
        cyl(name+' tap',x+w*.5,y+.1,.85,.018,.21,dark)
def toilet(name,x,y,face='south'):
    if face=='south':
        box(name+' cistern',x-.18,y-.24,.34,.36,.16,.40,ceramic,.05)
        ball(name+' pedestal',x,y+.03,.22,.19,.27,.22,ceramic);ball(name+' seat',x,y+.11,.43,.22,.30,.055,ceramic)
    elif face=='east':
        box(name+' cistern',x-.24,y-.18,.34,.16,.36,.40,ceramic,.05)
        ball(name+' pedestal',x+.03,y,.22,.27,.19,.22,ceramic);ball(name+' seat',x+.11,y,.43,.30,.22,.055,ceramic)
    else:
        box(name+' cistern',x+.17,y-.18,.34,.16,.36,.40,ceramic,.05)
        ball(name+' pedestal',x,y,.22,.27,.19,.22,ceramic);ball(name+' seat',x-.09,y,.43,.30,.22,.055,ceramic)
def plant(name,x,y,scale=1):
    cyl(name+' pot',x,y,0,.20*scale,.38*scale,stone,16);cyl(name+' soil',x,y,.36*scale,.17*scale,.02,soil)
    for k in range(5):
        a=k*2.4;xx=x+math.cos(a)*.18*scale;yy=y+math.sin(a)*.18*scale
        cyl(name+' stem',xx,yy,.36*scale,.012*scale,(.55+.10*k)*scale,wood,8)
        ob=ball(name+' leaf',xx,yy,(1.02+.08*k)*scale,.20*scale,.09*scale,.32*scale,green);ob.rotation_euler[1]=.3

# Floors and ceilings. Public zone shape follows the reconstructed plan.
for args in [('Public',0,5,8.8,7.8),('North passage',8.8,5,1.4,1.3),('North bedroom',7,1.4,3.2,3.6),('NE bedroom',10.2,1.4,3.3,3.2),('NE dressing',10.2,4.6,5,1.7),('SW bedroom',4,12.8,3.2,3.6),('South vestibule',7.2,12.8,1.8,1.1),('South hall return',8.8,11.3,.2,1.5),('Master dressing',9,11.3,6.2,1.8),('Master bedroom',9,13.1,4.1,3.3)]:floor_zone(*args)
for args in [('Kitchen',4,1.4,3,3.6),('Utility',4,0,3,1.4),('NE bath',13.5,2,1.7,2.6),('Common bath',7.2,13.9,1.8,2.5),('Master bath',13.1,13.1,2.1,2.7)]:floor_zone(*args,kind='tile')
# Core is opaque and outside the private residence.
box('Public circulation core',8.8,6.3,0,7.7,5,2.85,wall)
# Cut entry opening by constructing the small return region separately: core
# remains on east side; the door is represented on its WEST face as closed leaf.
box('Private entry door',8.72,9.2,.02,.035,.95,2.23,wood_light,.012)
cyl('Entry handle',8.67,9.98,1.05,.025,.12,dark)

# North side and bedroom partitions.
wx('Study north confirmed solid wall',0,4,5)
wy('Kitchen west',4,0,5);wy('Kitchen east',7,0,5)
wx('Kitchen utility left wall',4,5.42,1.4);wx('Kitchen utility right wall',6.23,7,1.4);door_x('Utility door',5.42,6.23,1.4)
wx('Kitchen south west return',4,4.6,5);wx('Kitchen south east return',6.4,7,5);door_x('Kitchen wide opening proposed 1.80m',4.6,6.4,5)
# Three folding door leaves stacked outside clear aisle, no swing into circulation.
for i in range(3):box('Kitchen parked folding glass door',4.16+.12*i,5.015,.07,.10,.06,2.12,glass)
wx('North bedroom south',7,9.25,5);wx('North bedroom door return',10.15,10.2,5);door_x('North bedroom door',9.25,10.15,5)
wy('NE bedroom west north',10.2,1.4,4.2);wy('NE bedroom west south',10.2,5.1,6.3);door_y('NE suite entrance',10.2,4.2,5.1)
wx('NE dressing south',10.2,15.2,6.3);wy('East upper exterior',15.2,2,6.3)
wy('NE bath west',13.5,2,4.6);wx('NE bath south left',13.5,14.2,4.6);wx('NE bath south right',14.95,15.2,4.6);door_x('NE bath door',14.2,14.95,4.6)
wx('NE bath north lower',13.5,15.2,2,.95);glazing_x('NE bath north high window',13.58,15.12,2,.95,2.65,2);wx('NE bath window lintel',13.5,15.2,2,.20,2.65)
for name,x1,x2 in [('North bed',7,10.2),('NE bed',10.2,13.5)]:
    glazing_x(name+' north window',x1+.06,x2-.06,1.4);wx(name+' header',x1,x2,1.4,.13,2.72);curtain_x(x1+.12,x2-.45,1.58)
glazing_x('Utility north window',4.08,6.92,0,.95,2.7,3);wx('Utility sill',4,7,0,.95);wx('Utility window head',4,7,0,.15,2.7)

# South private rooms and TV wall.
wx('TV south solid wall',4,7.2,12.8) # shared west wall is built once as the 6m terrace east wall below
wy('SW bedroom east small return',7.2,12.8,12.95);wy('SW bedroom east',7.2,13.8,16.4);door_y('SW bedroom east door',7.2,12.95,13.8)
box('SW bedroom open door leaf',6.36,12.99,.02,.78,.035,2.20,wood_light,.007)
wy('Master west upper return',9,11.3,11.4);wy('Master west wall',9,12.25,16.4);door_y('Master entrance',9,11.4,12.25)
wx('Master north boundary',9,15.2,11.3);wy('Master east boundary',15.2,11.3,16.4)
wx('Common bath north short',7.2,7.35,13.9);wx('Common bath north',8.1,9,13.9);door_x('Common bath entrance',7.35,8.1,13.9)
wx('Common bath south',7.2,9,16.4)
wy('Master closet partition',10.2,11.3,13.1);wx('Master closet left return',10.2,10.8,13.1);wx('Master closet right return',12.3,13.1,13.1)
wy('Master bath west',13.1,13.1,16.4);wx('Master bath north',13.95,15.2,13.1);door_x('Master bath north entrance',13.1,13.95,13.1)
for name,x1,x2 in [('SW bed',4,7.2),('Master bed',9,13.1)]:
    glazing_x(name+' south window',x1+.08,x2-.08,16.4);wx(name+' south header',x1,x2,16.4,.13,2.72);curtain_x(x1+.12,x2-.45,16.2)
wx('Master bath south sill',13.1,15.2,15.8,1.05);glazing_x('Master bath high window',13.2,15.1,15.8,1.05,2.65,2);wx('Master bath header',13.1,15.2,15.8,.2,2.65)

# West ordinary balcony merged with living; continuous 3m storey glazing.
glazing_y('West merged balcony glazing',0,5.15,12.65,.06,2.72,6)
wy('West glazing header',0,5,12.8,.13,2.72)
curtain_y(.18,5.35,8.6);curtain_y(.18,8.9,12.4)
for x,y in [(0,5),(0,12.65),(4,1.5),(7,1.5),(4,15.65),(15.2,15.8)]:box('Existing structural pier proxy',x-.13,y-.13,0,.26,.26,2.85,wall)

# 6m double-height terrace: open west and south, glass railing, upper slab at 5.85.
box('Terrace floor',0,12.8,-.12,4,5,.12,stone)
box('Terrace upper slab underside 5.85',0,12.8,5.85,4,5,.15,wall)
ceilings.append(bpy.context.object)
wy('Terrace east 6m wall',4,12.8,17.8,5.85)
wx('Terrace north upper wall',0,4,12.8,3.0,2.85)
glazing_x('Preserved living terrace glass',2.1,4,12.8,.04,2.72,2)
wx('Terrace glass header',2.1,4,12.8,.13,2.72)
# West 2.1m connection has an openable door, shown parked, leaving passage.
glazing_x('West terrace door parked',.10,.62,12.8,.04,2.72,1)
for x,y in [(0,12.8),(0,17.8),(4,17.8)]:box('Terrace 6m edge column',x-.10,y-.10,0,.20,.20,5.85,wall)
glazing_y('Terrace west guard',0,12.95,17.75,.05,1.10,4);glazing_x('Terrace south guard',.1,3.9,17.8,.05,1.10,3)
for i in range(1,7):box('Terrace stone joint',0,12.8+i*.7,.002,4,.004,.004,stone_light)

# Public furniture, exact plan footprints.
box('Living rug',3.95,9.65,.018,3.3,2.4,.018,fabric_light,.025)
box('Sofa footprint',4,9.15,.16,3.10,.96,.29,fabric,.08,'sofa')
box('Sofa north back',4,9.15,.36,3.10,.19,.48,fabric,.075)
for x in [4,6.93]:box('Sofa arm',x,9.27,.38,.17,.84,.24,fabric,.07)
for i in range(3):box('Sofa cushion',4.18+i*.92,9.37,.43,.88,.66,.14,fabric_light,.08)
for x,m in [(4.3,sage),(6.45,clay)]:box('Sofa accent pillow',x,9.39,.61,.40,.12,.36,m,.09)
table('Coffee table 1.1m',5,10.56,1.1,.62,.36)
box('TV low cabinet',4.4,12.35,.12,2.4,.35,.32,wood_light,.025,'tv_cabinet')
box('98 inch TV body 2.178x1.25',4.511,12.70,.77,2.178,.045,1.25,dark,.015,'television')
box('TV display',4.535,12.693,.793,2.13,.006,1.20,screen,.008)
# Tea-table west chair removed; keep the separate west-window lounge chair.
chair('West window lounge chair',.32,10.2,.76,.8,'east',fabric_light)
cyl('West side table',.61,11.46,.44,.24,.035,wood_light);cyl('West side table stem',.61,11.46,0,.05,.44,dark)
bookshelf();table('Study freestanding desk 1.8x.75',.6,6.5,1.8,.75)
chair('Study chair facing south',1.22,5.8,.56,.55,'south',fabric_gray)
box('Study computer monitor',1.16,6.88,.82,.7,.045,.39,dark,.014)
box('Monitor foot',1.42,6.85,.755,.19,.20,.025,dark,.009)
box('Keyboard',1.22,6.61,.755,.48,.14,.018,dark,.005)
table('Dining table six seats 1.8x.9',4.1,6.7,1.8,.9)
for x in [4.32,5.15]:chair('Dining north chair',x,6.15,.5,.43,'south');chair('Dining south chair',x,7.73,.5,.43,'north')
chair('Dining west chair',3.5,6.9,.45,.48,'east');chair('Dining east chair',6.05,6.9,.45,.48,'west')
cyl('Dining ceramic vase',5,7.14,.76,.07,.19,ceramic)
cyl('Dining pendant shade',5,7.15,2.02,.28,.16,white,24);cyl('Pendant cable',5,7.15,2.18,.008,.66,dark,8)
area('Dining pendant illumination',5,7.15,2.0,60,.45)
cabinet('Entry shallow cabinet',8.43,7.85,.32,1.2,2.42,'west',white)
box('Entry mirror',8.775,8.08,1.05,.02,.67,1.17,mirror)
plant('Living olive',.6,11.95,.7)

# Four bedroom beds and built-ins.
bed('Master 1.8m mattress',10.85,13.75,2.10,1.90,'east',sage)
cabinet('Master north wardrobe',10.30,11.50,4.65,.60,2.55,'south',white)
cabinet('Master closet return',10.3,12.1,.60,.55,2.55,'east',wood_light)
table('Master dressing table',14,12.35,.95,.45,.74)
box('Master dressing mirror',15.105,12.35,1.02,.018,.45,1.0,mirror)
bed('NE 1.8m mattress',11.3,2.15,2.10,1.90,'east',fabric_gray)
cabinet('NE south wardrobe',11.1,5.55,3.70,.58,2.55,'north',wood_light)
bed('SW 1.5m mattress',4.2,13.1,1.60,2.10,'north',clay)
cabinet('SW east wardrobe',6.48,14.15,.55,1.50,2.5,'west',white)
bed('North 1.5m mattress',7.18,2.73,1.60,2.10,'south',sage)
cabinet('North east wardrobe',9.45,2.8,.55,1.30,2.5,'west',white)
table('North bedroom desk',8.7,1.65,1.1,.48,.74);chair('North bedroom desk chair',8.98,2.2,.45,.46,'north')
for name,x,y in [('Master',12.4,13.26),('NE',12.85,4.15),('SW',5.92,13.13)]:
    box(name+' bedside shelf',x,y,.45,.35,.32,.11,wood_light,.014)
    cyl(name+' table lamp shade',x+.18,y+.16,.69,.09,.17,fabric_light);cyl(name+' lamp stem',x+.18,y+.16,.56,.018,.13,dark)

# Kitchen cabinetry, retained two-sided galley. Door axis x=5.5 aligns aisle.
cabinet('Kitchen west base',4.15,1.65,.6,3.15,.85,'east',wood_light)
cabinet('Kitchen east base',6.25,1.65,.6,3.15,.85,'west',white)
box('Kitchen west quartz',4.13,1.63,.85,.64,3.19,.03,stone_light)
box('Kitchen east quartz',6.23,1.63,.85,.64,3.19,.03,stone_light)
# Upper units explicitly elevated instead of floor-tall proxy.
for y in [1.75,2.40,3.05,3.70]:
    box('Kitchen west overhead',4.10,y,1.58,.34,.62,.74,white,.01)
    box('Kitchen east overhead',6.57,y,1.58,.34,.62,.74,white,.01)
box('Sink steel rim',4.24,2.15,.89,.43,.70,.025,dark,.025)
box('Sink basin bottom',4.29,2.20,.90,.31,.59,.006,stone,.035)
cyl('Sink mixer',4.24,2.98,.90,.024,.30,dark)
box('Induction hob',6.29,2.25,.89,.48,.72,.019,dark,.015)
for y in [2.43,2.77]:cyl('Hob ring',6.52,y,.912,.12,.006,screen,24)
box('Extractor integrated',6.40,2.2,1.55,.50,.85,.15,white,.012)
box('Fridge integrated tall',6.24,3.96,0,.61,.82,2.45,white,.015,'appliance')
box('Fridge door split',6.228,3.98,1.10,.01,.77,.01,dark)

# Utility washing tower and shallow utility cabinet; north daylight kept.
for z in [.07,.94]:
    box('Laundry machine',4.20,.20,z,.62,.66,.84,white,.025,'appliance')
    # Circle in vertical front plane (facing south).
    ob=cyl('Laundry circular door',4.51,.88,z+.43,.22,.035,dark,24);ob.rotation_euler[0]=math.pi/2
cabinet('Laundry storage',6.25,.15,.60,1.05,2.45,'west',white)
box('Utility small counter',4.98,.18,.85,.67,.52,.035,stone_light)

# Wet rooms: porcelain, glass screens, cabinets.
vanity('Common external wash',8.45,12.90,.43,.90,'west')
toilet('Common toilet',8.42,14.55,'west')
glazing_x('Common shower screen',7.3,8.9,15.42,.04,2.25,2)
box('Common shower tray',7.30,15.45,.025,1.6,.83,.025,stone_light)
cyl('Common shower rail',8.72,16.15,.85,.014,1.28,dark);box('Common shower head',8.54,16.02,2.08,.22,.22,.03,dark)
vanity('NE bath vanity',14.65,3.74,.40,.67,'west');toilet('NE toilet',13.82,3.48,'east')
glazing_x('NE shower screen',13.60,15.10,2.96,.04,2.25,2)
box('NE shower tray',13.62,2.12,.025,1.46,.82,.025,stone_light)
cyl('NE shower rail',14.98,2.30,.82,.014,1.30,dark)
vanity('Master vanity',14.66,13.30,.40,.95,'west');toilet('Master toilet',13.42,14.18,'east')
# Bath aligned east-west along south side, high window above.
box('Master bath tub exterior',13.30,14.98,.05,1.65,.72,.55,ceramic,.10,'bathtub')
box('Master bath tub dark recess',13.40,15.07,.58,1.45,.52,.009,stone_light,.13)
cyl('Bath filler',14.98,15.09,.60,.022,.35,dark)

# Terrace seating, deliberately no new mezzanine or glazing enclosure.
box('Terrace sofa seat',2.9,14.4,.28,.8,1.7,.18,fabric_light,.06,'terrace_sofa')
box('Terrace sofa east back',3.57,14.4,.37,.13,1.7,.42,wood,.04)
chair('Terrace north chair',.68,14.17,.67,.72,'south',fabric)
chair('Terrace south chair',.85,16.18,.67,.72,'north',fabric)
cyl('Terrace round table',2,15.2,.40,.34,.04,wood_light);cyl('Terrace table leg',2,15.2,0,.065,.40,dark)
plant('Terrace south west plant',.48,17.2,.8);plant('Terrace south east plant',3.45,17.12,1.05)

# Soft daylight: exterior area sources + modest actual ceiling fixtures.
area('West daylight',-3,8.7,4,1500,7,(4,8.7,1.3),(0.87,.93,1))
area('South daylight',9,20,4.5,1500,8,(9,13,1.2),(1,.94,.85))
area('North diffuse sky',10,-3,4,1600,8,(10,5,1.2),(.87,.93,1))
for name,x,y,en,sz in [('Living',5.3,10.7,150,2),('Study',1.8,6.5,110,1.4),('Kitchen',5.5,3.2,100,1.1),('Utility',5.5,.65,65,.7),('Master bed',11,14.6,110,1.1),('Master dressing',12.3,12.5,80,1.4),('NE bed',11.8,3.2,85,1),('NE dressing',12.3,5.0,65,.8),('North bed',8.5,3.3,70,1),('SW bed',5.6,14.5,75,1),('Master bath',14,14.7,85,.8),('NE bath',14.3,3.7,70,.7),('Common bath',8.1,14.9,70,.7),('Wash',8,13.3,45,.5),('Entry',7.9,9.0,50,.6)]:
    area(name+' ceiling soft light',x,y,2.72,en,sz)
    cyl(name+' ceiling fixture',x,y,2.80,.12,.035,white)

# Camera positions are metre-based and never outside a closed room.
VIEWS=[
 ('01_living','客厅与南墙电视',(7.8,8.65,1.60),(4.8,12.0,1.48),24,1280,853),
 ('02_dining','餐厅与宽厨房入口',(6.5,8.72,1.58),(4.1,5.55,1.45),25,1280,853),
 ('03_study','开放书房',(3.45,8.50,1.58),(1.50,5.30,1.42),28,1280,853),
 ('04_west_lounge','西侧阳台休闲区',(2.62,8.50,1.58),(.60,11.7,1.38),27,1280,853),
 ('05_terrace','6米挑空庭院',(.30,13.15,1.55),(2.45,15.7,2.1),18,1024,1280),
 ('06_entry','玄关及卧室通道',(6.38,10.25,1.60),(8.7,8.70,1.48),25,1280,853),
 ('07_kitchen','厨房',(5.50,5.66,1.58),(5.50,1.5,1.47),23,1280,853),
 ('08_utility','生活阳台洗烘区',(5.40,1.23,1.55),(4.6,.65,1.0),18,1024,1024),
 ('09_master_bed','东南主卧',(9.38,13.5,1.58),(12.35,14.76,1.2),24,1280,853),
 ('10_master_dressing','主卧衣帽区',(11.02,13.05,1.56),(13.48,11.65,1.40),22,1280,853),
 ('11_ne_suite','东北套房床区',(10.55,4.75,1.57),(12.5,2.70,1.2),23,1280,853),
 ('12_ne_dressing','东北套房衣帽区',(10.65,4.92,1.58),(13.5,5.55,1.40),22,1280,853),
 ('13_south_bed','南侧次卧',(6.08,16.04,1.55),(5.8,13.6,1.3),22,1280,853),
 ('14_north_bed','北侧次卧',(7.45,1.92,1.55),(8.60,3.85,1.25),20,1280,853),
 ('15_master_bath','主卫生间',(13.57,13.36,1.56),(14.25,15.55,1.10),20,1024,1280),
 ('16_ne_bath','东北套卫',(14.53,4.36,1.55),(14.28,2.25,1.12),20,1024,1280),
 ('17_common_bath','公共卫生间',(7.62,14.15,1.55),(8.25,15.65,1.1),20,1024,1280),
 ('18_common_wash','公共洗手区与南次卧入口',(7.65,11.95,1.57),(8.20,13.36,1.23),23,1024,1280),
]
cameras={}
for key,title,loc,target,lens,rw,rh in VIEWS:
    camd=bpy.data.cameras.new(key);ob=bpy.data.objects.new(key,camd);scene.collection.objects.link(ob)
    ob.location=pos(*loc);ob.rotation_euler=(Vector(pos(*target))-ob.location).to_track_quat('-Z','Y').to_euler()
    camd.lens=lens;camd.sensor_width=36;camd.clip_start=.035;camd.clip_end=200
    ob['view_title']=title;cameras[key]=ob

# Audit actual model footprints against expected room envelopes and furniture.
checks=[]
for name,x,y,w,d,rx,ry,rw,rd in [
 ('Master bed',10.85,13.75,2.1,1.9,9,13.1,4.1,3.3),
 ('NE bed',11.3,2.15,2.1,1.9,10.2,1.4,3.3,3.2),
 ('SW bed',4.2,13.1,1.6,2.1,4,12.8,3.2,3.6),
 ('North bed',7.18,2.73,1.6,2.1,7,1.4,3.2,3.6)]:
    inside=x>=rx+.06 and y>=ry+.06 and x+w<=rx+rw-.06 and y+d<=ry+rd-.06
    checks.append(dict(check=name+' contained in room inside 60mm wall allowance',pass_=inside))
    assert inside,name
checks.extend([
 dict(check='Kitchen cabinet aisle proxy',metres=6.25-4.75),
 dict(check='Kitchen proposed opening',metres=6.4-4.6),
 dict(check='Bookcase front to desk rear',metres=6.5-5.45),
 dict(check='Desk east to dining west chair',metres=3.5-2.4),
 dict(check='Kitchen opening to dining north chair',metres=6.15-5),
 dict(check='Dining south chair to sofa back',metres=9.15-8.16),
])
manifest=dict(units='metres',axes='x east; y plan south stored as Blender -Y; z up',source='A6 marketing plan and user confirmations, NOT site survey',
 assumptions=['Plan chains used as nominal control lines; 120mm partition proxy is not verified construction.','3m storey represented with ceiling underside 2.85m; 6m terrace underside 5.85m, assuming 150mm slab.','All glazing heights, fixtures, wall thicknesses and exact door heights are assumptions.','Kitchen 1.8m opening is proposed, structure and actual net opening unverified.','Master bath uses 2.1x2.7m nominal block; unconfirmed south bathroom window strip is excluded from usable floor.','Outside view is generic sky, not a verified Guiyang building view.','No structural removal is certified by this model.'],
 user_confirmed=['Four bedrooms','Four bedroom 0.6m strips are flush usable floor','Study north boundary is solid wall','SW bedroom east-side entry','South TV wall','West balcony joins living','Terrace glass retained; west access retained','SW terrace 6m high; other areas 3m storey'],
 furniture=furniture,checks=checks,cameras=[dict(id=k,title=t,position_plan_xyz_m=l,target_plan_xyz_m=tar,lens_mm=ln,resolution=[rw,rh]) for k,t,l,tar,ln,rw,rh in VIEWS])

# Revision 02: water-tank backs align with west wall finishes.
manifest.update({'revision': '02 - two toilets backed against west walls; tea-table west chair removed; window chair retained', 'fixtures': [{'name': 'Master toilet', 'reference_xy_m': [13.42, 14.18], 'facing': 'east', 'backing_wall': 'west', 'wall_face_x_m': 13.16, 'rear_gap_m': 0.02, 'footprint_m': [0.65, 0.44]}, {'name': 'NE toilet', 'reference_xy_m': [13.82, 3.48], 'facing': 'east', 'backing_wall': 'west', 'wall_face_x_m': 13.56, 'rear_gap_m': 0.02, 'footprint_m': [0.65, 0.44]}]})
manifest['user_confirmed'] += ['Master and NE toilets backed against a wall', 'Remove living tea-table west chair; retain west-window chair']
manifest['checks'] += [{'check': 'Master toilet rear to west wall finish', 'metres': 0.02, 'pass_': True}, {'check': 'NE toilet rear to west wall finish', 'metres': 0.02, 'pass_': True}, {'check': 'Tea-table west chair removed including four legs', 'pass_': True}, {'check': 'West-window chair retained', 'pass_': True}]
ROOT.joinpath('model_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
scene.camera=cameras['01_living']
scene.render.resolution_x=1280;scene.render.resolution_y=853
# Convenient opening viewport, all cameras saved in the single source model.
for a in bpy.context.screen.areas:
    if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'A6_modern_nordic.blend'))
print('MODEL_READY',len(objects),'objects',sum(len(o.data.polygons) for o in objects if o.type=='MESH'),'base faces',flush=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
keys=set(args) if args else {v[0] for v in VIEWS}
if 'model-only' in keys:sys.exit(0)
for key,title,loc,target,lens,rw,rh in VIEWS:
    if key not in keys:continue
    scene.camera=cameras[key];scene.render.resolution_x=rw;scene.render.resolution_y=rh
    scene.render.filepath=str(REF/(key+'.png'))
    print('RENDER_START',key,title,flush=True)
    bpy.ops.render.render(write_still=True)
    print('RENDER_DONE',key,flush=True)
