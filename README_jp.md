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

Revornix は、オープンソースかつローカルファーストな AI 情報ワークスペースです。「気になっているけど読みきれない」リンク・PDF・音声・スクリーンショットをまとめて渡しておけば、構造化されたナレッジに整理し、読める/聴ける図文記事やポッドキャストとして再構成し、必要なタイミングで通知として届けてくれます。

Web クライアント・ゲートウェイ・API・非同期ワーカー・トレンドフィード・ドキュメントサイトまで、すべてがオープンで自前のインフラ上で動かせます。

## リンク

- 公式サイト: <https://revornix.com>
- 体験版: <https://app.revornix.com>
- ドキュメント: <https://revornix.com/docs>
- 環境変数: <https://revornix.com/docs/environment>
- ロードマップ: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)
- コミュニティ: [Discord](https://discord.com/invite/3XZfz84aPN) · [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) · [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

## なぜ Revornix か

- **情報処理を一本化** —— 収集から要約、グラフ、ポッドキャスト、通知まで、すべての工程をひとつの製品で完結。
- **AI 検索品質を最適化** —— Milvus 上のチャンク化ベクトル検索と、Neo4j 上のパーソナライズ GraphRAG を組み合わせ、回答精度を高めます。
- **データを自分で管理** —— 完全に自分のインフラ上で動作。ドキュメントもデータベースも鍵も、すべて手元に残ります。
- **モデル選択が自由** —— OpenAI API 互換モデルを柔軟に接続でき、解析・ベクトル化・要約・ポッドキャスト・挿絵などのエンジンを個別に切り替え可能。
- **共同編集に対応** —— 知識セクションをチーム内で共有することも、コミュニティに公開することもできます。
- **公開ディスカバリー** —— 公開済みドキュメント、セクション、クリエイター、ラベル、トレンドが、SEO に配慮したコミュニティページとして自動的に表示されます。

## 情報ストリームから成果まで

1. **収集** —— Web、PDF、Word、Excel、PPT、テキスト、音声、加えて公開 API、Python SDK / CLI、OpenClaw Skill から自動取り込み。
2. **解析** —— プラガブルな変換エンジン（MinerU、Jina、カスタム）で整形・正規化し、統一された Markdown に。
3. **整理** —— チャンク化して Milvus にベクトル投入、ユーザー専用の Neo4j グラフにエンティティ/関係を抽出、タグを自動付与。
4. **配信** —— AI 要約、挿絵付き長文、二人対話ポッドキャスト、通知を、あなたのペースで届けます。

## プロジェクト構成

```text
Revornix/
├── web/                       # Next.js クライアント（ワークスペース + 公開ページ）— web/README.md
├── api/                       # FastAPI コアバックエンド（認証、ドキュメント、AI API）— api/README.md
├── celery-worker/             # 非同期ワークフロー（embedding、要約、グラフ、ポッドキャスト、通知）— celery-worker/README.md
├── gateway/                   # Go 製の公開エントリゲートウェイ（ルーティング、アンチスクレイピング、上流フェイルオーバー）
├── hot-news/                  # トレンド集約サービス（DailyHotApi ベース）
├── docs/                      # 公開ドキュメントサイト（revornix.com/docs）— 独立した Next.js + Nextra
├── desktop/                   # デスクトップアプリ（Tauri/Electron）の予定地 — 現状はプレースホルダ
├── assets/                    # リポジトリ全体で使用する画像/ブランド素材
└── docker-compose-local.yaml  # ローカル依存（Postgres、Redis、Neo4j、MinIO、Milvus）の起動
```

各サブディレクトリには、それぞれのサービスの詳細をまとめた README があります。

## 主な機能

現在実装されている機能の概要です。各機能のスクリーンショット付き解説は [ドキュメントサイト](https://revornix.com/docs) を参照してください。

- **マルチフォーマット取り込み** —— Web、PDF、Word、Excel、PPT、テキスト、音声、公開 API 経由のデータ。
- **プラガブルな解析エンジン** —— ワークスペース単位でデフォルトエンジン（MinerU、Jina、カスタム）を選択。文書タイプごとに使い分けることも可能。
- **ベクトル検索 + GraphRAG** —— 全ドキュメントを Milvus に投入し、ユーザー専用の Neo4j グラフに射影。AI 回答により多くの文脈を与えます。
- **グローバル検索** —— プライベートライブラリにはベクトル/全文検索、公開層には公開ドキュメント・セクション・クリエイター・ラベルの発見機能。
- **セクション** —— トピックごとにまとめたドキュメント集。プライベート、共同編集、コミュニティ公開のいずれも可能。
- **デイリーセクション** —— 当日に集めた内容を自動的にひとつの読みやすいセクションにまとめます。
- **AI アシスタント（Revornix AI）** —— あなたのドキュメントとパーソナルグラフをもとに対話します。
- **MCP** —— MCP クライアント（外部 MCP サーバーを呼び出す）と MCP サーバー（自分のライブラリを MCP 対応ツールに公開）の両方をサポート。
- **自動ポッドキャスト** —— ドキュメント／セクションを二人対話のオーディオに変換。コンテンツ更新時に再生成可能。
- **AI 挿絵** —— 長文の章ごとに挿絵を生成し、本文に埋め込みます。
- **トレンド集約** —— 内蔵の `hot-news/` で複数プラットフォームのホットランキングを集約。
- **強化された Markdown 閲覧／編集** —— Tiptap ベースのエディタで、表・Mermaid・数式・画像に対応。長文の公開ページにはフローティング目次。
- **通知システム** —— メール／アプリ内／プッシュなど複数チャネルから、タスク完了や定期サマリーを配信。
- **多言語・レスポンシブ** —— 製品 UI は英語/中国語に対応し、リポジトリ README は英語/中国語/日本語を用意。デスクトップとモバイルの両方に最適化。
- **多層防御** —— `gateway/` がエッジで明らかなクローラを遮断、`api/` が公開エンドポイントへのレート制限を補完。

## UI プレビュー

ワークスペースと公開サーフェスの一部です。フルウォークスルーは [ドキュメント](https://revornix.com/docs) を参照してください。

**ダッシュボード** —— 日次概要、AI からの提案、データ鮮度シグナル。
![Dashboard](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161335093.png)

**Revornix AI** —— あなたのドキュメントとパーソナルグラフに基づくチャット。
![Revornix-AI](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161439547.png)

**ドキュメント詳細** —— Markdown 閲覧、AI 要約、ポッドキャスト、ナレッジグラフ、操作を 1 画面に集約。
![Document](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161532457.png)

**パーソナル知識グラフ** —— 保存したコンテンツから抽出したエンティティと関係。
![Knowledge Graph](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318192919663.png)

**セクション** —— テーマごとにドキュメントを整理したコレクション。
![Section](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161641269.png)

**ポッドキャスト** —— ドキュメントやセクションを二人対話の音声に変換。
![Podcast](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260421222904288.png)

**クリエイター公開ページ** —— SEO 対応のクリエイタープロフィール。
![User SEO](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418162540367.png)

**コミュニティ** —— 他のユーザーが公開したコンテンツを閲覧。
![Community](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418162732909.png)

**トレンドヘッドライン** —— 内蔵の `hot-news/` で複数プラットフォームのホットランキングを集約（[DailyHotApi](https://github.com/imsyy/DailyHotApi) ベース）。
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
cp ./gateway/.env.example ./gateway/.env
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

### 6) ゲートウェイサービスを起動（任意）

```shell
cd gateway
go run ./cmd/gateway
```

ローカル開発では必須ではありませんが、本番環境では推奨します。公開トラフィックの入口、上流フェイルオーバー、`api/` に到達する前のアンチスクレイピング/レート制限を担当します。

### 7) トレンド集約サービスを起動

```shell
cd hot-news
pnpm build
pnpm start
```

### 8) Celery ワーカーを起動

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
playwright install
./start-worker.sh
```

### 9) フロントエンドを起動

```shell
cd web
pnpm build
pnpm start
```

すべて起動後、<http://localhost:3000> にアクセスしてください。

## 次に読むもの

- **製品を使いたい?** <https://revornix.com/docs/start> から始め、<https://app.revornix.com> にアクセスしてください。
- **拡張したい?** 各サービスに個別の README があります: [`web/`](./web/README.md)、[`api/`](./api/README.md)、[`celery-worker/`](./celery-worker/README.md)、[`gateway/`](./gateway/README.md)、[`docs/`](./docs/README.md)。
- **ドキュメントに貢献したい?** [`docs/src/content/`](./docs/README.md) に MDX を追加してください。
- **デスクトップ版が気になる?** まだ計画段階です。[`desktop/`](./desktop/README.md) を参照。
- **アーキテクチャを深く知りたい?** <https://revornix.com/docs/developer/structure>。

## コントリビューター

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
