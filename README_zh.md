# Revornix

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)

[English](./README.md) | 中文文档 | [日本語ドキュメント](./README_jp.md)

## 简介

官网链接: [https://revornix.com](https://revornix.com)

加入社区: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

AI时代的资讯管理工具。Revornix可以帮助你便捷整合所有可见资讯，并在特定时间给你一份完整的报告。

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202507021504358.png)

## 功能特性

- 跨平台可用：当前支持网页端，后续将会支持iOS端APP和微信小程序。
- 一站资讯收集：一站式资讯收集，包括新闻、博客、论坛等。
- 文档转化&向量化存储：基于多模态大模型，将文件转化为Markdown，经过Embedding后存入行业top级别领先的milvus。
- 原生多租户：设计成了一个多租户系统，可以支持多个用户同时使用，并且每个用户都可以拥有自己的文档库，彼此独立。
- 本地化&开源：代码开源，所有数据均存储在本地，无需担心数据泄露问题。
- 智能助手&内置MCP：基于内置MCP的智能AI助手能够与你基于文档和其他工具进行对话，并支持多模型切换。
- 大模型无缝接入：内置模型接入口，你可以自由配置与选择想使用的大模型。（需要基于openai协议）
- 多语言&响应式：无论你是中文用户还是英文用户，无论你是使用手机还是电脑，都能获得良好的使用体验。

## 快速开始

### Docker 方式（建议）

#### 克隆仓库到本地

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

#### 环境变量配置

```shell
cp ./envs/.api.env.example ./envs/.api.env
cp ./envs/.file.env.example ./envs/.file.env
cp ./envs/.celery.env.example ./envs/.celery.env
cp ./envs/.hot.env.example ./envs/.hot.env
cp ./envs/.mcp.env.example ./envs/.mcp.env
cp ./envs/.web.env.example ./web/.env
```

前往对应的环境变量文件配置，详情见[环境变量配置篇章](https://revornix.com/en/docs/environment)

#### docker 拉取必要仓库并启动

```shell
docker compose up -d
```

当所有服务均启动之后，访问 http://localhost 即可看到前端页面，注意由于后端服务启动时间较长，前端可能需要等待一段时间（正常情况下为 3-5 分钟左右）才能正常请求接口，可以通过`docker compose logs api`查看核心后端服务启动状态。

### 手动部署方式

详情见[官网文档手动部署方式](https://revornix.com/en/docs/start#manual-deployment-method)

## 贡献者

<a href="https://github.com/Qingyon-AI/Revornx/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>