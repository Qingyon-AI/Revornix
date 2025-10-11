![logo](./images/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

English | [中文文档](./README_zh.md) | [日本語ドキュメント](./README_jp.md)

## Introduction

🚀 RoadMap: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)

🖥️ Official Website: [https://revornix.com](https://revornix.com)

❤️ Join our community: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

Revornix is an information management tool for the AI era. It helps you conveniently integrate all visible information and provides you with a comprehensive report at a specific time.

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251011141251012.png)

## Features

- Cross-platform availability: Currently supports web; iOS app and WeChat Mini Program support coming soon.
- All-in-one content aggregation: Centralized content collection, including news, blogs, forums, and more.
- Document Transformation & Vectorized Storage: Powered by multimodal large models, files are converted to Markdown and embedded before being stored in the industry-leading Milvus.
- Native Multi-Tenancy: Designed as a multi-tenant system, it supports concurrent usage by multiple users, each with their own independent document repository.
- Localization & Open Source: Open-source code with all data stored locally—no concerns about data leakage.
- Smart Assistant & Built-in MCP: An AI assistant powered by built-in MCP that can interact with your documents and tools, supporting multi-model switching.
- Seamless LLM integration: Built-in model integration support—freely configure and choose the LLM you want (OpenAI-compatible required).
- Multilingual & Responsive: Whether you're a Chinese or English user, on mobile or desktop, you'll enjoy a great experience.

## Quick Start

### Docker Method (Recommended)

#### Clone the Repository Locally

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

#### Environment Variables Configuration

```shell
cp .env.example .env
```

Go to the corresponding environment variable files and configure them. For details, refer to [Environment Variables Configuration](https://revornix.com/en/docs/environment).

> [!TIP]
> In most cases, you only need to configure the `OAUTH_SECRET_KEY` parameter for the user authentication mechanism, and leave the other parameters as default. Note that the `OAUTH_SECRET_KEY` must be consistent across different services; otherwise, the user authentication systems will not be interoperable.

#### Pull Necessary Repositories and Start with Docker

```shell
docker compose pull
docker compose up -d
```

Once all services are started, you can visit http://localhost to view the front-end page. Note that due to the back-end services taking longer to start, the front-end may need to wait for some time (usually around 10-15 minutes) before it can make successful requests. You can check the core back-end service status with docker compose logs api.

### Manual Deployment Method

For detail, please refer to [official documentation manual deployment method](https://revornix.com/en/docs/start#manual-deployment-method)

## Contributors

<a href="https://github.com/Qingyon-AI/Revornx/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>