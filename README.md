# A6 奶油风全屋 3D 漫游

基于房开 A6 户型图建立的三维装修场景。全屋浅米色瓷砖、奶油白墙面和简洁吊顶，搭配奶油风家具、家电及完整厨卫。

- 南次卧门洞位于东墙，朝向右侧公卫过道；北墙恢复实墙。
- 长阳台北端与挑空上空相邻的一侧为实墙。
- 配置客餐厅、四间卧室、玄关、两个休闲阳台、厨房、生活阳台及三个卫生间。
- 厨房包含水槽、灶具、油烟机、烤箱、洗碗机及冰箱；生活阳台配洗烘套装。
- 三个卫生间包含浴室柜、镜子、智能马桶和淋浴，主卫另配浴缸。
- 20 层窗外 360° 城市全景：按下方 19 层 × 3m 暂估完成地面高程 57m，楼体在下方延伸；全景为生成的城市示意，不是实际小区照片。
- 西南午后日照、最高 4096px 日光阴影、当前房间暖色顶灯、环境反射及室内接触阴影。手机控制渲染分辨率，阴影只在场景改变时刷新。
- 瓷砖带细缝凹凸与柔和釉面反光，软包增加织物凹凸及绒面光泽。首屏直接进入客厅，可切换空间总览和俯视。

- 普通房间、长阳台及生活阳台层高 3m；西南挑空阳台 4×5m、层高 6m。
- 空间总览、俯视、房间跳转、WASD 行走、拖动环顾和点击地面前往。
- 原始户型图及尺寸依据可在页面内查看。

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

### 城市环境资产

`public/city-panorama.png` 使用内置 imagegen 生成，1774×887。提示词：

> Photorealistic full-sphere equirectangular 360 panorama, 2:1 aspect ratio, horizon at vertical center, from a twentieth-floor home approximately 57m above street. Ordinary contemporary Chinese city, midrise and highrise residential towers, office buildings, tree-lined streets, landscaped park, rooftops below, atmospheric haze. Pale blue sky and delicate clouds, soft warm-neutral southwest afternoon sunlight. Seamless left/right edges. No identifiable landmarks, interiors, balcony frames, text, logos or watermarks.

```sh
npm run check:geometry
```

检查门位和实墙修正、四条尺寸链、所有房间层高、家具和玻璃隔断碰撞、漫游起点、房间连通性及三个淋浴区的可达性。
