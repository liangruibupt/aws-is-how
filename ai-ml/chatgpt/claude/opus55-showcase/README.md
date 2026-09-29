# Claude Opus 5.5 Showcase —— 已迁到独立仓库

这个目录已经拆出去单独成库：**<https://github.com/liangruibupt/opus55-showcase>**

案例（01 临《兰亭集序》逐笔动画、02 大力神合体、03 闻境香水产品视频工厂，以及后续的电商视频案例）和共用的视频工厂 `factory/` 都在新仓库里，往后加案例和素材不会再撑大 aws-is-how。拆分时保留了全部提交历史；拆分前的最后版本在本仓库的提交 `905545d`。

新仓库配音用的 Kokoro 部署脚本仍在本仓库的 [ai-ml/aigc/audio_models/Kokoro/](../../../aigc/audio_models/Kokoro/)，默认按「两个仓库并排检出」去找它：

```bash
cd ~/Documents/workspaces
git clone https://github.com/liangruibupt/opus55-showcase.git   # 和 aws-is-how 放在同一层
```
