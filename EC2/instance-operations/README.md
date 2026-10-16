# EC2 Instance Operations

实例日常运维：系统配置、升级与实例类型变更、AMI 共享、远程登录与会话保持。

## Docs

- [Amazon-Linux-AMI-support-chinese](Amazon-Linux-AMI-support-chinese.md)：设置 LANG=en_US.UTF-8 / zh_CN.UTF-8，让 Amazon Linux 支持中文目录、文件名和 Python 中文输出
- [Change-TimeZone](Change-TimeZone.md)：Linux 实例把时区改为 Asia/Shanghai
- [Does_instance_need_restart_for_upgrade](Does_instance_need_restart_for_upgrade.md)：在 RHEL / CentOS / Amazon Linux、Debian / Ubuntu、OpenSUSE / SLES 上判断安装更新后是否需要重启
- [How-to-share-ami](How-to-share-ami.md)：把 AMI 共享给组织 / OU、指定账号，以及通过 RAM 共享 EC2 Image Builder 资源的文档链接
- [Upgrade-C4-CentOS-instance-to-C5-instance](Upgrade-C4-CentOS-instance-to-C5-instance.md)：CentOS 7.5 实例从 C4 改为 C5（Nitro）：检查 ENA / NVMe 驱动、修改实例类型，以及 initramfs 缺少 nvme 模块导致无法启动的排障
- [Session-manager](Session-manager.md)：用 Session Manager + VPC endpoint 管理无公网访问的私有实例；从本地、同区域和跨区域跳板机接入的测试，以及跨区域 DNS 解析导致会话卡住的排查和解决办法
- [keep_remote_session_running](keep_remote_session_running.md)：用 tmux 保持远程 SSH 会话不中断（含 Claude Code 用法）
- [What-does-list-indexing-in-python](What-does-list-indexing-in-python.md)：（与 EC2 无关的杂记）Python 列表切片 a[:-1] 等用法示例
