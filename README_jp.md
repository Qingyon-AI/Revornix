![logo](./images/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

[English](./README.md) | [中文文档](./README_zh.md) | 日本語ドキュメント

## 概要

🚀 開発計画: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)

🖥️ 公式サイト: [https://revornix.com](https://revornix.com)

❤️ コミュニティ参加: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

Revornix は AI 時代の情報管理ツールです。あらゆる可視情報を手軽に統合し、指定したタイミングで完全なレポートをお届けします。

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251011141251012.png)

## 主な機能

- 多彩な入力ソース: 現在は RSS、Web ページ、PDF、Word、Excel、PowerPoint、手動テキスト、API、PyPI パッケージ、Node.js パッケージなどに対応。今後さらに多くの外部サービスを追加予定です。
- 高度なテキスト変換: MinerU など最新の Markdown 変換技術を採用し、業界トップレベルの変換品質を実現。カスタム変換エンジンにも対応します。
- ベクトル保存とナレッジグラフ: パーソナライズされた GraphRAG と Embedding により、すべての入力が検索可能なベクトルと知識グラフに変換され、検索と問い合わせを強化します。
- 共有メカニズム内蔵: 任意のナレッジベースを共有したり、公開ナレッジベースを活用したりして、簡単に知識共有・協業が可能です。
- ローカル重視 & オープンソース: 完全オープンソースで、セルフホスト時はすべてのデータを手元に保存。情報漏えいの心配はありません。
- スマートアシスタント & MCP: MCP クライアント／サーバーを同梱。外部へツールを提供したり、アシスタントがローカルやサードパーティの MCP を呼び出したりできます。
- 大規模モデルのシームレス連携: 好きなモデルを自由に選択可能で、機能ごとに独立したモデル設定ができます。
- 多言語 & レスポンシブ: 中国語と英語のどちらでも、PC とモバイルのどちらでも快適な利用体験を提供します。

## クイックスタート

現行アーキテクチャはまだ最終形ではなく、Docker パッケージにも既知の課題があります。そのため、当面は以下の手動デプロイ手順を推奨します。

> [!NOTE]
> 各サービスごとに Conda などで個別の Python 仮想環境を作成することを強くおすすめします。サービスごとに依存パッケージが異なり、衝突を避けるためです。別の仮想環境管理ツールを使っていただいても構いません。

### リポジトリをクローン

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 基盤サービスをインストールして起動

> [!NOTE]
> PostgreSQL、Redis、Neo4j、MinIO、Milvus、RSSHub、Browserless がインストールされていない場合は、先に導入し、それぞれのサービス要件と [Revornix 環境変数ガイド](https://revornix.com/docs/environment) を参考に環境変数を設定してください。  
> 煩雑さを減らすために `docker-compose-local.yaml` と `.env.local.example` を用意しています。これらを使えば依存サービスをまとめて起動できます。

> [!WARNING]
> 既に一部のサービスがローカルで稼働している場合は、`docker-compose-local.yaml` で該当サービスを無効化し、競合を避けてください。

次に、サンプル環境変数ファイルをコピーし、[環境変数ガイド](https://revornix.com/docs/environment) を参考に必要な項目を変更します。ほとんどの場合は `OAUTH_SECRET_KEY` のみ変更すれば十分です。

```shell
cp .env.local.example .env.local
```

PostgreSQL、Redis、Neo4j、MinIO、Milvus、RSSHub、Browserless を起動します。

```shell
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### 各サービスの環境変数を設定

```shell
cp ./web/.env.example ./web/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

それぞれのファイルを [環境変数ガイド](https://revornix.com/docs/environment) に沿って編集します。

> [!WARNING]
> 手動デプロイ時は、各サービスの `SECRET_KEY`（または `OAUTH_SECRET_KEY`）を同一にしてください。異なる値にすると認証情報を共有できなくなります。

### 必要な初期データを投入

```shell
cd api
python -m script.init_vector_base_data
python -m script.init_sql_base_data
```

### コアバックエンドを起動

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### Daily Hot サービスを起動

```shell
cd daily-hot
pnpm build
pnpm start
```

### Celery ワーカーを起動

現在サポートされているのは `pool=solo`（単一プロセスモード）のみです。マルチプロセス対応は今後の予定です。

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
celery -A common.celery.app.celery_app worker --pool=solo
```

### フロントエンドを起動

```shell
cd web
pnpm build
pnpm start
```

すべてのサービスが正常に動作したら、http://localhost:3000 にアクセスしてフロントエンドを確認してください。

## 貢献者

<a href="https://github.com/Qingyon-AI/Revornx/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
