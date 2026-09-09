# A6 现代简约全屋 3D 与全景漫游

基于房开 A6 户型图建立的三维装修场景。全屋浅灰瓷砖、中性白墙面和简洁吊顶，搭配按宜家实物尺寸重建的现代家具、家电及完整厨卫。

- 南次卧门洞位于东墙，朝向右侧公卫过道；北墙恢复实墙。
- 长阳台北端与挑空上空相邻的一侧为实墙。
- 配置客餐厅、四间卧室、玄关、两个休闲阳台、厨房、生活阳台及三个卫生间。
- 厨房包含水槽、灶具、油烟机、烤箱、洗碗机及冰箱；生活阳台配洗烘套装。
- 三个卫生间包含浴室柜、镜子、智能马桶和淋浴，主卫另配浴缸。
- 四间卧室按房开示意图重排：北次卧与南次卧床头靠西，北套房与主卧床头靠东；北次卧衣柜回到南墙，南次卧衣柜回到北墙，两间套房恢复 L 形衣帽区。主卫入口移至北侧衣帽间，东侧床头墙保持完整。
- 入户大门保持关闭，可通过房间列表跳转查看电梯厅；补充开放的电梯轿厢、门套、按钮及 20 层层显、双跑步梯和平台、公共走廊与三组设备井门。走廊东端封墙，电梯厅一侧的大门南边增设鞋柜。
- 步梯每跑 9 级，高差 1.5m，两跑连接相邻楼层；移动视点跟随实际踏步高度，楼梯扶手、门洞和柜体设有碰撞约束。公共区尺寸按图比例暂定，未更改房屋标注尺寸链。
- 20 层窗外 360° 城市全景：按下方 19 层 × 3m 暂估完成地面高程 57m，楼体在下方延伸；全景为生成的城市示意，不是实际小区照片。
- 西南午后日照、最高 4096px 日光阴影、当前房间暖色顶灯、环境反射及室内接触阴影。手机控制渲染分辨率，阴影只在场景改变时刷新。
- 瓷砖带细缝凹凸与柔和釉面反光，软包增加织物凹凸及绒面光泽。首屏直接进入客厅，可切换空间总览和俯视。

- 普通房间、长阳台及生活阳台层高 3m；西南挑空阳台 4×5m、层高 6m。
- 空间总览、俯视、房间跳转、WASD 行走、拖动环顾和点击地面前往。
- 原始户型图及尺寸依据可在页面内查看。
- 南次卧西北角至长阳台内侧、挑空阳台北面约 1.9m 缺口补设落地玻璃，保留西侧长阳台与挑空阳台的通道。
- 新增独立的全景漫游：18 个空间、24 个观察点，包含客餐厅、厨房、四间卧室、三卫、阳台、玄关和公共区。支持点位跳转、房间筛选、缩略图选择、环顾和缩放。
- 全景来自同一户型模型的 Cycles 离线光线追踪，3072×1536；按需加载高清图及 768×384 预览。全景模式会释放实时场景，降低手机内存占用。材质、渲染脚本和复现记录见 `render-assets/README.md`。
- 手机使用底部抽屉切换房间、查看户型和调整设置；48px 方向键支持一指行走、另一指拖动环顾。总览支持单指旋转、双指缩放和平移，俯视支持单指平移。横竖屏自动调整画面取景，并适配安全区域和动态视口。
- 沉浸模式隐藏导航，支持系统全屏的浏览器会同时进入全屏；手机采用较低的像素倍率、阴影分辨率和接触阴影采样，后台暂停渲染。

## 最新 Blender 模型

[下载现代简约 V3 模型](models/A6-modern-minimalist-v3.blend?raw=true) · [实物家具来源与多视角预览说明](models/README.md)。本版已关闭入户大门，使用宜家实物尺寸参考重建家具，贴图已打包。实时漫游加载该文件导出的网页模型，全景模式使用同一文件渲染的24个现代简约点位。网页为移动设备简化程序化材质，完整材质与光线追踪保留在全景图中。

## 本地运行

使用 Node.js 22.13 及以上版本：

```sh
npm ci
npm run dev
```

## 发布 GitHub Pages

```sh
npm run build
```

`docs/` 是可直接发布的静态网站，使用相对资源地址，支持 `https://用户名.github.io/仓库名/`。
仓库 Settings → Pages → Deploy from a branch → `main` → `/docs`。
`.nojekyll` 禁止 Jekyll 处理构建产物。更新后提交 `docs/` 一并推送即可重新发布。

## 尺寸边界

模型单位为米。横向尺寸链 15.2m，西侧纵向 17.8m，东侧 16.7m，均来自图中标注。
190.65㎡为建筑面积，不用于强制缩放室内净面积。未标注的门窗尺寸、墙厚和部分隔墙位置按图比例暂定；不属于精确施工模型。
`lib/plan.ts` 保存几何尺寸，`lib/scene.ts` 创建三维场景；`lib/furniture-layout.ts` 定义家具尺寸与位置，`lib/furnishings.ts` 创建具体模型。
`lib/atmosphere.ts` 保存楼层高程、下部立面、瓷砖材质及接触阴影处理。新增环境仅影响渲染，不改变房间、门窗、碰撞或层高数据。
`lib/core.ts` 创建电梯与步梯细节；公共区边界、门洞、碰撞和踏步高程由 `lib/plan.ts` 管理。

### 城市环境资产

`public/city-panorama.png` 使用内置 imagegen 生成，1774×887。提示词：

> Photorealistic full-sphere equirectangular 360 panorama, 2:1 aspect ratio, horizon at vertical center, from a twentieth-floor home approximately 57m above street. Ordinary contemporary Chinese city, midrise and highrise residential towers, office buildings, tree-lined streets, landscaped park, rooftops below, atmospheric haze. Pale blue sky and delicate clouds, soft warm-neutral southwest afternoon sunlight. Seamless left/right edges. No identifiable landmarks, interiors, balcony frames, text, logos or watermarks.

```sh
npm run check:geometry
npm run check:mobile
npm run check:panorama
node checks/blender-model.mjs
```

检查门位和实墙修正、四条尺寸链、所有房间层高、床头方向及柜体位置、家具和玻璃隔断碰撞、18 个漫游起点、室内与公共区的连通性、三个淋浴区的可达性，以及两跑步梯到上层平台的可达性。

手机检查验证不同屏幕比例下总览与俯视能完整显示房屋边界，以及多指环顾时指针的独立持有和取消行为。未替代 iOS / Android 真机测试。


## 从 Blender 更新漫游

`models/A6-modern-minimalist-v3.blend` 是当前装修版本来源。运行 Blender 后台脚本 `scripts/export-blender-web.py` 导出网页模型，运行 `scripts/render-blender-panoramas.py` 渲染24张全景，再运行 `node scripts/prepare-panoramas.mjs` 生成手机预览，最后构建网站。旧的 `scripts/render-panoramas.py` 是历史版本转换脚本。

### 加载优化（2026-09-09）

24 张全景以及城市背景、户型图使用用户提供的压缩文件，保持原始分辨率；手机预览同步重新生成。网页 GLB 从 30,942,724 字节压缩至 7,038,068 字节，保留 823,104 个三角面及四个显示分类。使用 Meshopt 压缩与 16 位位置量化，去除无纹理材质未使用的 UV；分类包围盒误差小于 5 mm。移除了隐藏旧模型的构建过程，切换回实时模式复用压缩模型数据。

重新导出 GLB 后，发布前运行 `node scripts/optimize-web-model.mjs public/models/a6-modern-v3.glb`，再构建网站。完整 Blender 模型未修改。

支持 DecompressionStream 的浏览器优先下载 3,178,780 字节的 gzip 文件并在本地解压；旧浏览器使用 7 MB GLB。GitHub Pages 无需额外响应头配置。
