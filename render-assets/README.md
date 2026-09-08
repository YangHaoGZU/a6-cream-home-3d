# 全景材质与渲染记录

`cream-stone-base.png`：使用内置 image_gen 工具生成的单张浅米石纹瓷砖 albedo，1254×1254。完整最终提示词保存在 `cream-stone-base.prompt.txt`。这张图只提供表面细节；房间、家具、门窗和所有相机点位均来自当前项目的实际几何数据。

全景为 Blender Cycles 离线渲染的 360°×180°等距柱状图，3072×1536，32 个最大采样、间接光、多次反射、透明玻璃和去噪，视点离地 1.65m。普通空间 3m，挑空阳台 6m。图片不代表实拍，窗外沿用 20 层城市示意全景。

复现步骤：

1. 在项目外独立目录安装 `@napi-rs/canvas`，准备 Blender 4.5 LTS。
2. `node scripts/export-render-scene.mjs /绝对路径/材质运行目录/package.json`。导出器执行 `lib/scene.ts` 中相同的建筑构造代码，并复用家具和公共区模型，保存到项目旁的 `render-data/`。
3. `blender -b --factory-startup -t 26 --python scripts/render-panoramas.py -- --width 3072 --samples 32`。
4. `node scripts/prepare-panoramas.mjs`，生成 768×384 预览和资源清单。
5. `npm run check:panorama`；再执行构建与 GitHub Pages 发布。

`public/panoramas/render-info.json` 保存实际参数与输入指纹，`manifest.json` 保存图片尺寸和体积。脚本会跳过已有正式图片；模型修改后应移走旧图再重新渲染，避免沿用旧点位图片。无浏览器截图，也未使用生成式模型重画房间布局。
