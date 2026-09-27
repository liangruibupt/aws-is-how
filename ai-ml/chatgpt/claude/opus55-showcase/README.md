# Claude Opus 5.5 Showcase —— HTML 动画与视频制作

验证 Claude Opus 5.5 在网页动画、视频制作等方向的能力。每个案例都是一个独立子目录，内含完整代码、素材和说明。

## 案例

| # | 案例 | 类型 | 要点 |
|---|---|---|---|
| 01 | [临《兰亭集序》](01-lantingxu/) | 网页动画（Canvas 2D） | 从神龙本扫描中逐字切分、推出笔路，一管毛笔逐笔临写全篇 324 字，写毕落款、钤印、展卷。含「崇山」旁添、涂改墨团、廿之对照 |
| 02 | [大力神 · 挖地虎合体](02-devastator/) | 实时 3D 动画（Three.js） | 铲土机、搅拌机、拖斗、吊钩、清扫机、推土机依次变形、对接，合成手持紫色步枪的 G1 大力神。模型、PBR 金属材质、纹理、音效和原创进行曲配乐全部由代码程序生成，带分镜运镜、GTAO 与泛光 |

## 运行

各案例均为纯静态页面（ES Module 不能用 `file://` 打开），在本目录下起一个 HTTP 服务即可：

```bash
python3 -m http.server 8765
# 打开 http://localhost:8765/01-lantingxu/
#     http://localhost:8765/02-devastator/
```

## 参考

- [claude-opus-5.5-game-demo](https://github.com/liangruibupt/claude-opus-5.5-game-demo)：Claude Opus 5.5 生成的 3D 网页游戏示例（fork）
