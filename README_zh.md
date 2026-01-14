![logo](./images/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

[English](./README.md) | 中文文档 | [日本語ドキュメント](./README_jp.md)

## 简介

🖥️ 官网链接: [https://revornix.com](https://revornix.com)

🚀 开发计划: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)

❤️ 加入社群: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

一句话描述：Revornix是在AI时代可高度自定义的资讯、文档管理工具，帮助你便捷整合任意资讯，并基于这些资讯输出图文并茂、有播客音频的报告，然后通知你。

**一些界面UI**

![首页](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204108304.png)

![文档页面](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114203737293.png)

![专栏页面](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204036225.png)

注：**热搜头条功能源自[DailyHotApi](https://github.com/imsyy/DailyHotApi)项目**

![热搜](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114225533807.png)

## 功能特性

- 输入源自由：根据不同类型的解析引擎，当前支持网页、PDF、Word、Excel、PPT、手动输入文本、API、PIP库、NODEJS库等输入源，未来还将接入更多三方平台。
- 先进文本转化技术：依赖MinerU、Jina等先进的文本内容转化技术，输入源转化情况达到行业领先水平，并且支持自定义转化引擎。
- 向量化存储：Revornix会将所有的输入内容拆碎了然后转化为向量最终存储到向量数据库中，便于用户进行检索与查询，同时也给AI模型提供更丰富的上下文信息。
- 知识图谱：基于个性化GraphRag技术，Revornix会将信息源分析并生成知识图谱，大大提高模型上下文准确度，同时一份大大的知识图谱也会让人有着不小的爽感。
- 集成分享机制：Revornix内置了分享机制，用户可以分享自己的指定知识库和他人共建，甚者可以将自己的知识库推送到公域供搜索引擎搜索，也可以使用他人的公开知识库，知识共享这一块儿是Revornix的重点。
- 本地化&开源：代码开源，同时若使用本地部署方式，所有数据均存储在本地，无需担心数据泄露问题。
- 智能助手&内置MCP：Revornix内置了MCP服务客户端和服务端，既可以向第三方提供MCP服务，也可以使用AI助手来调用本地或者三方的MCP服务。
- 大模型无缝接入：模型不固定，只要兼容openai的api的模型，你都可以任意选择，并且针对不同的功能点，模型可以独立。
- 多语言&响应式：无论你是中文用户还是英文用户，无论你是使用手机还是电脑，都能获得良好的使用体验。
- 自动播客：用户可以开启文档/专栏的自动播客生成/更新功能，开启后，Revornix会自动生成文档/专栏的播客音频文件，提供一种更加便利的方式获取信息。
- 热搜集成：Revornix内嵌了[DailyHotApi](https://github.com/imsyy/DailyHotApi)服务，用户可以一站式查看各大平台的热搜榜单。
- 插图能力：基于Banana Pro等大模型强大的生图能力，Revornix可以生成高质量的图片，并且支持将图片嵌入到文档/专栏中。

## 快速开始

> [!NOTE]
> 强烈建议使用 conda 针对每个服务创建不同的 python 虚拟环境，因为不同服务之间的python依赖可能存在冲突。当然如果你有别的python虚拟环境管理工具，也可以使用别的。

### 克隆仓库到本地

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 安装并且启动基础服务

> [!NOTE]
> 如果你没有安装postgres、redis、neo4j、minio、milvus、rsshub、browserless，那么你需要手动在本地安装这些服务，并根据实际需求设置各个服务的环境变量配置，具体参照各服务实际需求和[Revornix环境变量章节](https://revornix.com/docs/environment)。
> 
> 考虑到这些属于比较麻烦且不重要的工作，我特地做了一套`docker-compose-local.yaml`和`.env.local.example`文件，你可以直接使用`docker-compose-local.yaml`这个文件下载这些服务，并使用`.env.local.example`的配置作为环境变量。

> [!WARNING]
> 注意：如果你本地已经安装了其中的部分服务，请按照你的实际情况在`docker-compose-local.yaml`文件中关闭对应的服务配置，否则可能会引起一些意料之外的情况。

复制我提供的example文件，同时根据实际需求结合[Revornix环境变量章节](https://revornix.com/docs/environment)修改字段，如果你没有特殊需求，一般只需修改`OAUTH_SECRET_KEY`字段即可。

```shell
cp .env.local.example .env.local
```

启动postgres、redis、neo4j、minio、milvus、rsshub、browserless服务。

```shell
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### 各大微服务环境变量配置

```shell
cp ./web/.env.example ./web/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

前往对应的环境变量文件配置，详情见[Revornix环境变量章节](https://revornix.com/docs/environment)

> [!WARNING]
> 注意如果你使用手动部署方式，那么不同服务的`SECRET_KEY`必须保持一致，否则会导致不同服务之间的用户认证体系无法互通。

### 初始化一些必要的数据

```shell
cd api
python -m data.milvus.create
python -m data.sql.create
```

### 启动核心后端服务

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### 启动热搜聚集服务

```shell
cd hot-news
pnpm build
pnpm start
```

### 启动 celery 任务序列

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
celery -A common.celery.app worker --pool=threads --concurrency=10 --loglevel=info -E
```

### 启动前端服务

```shell
cd web
pnpm build
pnpm start
```

当你将所有服务均启动之后，访问 http://localhost:3000 即可看到前端页面

## 贡献者

<a href="https://github.com/Qingyon-AI/Revornx/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>