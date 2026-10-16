# EC2 Capacity & Pricing: Spot / ODCR

Spot 价格查询与选区分析，以及 GPU 实例容量紧张时循环创建实例 / 容量预留的脚本。

## Docs

- [How-to-Get-Spot-Price](How-to-Get-Spot-Price.md)：一条 describe-spot-price-history CLI 命令查询指定实例类型当前的 Spot 价格

## Scripts

- [scripts/for-g5-instance.sh](scripts/for-g5-instance.sh)：循环调用 run-instances 创建 g5.12xlarge，失败则每 60 秒重试，成功后退出
- [scripts/for-g5-instance-odcr.sh](scripts/for-g5-instance-odcr.sh)：无限循环，每 5 分钟创建一个 g5.2xlarge 按需容量预留（ODCR），脚本本身不会自动停止
- [scripts/spot_advisor_agentic_extended.py](scripts/spot_advisor_agentic_extended.py)：基于模拟数据分析 p5en.48xlarge 在多个区域的 Spot 折扣率和中断率，按条件筛选并输出推荐和区域汇总
- [scripts/spot_summary_table.md](scripts/spot_summary_table.md)：p5en.48xlarge Spot 推荐结果表（基于模拟数据，2025-07-31）
