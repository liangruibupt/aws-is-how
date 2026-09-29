# Claude Opus 5.5 Showcase —— HTML 动画与视频制作

验证 Claude Opus 5.5 在网页动画、视频制作等方向的能力。每个案例都是一个独立子目录，内含完整代码、素材和说明。

## 案例

| # | 案例 | 类型 | 要点 |
|---|---|---|---|
| 01 | [临《兰亭集序》](01-lantingxu/) | 网页动画（Canvas 2D） | 从神龙本扫描中逐字切分、推出笔路，一管毛笔逐笔临写全篇 324 字，写毕落款、钤印、展卷。含「崇山」旁添、涂改墨团、廿之对照 |
| 02 | [大力神 · 挖地虎合体](02-devastator/) | 实时 3D 动画（Three.js） | 铲土机、搅拌机、拖斗、吊钩、清扫机、推土机依次变形、对接，合成手持紫色步枪的 G1 大力神。模型、PBR 金属材质、纹理、音效和原创进行曲配乐全部由代码程序生成，带分镜运镜、GTAO 与泛光 |
| 03 | [闻境 · 香水产品视频工厂](03-perfume/) | 商品视频工厂（Three.js + Node 批量出片） | 虚构品牌「闻境」的 15 秒香水广告：程序建模的八角玻璃瓶，玻璃与液体分层折射、带焦散，四款香型各有自己的场景和合成配乐，配 Kokoro 配音。同一个模板按比例、香型、语言、长度、活动和配音批量出 MP4、封面和画廊。共用的 [factory 引擎](factory/) 和 `new-film` 技能供后续案例接入 |

## 运行

各案例均为纯静态页面（ES Module 不能用 `file://` 打开），在本目录下起一个 HTTP 服务即可：

```bash
npm run serve            # 或 python3 -m http.server 8765
# 打开 http://127.0.0.1:8765/01-lantingxu/
#     http://127.0.0.1:8765/02-devastator/
#     http://127.0.0.1:8765/03-perfume/
```

从 03 起，批量出片、测试和审片工具都在 [factory/](factory/README.md) 里，要先 `npm install`（另需 Node 22 和 ffmpeg）。出片用 `node factory/render.mjs 03-perfume`，出完打开 `http://127.0.0.1:8765/factory/gallery.html?film=03-perfume` 看画廊。要从一段故事梗概起一部新片，在本目录运行 Claude Code，让它按 `new-film` 技能（`.claude/skills/new-film/`）来做。

## 视频工厂：原理与技术

本节以 03 为例回答三个问题：factory 负责什么，用了哪些技术，Opus 5.5 是怎样做出视频的。命令和字段的细节见 [factory/README.md](factory/README.md)。

### factory 负责什么

factory 是 03 起各案例共用的商品视频引擎。一部成片只提供自己的数据和镜头函数：变体轴、剪辑表、每种比例的构图、字体、场景、镜头、配乐音符表和配音台词。从「某个变体的第 t 秒」到「一条能上架的 MP4」，中间的事都由 factory 来做：

| 环节 | 做什么 | 代码 |
|---|---|---|
| 变体 | 轴和取值（香型 × 比例 × 语言 × 长度 × 活动 × 配音）→ 网址与清单解析、网格展开、文件名 | `engine/variant.js` |
| 剪辑 | 剪辑表 → 任意时刻 t 落在哪个镜头、镜头本地时间、叠化 / 闪白转场 | `engine/timeline.js` |
| 取景 | 镜头只说拍谁、占画面多高、放在哪。引擎按画面比例反解相机距离，再平移画面，所以三种比例的透视一致 | `engine/framing.js` |
| 字幕 | 中文按字折行并避头尾，英文按词折行。放不下时自动缩字，缩到最小字号还放不下，这条就出片失败 | `engine/text.js` |
| 后期 | MSAA → 景深 → 泛光 → AgX 色调映射 + 调色 + 暗角 + 颗粒 + 闪白 / 叠化 | `engine/post.js` |
| 声音 | 合成音色、整段离线混音、配音时压低配乐；出片时响度统一到 −14 LUFS | `engine/audio.js` · `lib/ffmpeg.mjs` |
| 预览与审片 | 播放器（变体下拉框、按镜头分段的时间轴）、安全区叠加、联系表、截帧、出片前自检 | `engine/player.js` · `engine/sheet.js` · `check.mjs` · `sheet.mjs` · `snap.mjs` |
| 配音 | 按台词表调 Kokoro 逐句生成，裁掉首尾静音、统一响度，放不下就提速重念 | `vo.mjs` |
| 批量出片 | 按清单开无头浏览器逐帧出图 → 编码 → 校验 → 封面和说明文件。能断点续做，输入变了才重出 | `render.mjs` · `lib/jobs.mjs` |
| 画廊 | 按香型分组浏览全部成片，按轴筛选，点开带声音播放 | `gallery.html` |

核心约定是**每一帧只由（变体, t）决定**。镜头里凡是「随机」的都取自带种子的随机数，粒子的位置是时间的闭式函数，没有逐帧模拟。所以预览页拖到的那一秒、联系表里的那一格、批量出片的那一帧，画出来完全相同。这样画面可以任意跳转，多个 worker 可以并行出片，中断后也能接着出。`check.mjs` 会把关键帧顺着画一遍、倒着画一遍，逐字节比对，以此验证这一点。

### 核心技术与分工

| 技术 | 运行在 | 负责什么 |
|---|---|---|
| **WebGL 2** | 浏览器 · GPU | 底层图形接口。全部 3D 画面和后期都在 GPU 上逐帧渲染，出片时也一样，拿到软件渲染会直接报错 |
| **Three.js 0.170** | 浏览器 | 在 WebGL 之上搭场景：<br>- 程序建模：旋转体、挤出体，以及用实例化网格成批画的叶子、花、盐晶、喷雾颗粒；<br>- PBR 材质：`MeshPhysicalMaterial`、`MeshStandardMaterial`；<br>- PMREM 反射环境、渲染目标和相机；<br>- 泛光：用它的 `UnrealBloomPass` |
| **GLSL 着色器** | 浏览器 · GPU | Three.js 自带材质做不到的部分用自写着色器完成，写成 `ShaderMaterial`，或者用 `onBeforeCompile` 改写内置材质：<br>- 玻璃与液体的分层折射：比尔–朗伯吸收、菲涅耳、三色色散；<br>- 地面焦散；<br>- 景深、AgX 色调映射、调色和颗粒 |
| **Canvas 2D** | 浏览器 | 字幕和片尾卡：实测字宽、折行、绘制。WebGL 画面拷过来叠上字幕，合成后的整帧用 `toDataURL` 取成 PNG（成片帧）或 JPEG（封面） |
| **Web Audio API** | 浏览器 | 用 `OfflineAudioContext` 离线合成整段 48 kHz 立体声：<br>- 音色：拨弦（Karplus–Strong）、铺底、长笛、钟、水滴、滤波噪声、咔哒，外加混响；<br>- 配音按台词表排进混音，每句下面把配乐压低 9 dB。<br>预览里听到的和写进成片的是同一块缓冲 |
| **原生 ES Module + importmap** | 浏览器 | 纯静态页面，没有构建步骤。Three.js 和字体经 jsDelivr 加载 |
| **Node.js 22** | 本机 | 命令行工具：静态服务、选任务、并发池、断点续做的记账，调用 ffmpeg 和 Kokoro；`node:test` 跑单元测试 |
| **Playwright + 无头 Chromium** | 本机 · GPU | 出片和审片时打开成片页面。Chromium 经 ANGLE 走 Metal，也就是 Mac 的 GPU。视口设成成片尺寸，按 t = i / fps 逐帧调页面里的 `draw(t)` 取 PNG |
| **ffmpeg / ffprobe** | 本机 | PNG 帧经管道编成 H.264 MP4（libx264，CRF 18）；WAV 编成 192 kbps 的 AAC，响度 −14 LUFS、真峰值 ≤ −1 dBTP。ffprobe 核对时长、尺寸、帧数和音轨 |
| **Kokoro-82M** | AWS Lambda | 文本转语音，生成中英文配音 mp3（03 用 `zm_yunxi` 和 `bf_emma`）。生成后随仓库提交，出片时不再调用 |

### Opus 5.5 生成视频的原理

**Opus 5.5 不直接生成像素，它写出一个能画出视频的程序。** 整个过程没有用任何图像或视频生成模型，也没有图片、3D 模型之类的外部素材：瓶子、玻璃、液体、四个场景、字幕和配乐都是 Opus 5.5 写的代码在运行时算出来的。唯一由 AI 模型合成的是配音，由 Kokoro 念出。

```
故事梗概 ─▶ 分镜（镜头表、剪辑表、字幕、配音台词）─▶ 用户确认
         ─▶ 成片代码：数据 + 镜头函数（Opus 5.5 编写）
         ─▶ factory 引擎在浏览器 GPU 上画出（变体, t）这一帧
         ─▶ 联系表 / 截帧 ─▶ Opus 5.5 看图审片、改代码（反复）
         ─▶ render.mjs：无头 Chromium 逐帧 PNG ─▶ ffmpeg ─▶ MP4 + 封面 ─▶ 画廊
```

1. **分镜**：Opus 5.5 把故事梗概写成镜头表（每个镜头的画面、时长、中英文字幕、命中点、声音）、每种长度的剪辑表和配音台词，先交给用户确认。
2. **写代码**：Opus 5.5 写出这部片子的全部代码，包括：
   - 程序建模的瓶子和场景；
   - 玻璃与液体的着色器；
   - 每个镜头的相机和运动；
   - 字幕图层；
   - 配乐的音符表。
3. **渲染**：引擎把（变体, t）交给镜头函数。Three.js 在 GPU 上画出 3D 画面，经过后期，再叠上 Canvas 2D 字幕，合成一帧。
4. **审片**：Opus 5.5 用 `sheet.mjs`、`snap.mjs` 截出关键帧，自己打开 PNG 检查构图、字幕、安全区和溢出，有问题就改代码重画。`check.mjs` 再验证确定性、配音、混音和速度。
5. **出片**：`render.mjs` 按清单给每个变体开一个页面，按固定帧间隔逐帧画、取 PNG，经管道交给 ffmpeg 编码。声音整段离线混好，编成 AAC 一起封装。每条成片都要通过时长、帧数和响度的校验。

所以换香型、比例或语言，不需要重新生成：同一套代码换一组参数再跑一遍，就是另一条片子。一条命令能批量出片、每次出片结果完全一致，都是因为这一点。

外部依赖：

| 依赖 | 版本 | 用途 | 什么时候需要 |
|---|---|---|---|
| Three.js | 0.170.0 | 3D 渲染 | 预览和出片。浏览器经 jsDelivr 加载，npm 包只给 Node 测试用 |
| 字体（@fontsource） | 5 | 思源宋体 500 / 600、思源黑体 700、Cormorant Garamond 500 / 600 | 预览和出片，经 jsDelivr 加载。没加载上时页面直接报错 |
| Playwright + Chromium | 1.57.0 | 驱动无头浏览器 | 出片、截帧、联系表、自检（`npm install`，再 `npx playwright install chromium`） |
| ffmpeg / ffprobe | 系统安装 | 编码、响度、校验 | 出片、生成配音 |
| Node.js | 22 | 命令行工具和测试 | 除了在浏览器里预览，其余都要 |
| GPU | 03 在 Apple M1 Pro（Metal）上出片 | WebGL 渲染 | 预览和出片，软件渲染会被拒绝 |
| Kokoro-82M（AWS Lambda `kokoro-tts:live`，us-east-1） | — | 生成配音，经 S3 取回 mp3 | 只在重新生成配音时（`vo.mjs`）需要，要 AWS CLI 和凭证 |

## 参考

- [claude-opus-5.5-game-demo](https://github.com/liangruibupt/claude-opus-5.5-game-demo)：Claude Opus 5.5 生成的 3D 网页游戏示例（fork）
