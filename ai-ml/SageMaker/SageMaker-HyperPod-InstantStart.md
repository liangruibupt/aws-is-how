# HyperPod InstantStart 是基于 SageMaker HyperPod 构建的训推一体平台

## HyperPod InstantStart 是基于 SageMaker HyperPod 构建的训推一体平台的基本能力：
- 训练可基于标准 Kubenetes 的 Kubeflow 或者 基于HyperPod Training Operator（大幅简化分布式配置，具备进程级别的重启及业务日志异常监控及恢复能力，可选）、或KubeRay（作为Verl的强化学习框架的编排器）。
- 推理可基于任意容器，如标准 vLLM/SGLang 容器，进行单节点/跨节点（模型并行或PD分离）的模型部署，同时包括标准化API（如OpenAI接口）的暴露、秒级Pod资源复用、KV Cache/Prefix感知路由，L1/L2 Cache复用及基于Karpenter的HyperPod及EC2资源联合调度。
- 可基于 SageMaker 托管MLFlow Tracking Server进行训练任务的Metric存储、共享和集成
- HyperPod Inference Operator：可直接在使用标准OSS容器（如vLLM、SGLang）的同时，集成了高级可观测性、L1/L2 KVCache共享、智能路由策略（Prefix/Cache/Session-aware、Round-robin等），大幅降低用户自建相关生产能力的复杂度及耗时。

## [搭建手册](https://amzn-chn.feishu.cn/docx/VZfAdXTJKor7TCxPrZdcbGYXnaf?from=from_copylink) 


### 新特性1 HyperPod InstantStart 引入 Agent-Driven 的 AI Infra 管理能力

将项目已有的 MCP 工具（调用项目后端API）进行了更新及整合，并基于端到端业务链路编排为项目层级的 Agent SKILL，用户仅需启动 Kiro Agent 并通过少量简单交互，即可完成生产标准 HyperPod 集群的 0-1 搭建、模型部署、及托管 Operator 配置等。相较于直接使用 Coding Agent 调用 AWS CLI/SDK 的基础方式。

关键优势如下：
- 最佳实践内置：MCP 对项目后端 API 进行了封装，确保符合 AI Workload 最佳实践，避免了 Agent 自由调用 AWS CLI/SDK 带来的配置偏差，同时大幅降低交互轮次及 Context 窗口占用；
- 业务链路编排：基于完整业务流程构建 Agent SKILL 以编排关键的多步操作，而非依赖 Agent 自行规划执行路径，确保流程健壮性及可复现；
- 零本地配置：后端 API 与 MCP Server 统一于容器中启动，开箱即用，无需任何本地环境准备。
- HyperPod InstantStart后端API能力集成至MCP，供主流Agent使用（已支持Kiro），用户可通过自然语言交互进行集群管理、训练、推理等。

### 新特性2 EKS集群管理, S3 挂载等新能力，GPU虚拟化能力
- 开发环境新增基于FUSE的S3挂载，对齐Pod挂载路径。无需额外使用共享文件系统，Pod可利用Mount Point for S3 CSI 直接获取本地的任何数据及代码改动，开发环境也可以直接读取集群保存的模型检查点，为用户提供所见即所得的AI开发体验；
- 增加即有EKS集群导入功能，实现统一平台同时管理多个EKS集群，同一EKS集群同时管理 HyperPod Resilient 计算节点及标准EKS节点组（OD/Spot/CB）；
- 生产级细粒度资源配置：除方案内的一键启动外，用户可以导入已有EKS集群，及自定义使用预置的VPC，子网及安全组，适用于企业客户需要严格管控的网络环境；
- 集成 HAMi GPU 虚拟化能力，可以针对包括G系列在内的不同类型的GPU进行虚拟化，相比MIG的固定分割Profile，HAMi可对GPU进行任意粒度的分割及资源申请，可随时开关。为不同workload提供更高的灵活性;
- HyperPod 托管Spot + HyperPod Karpenter：由HyperPod统一调度的Spot资源，无需独立维护EKS Spot Node Group，与HyperPod OD/FTP节点组统一调度，大幅降低GPU使用成本；
- HyperPod 托管Managed Tiered Storage：由HyperPod托管的基于内存的分布式文件系统，可用于高性能的分布式Checkpoint存储、推理KVCache共享，可一键式启停；
  
### 新特性3 强化学习训练任务的能力
- 新增 VERL 强化学习Training Recipe，并使用KubeRay集成至HyperPod InstantStart，大幅简化分布式强化学习训练的集群配置复杂性； 
- 同时新增基于QwenVL官方Repo的QwenVL Training Recipe，提供从数据处理到训练的e2e完整流程；
- Sandbox for RLVR：为强化学习训练任务提供了Sandbox as Service，由EKS统一编排，作为集群内的RL训练任务的沙盒环境，参考文档。

### 性能优化
- 通过全局Router进行推理服务发现及KV-Cache感知的智能路由，对于长Context推理如Coding，Multi-turn Chat等场景大幅降低首字延时；
- 集成Prometeus以回收全局Router的流量指标，以Keda进行统一扩缩容策略管理，并利用Karpenter进行统一资源调度。如以Hyperpod托管Instance Group或EKS Managed Node Group作为固定集群资源，快速弹起EC2 On-Demand或Spot实例，承接临时流量Peak，大幅降低算力配置复杂度及成本，并极大降低扩容时实例预置耗时。
- [智能路由及统一调度部署手册](https://amzn-chn.feishu.cn/docx/VZfAdXTJKor7TCxPrZdcbGYXnaf#share-ACmxdj9vMotKVYxHDaVcOmR9nUc)

## SageMaker HyperPod Troubleshooting Guide 发布

【HyperPod 故障排查指南】(https://awslabs.github.io/ai-on-sagemaker-hyperpod/docs/common/troubleshooting-guide), 针对客户在使用 HyperPod 过程中常遇到的已知问题做了分类和梳理,包括涉及场景包括集群部署,节点管理,性能优化,GPU等,并且会持续更新。

HyperPod 作为半托管的平台级的方案,不仅涉及到GPU节点的使用,出问题后往往会涉及存储、网络、权限、可观测性以及框架等各方面的协同。推荐基于如下从高到低的优先级让客户去使用 HyperPod 的产品,可最大程度优化客户体验并降低故障风险：

- 直接使用 HyperPod InstantStart 方案， 提供 UI 界面和业界主流训练推理框架集成,Buyer客户可以最大程度避免直接与 EKS 交互
- 基于 产品团队 提供的 blueprints 部署模板，同时支持 Slurm 和 EKS, 并且预置了 Ray Train 等框架,简化端到端部署