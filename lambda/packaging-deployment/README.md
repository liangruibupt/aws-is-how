# Lambda Packaging & Deployment: Layers / Container Images

把依赖打成 Lambda Layer，或者用容器镜像方式打包、测试和部署 Lambda 函数。

## Docs

- [How-to-build-lambda-layer](How-to-build-lambda-layer.md)：用 `publish-layer-version` 制作 pandas/numpy Layer（python3.8，中国区），配置跨账号 Layer 权限，控制台 / CLI 给函数挂载和移除 Layer
- [create-pandas-layer-4-lambda](create-pandas-layer-4-lambda.md)：`pip install pandas -t` 打包 pandas Layer，并给出验证 pandas/numpy 的测试函数代码
- [Lambda-container-image-support](Lambda-container-image-support.md)：Lambda 容器镜像支持：基于 AWS 提供的 Node.js 基础镜像（PDFKit 生成 PDF）、基于 Runtime Interface Client 的自定义 Python 基础镜像，以及用 SAM 构建 / 本地调试 / 部署镜像函数

## Scripts

- [scripts/lambda_container/](scripts/lambda_container/)：AWS 基础镜像示例（`app.js` 用 PDFKit + faker 生成 PDF、`Dockerfile`、`package.json`）
- [scripts/lambda-container-custom/](scripts/lambda-container-custom/)：自定义基础镜像示例（Python `app.py`、`Dockerfile`、入口脚本 `entry.sh`）
- [scripts/lambda_container_sam/](scripts/lambda_container_sam/)：SAM 镜像函数示例（`template.yaml` 含 HelloWorld / HolaWorld 两个 Image 函数，`template.yaml.singlefunction` 为单函数版本，`hello-world/` 函数代码与 Dockerfile）
