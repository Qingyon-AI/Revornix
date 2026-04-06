![logo](./assets/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

[English](./README.md) | [中文文档](./README_zh.md) | 日本語ドキュメント

> Reject FOMO! When facing the information stream, be lazy, leave the rest to AI!
>
> 拒绝 FOMO！面对信息流，做个懒人，剩下的，交给 AI！

Revornix は、オープンソースかつローカルファーストな AI 情報ワークスペースです。散らばった情報源を構造化ナレッジへ変換し、画像付きレポートやポッドキャスト音声を自動生成して、必要な情報を通知で届けます。

## リンク

- 公式サイト: [https://revornix.com](https://revornix.com)
- 環境変数ドキュメント: [https://revornix.com/docs/environment](https://revornix.com/docs/environment)
- 開発ロードマップ: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)
- コミュニティ: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

## なぜ Revornix か

- 情報処理を一本化: 収集から要約、グラフ、ポッドキャスト、通知まで自動化。
- AI 検索品質を最適化: チャンク化 + ベクトル化 + パーソナライズ GraphRAG。
- データを自分で管理: ローカルデプロイで主要データを自社インフラに保持。
- モデル選択が自由: OpenAI API 互換モデルを柔軟に接続可能。
- 共同編集に対応: ナレッジ共有や共同構築、公開運用にも対応。

## 情報ストリームから成果まで

1. 収集: Web、PDF、Word、Excel、PPT、テキスト、API、ライブラリ資料など。
2. 解析: MinerU、Jina などで正規化。カスタム変換エンジンにも対応。
3. 整理: チャンク化、ベクトル保存、知識グラフ構築で検索・推論可能に。
4. 配信: 図文生成、挿絵、ポッドキャスト化、通知配信まで自動実行。

## プロジェクト構成

```text
Revornix/
├── web/                  # Next.js フロントエンド（UI / ダッシュボード）
├── api/                  # FastAPI コアバックエンド（認証、ドキュメント、AI API）
├── celery-worker/        # 非同期ワークフロー（embedding、要約、グラフ、通知）
├── hot-news/             # トレンド集約サービス（DailyHotApi ベース）
└── docker-compose-local.yaml # ローカル依存サービス起動
```

## 主な機能

- 柔軟な入力: 複数フォーマットを統一パイプラインで解析。
- 高品質な変換: Markdown/構造化変換を強力にサポート。
- ベクトル検索: セマンティック検索と AI コンテキスト強化に対応。
- グラフ推論: GraphRAG により文脈精度を向上。
- MCP 内蔵: MCP Client と MCP Server の両方を提供。
- 自動ポッドキャスト: ドキュメント/セクションの音声化を自動更新。
- AI 挿絵生成: 画像を生成してコンテンツに埋め込み可能。
- トレンド一元化: DailyHotApi 連携で主要プラットフォームを横断表示。
- 多言語/レスポンシブ: モバイルとデスクトップの両方で快適に利用可能。

## UI プレビュー

![Dashboard](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260312200944018.png)

![Revornix-AI](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318193157115.png)

![Document](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318190625846.png)

![Knowledge Graph](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318192919663.png)

![Section](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318192242314.png)

注: トレンドヘッドライン機能は [DailyHotApi](https://github.com/imsyy/DailyHotApi) をベースにしています。

![Hot-News](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318193532765.png)

## クイックスタート

> [!NOTE]
> サービス間で Python 依存が衝突しやすいため、サービスごとに独立した仮想環境（例: conda）を推奨します。

### 1) リポジトリをクローン

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 2) 基本依存サービスを起動

> [!NOTE]
> すでに postgres、redis、neo4j、minio、milvus がある場合はそれを利用可能です。未導入なら `docker-compose-local.yaml` + `.env.local.example` を使ってください。

> [!WARNING]
> ローカルで一部依存が動作中の場合は、`docker-compose-local.yaml` の該当サービスを無効化して競合を避けてください。

```shell
cp .env.local.example .env.local
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### 3) 各マイクロサービスの環境変数を設定

```shell
cp ./web/.env.example ./web/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

詳細は [環境変数ドキュメント](https://revornix.com/docs/environment) を参照してください。

> [!WARNING]
> 手動デプロイ時は `OAUTH_SECRET_KEY` を全サービスで統一しないと、サービス間認証が失敗します。

### 4) 必要データを初期化

```shell
cd api
python -m data.milvus.create
python -m data.sql.create
```

### 5) API サービスを起動

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### 6) トレンド集約サービスを起動

```shell
cd hot-news
pnpm build
pnpm start
```

### 7) Celery ワーカーを起動

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
playwright install
celery -A common.celery.app worker --pool=threads --concurrency=20 --loglevel=info -E
```

### 8) フロントエンドを起動

```shell
cd web
pnpm build
pnpm start
```

すべて起動後、http://localhost:3000 にアクセスしてください。

## コントリビューター

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
