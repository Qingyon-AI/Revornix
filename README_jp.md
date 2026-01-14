![logo](./images/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

[English](./README.md) | [中文文档](./README_zh.md) | [日本語ドキュメント](./README_jp.md)

## はじめに

🖥️ 公式サイト: [https://revornix.com](https://revornix.com)

🚀 開発計画: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)

❤️ コミュニティ参加: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

一言で説明: RevornixはAI時代のための高度にカスタマイズ可能な情報・ドキュメント管理ツールです。あらゆる情報源を簡単に統合し、それらを基に画像とポッドキャスト音声付きのリッチなレポートを生成して通知します。

**いくつかのUI**

![ホーム](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204108304.png)

![ドキュメントページ](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114203737293.png)

![コラムページ](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204036225.png)

注: **トレンドヘッドライン機能は[DailyHotApi](https://github.com/imsyy/DailyHotApi)プロジェクトに基づいています**

![トレンド](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114225533807.png)

## 主な機能

- 入力ソースの自由度: 異なる種類の解析エンジンに応じて、現在はウェブページ、PDF、Word、Excel、PPT、手動入力テキスト、API、PIPライブラリ、Node.jsライブラリなどをサポートしています。今後さらに多くのサードパーティプラットフォームを統合予定です。
- 先進的なテキスト変換: MinerUやJinaなどの高度なテキスト変換技術を採用し、業界トップクラスの変換品質を実現。カスタム変換エンジンにも対応します。
- ベクトル化ストレージ: すべての入力内容を分割してベクトル化し、ベクトルデータベースに保存します。検索・照会が容易になり、AIモデルにより豊富なコンテキストを提供します。
- 知識グラフ: パーソナライズされたGraphRag技術に基づき、情報源を分析して知識グラフを生成します。コンテキストの精度を大幅に高め、大きな知識グラフを見る爽快感も味わえます。
- 統合共有メカニズム: 内蔵の共有機能で、指定したナレッジベースを他者と共同構築したり、パブリックに公開して検索エンジンにインデックスさせたり、他者の公開ナレッジベースを利用したりできます。知識共有はRevornixの重点領域です。
- ローカルファースト&オープンソース: コードはオープンソースで、ローカルデプロイならすべてのデータをローカルに保存するため、データ漏洩の心配はありません。
- スマートアシスタント&内蔵MCP: MCPクライアントとサーバーを内蔵し、サードパーティにMCPサービスを提供したり、AIアシスタントにローカルまたは外部のMCPサービスを呼び出させたりできます。
- 大規模モデルのシームレス接続: モデルは固定されていません。OpenAIのAPIと互換性のあるモデルであれば自由に選択でき、機能ごとに独立したモデルを利用できます。
- 多言語&レスポンシブ: 中国語でも英語でも、モバイルでもデスクトップでも、快適な利用体験を提供します。
- 自動ポッドキャスト: ドキュメント/コラムの自動ポッドキャスト生成・更新を有効にすると、Revornixが自動的にポッドキャスト音声ファイルを生成し、より便利に情報を得られます。
- トレンド統合: Revornixは[DailyHotApi](https://github.com/imsyy/DailyHotApi)サービスを組み込み、主要プラットフォームのトレンドランキングをワンストップで確認できます。
- 挿絵生成: Banana Proなどの強力な画像生成モデルを活用し、高品質の画像を生成してドキュメント/コラムに埋め込めます。

## クイックスタート

> [!NOTE]
> 異なるサービス間でPythonの依存関係が衝突する可能性があるため、condaを使ってサービスごとに別のPython仮想環境を作成することを強く推奨します。別のPython仮想環境管理ツールがあれば、そちらを使っても問題ありません。

### リポジトリをローカルにクローンする

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 基盤サービスをインストールして起動する

> [!NOTE]
> postgres、redis、neo4j、minio、milvus、rsshub、browserlessをまだインストールしていない場合は、ローカルに手動でインストールし、各サービスの要件と[Revornix環境変数](https://revornix.com/docs/environment)に沿って環境変数を設定する必要があります。
> 
> この面倒な作業を避けられるよう、`docker-compose-local.yaml`と`.env.local.example`を用意しています。`docker-compose-local.yaml`でこれらのサービスを取得し、`.env.local.example`の設定を環境変数として利用できます。

> [!WARNING]
> すでに一部のサービスをローカルにインストールしている場合は、実際の状況に合わせて`docker-compose-local.yaml`内の該当サービスを無効化してください。そうしないと予期しない問題が発生する可能性があります。

提供しているexampleファイルをコピーし、[Revornix環境変数](https://revornix.com/docs/environment)に沿って必要な項目を調整してください。特別な要件がなければ、通常は`OAUTH_SECRET_KEY`だけを変更すれば十分です。

```shell
cp .env.local.example .env.local
```

postgres、redis、neo4j、minio、milvus、rsshub、browserlessサービスを起動します。

```shell
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### 各マイクロサービスの環境変数設定

```shell
cp ./web/.env.example ./web/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

対応する環境変数ファイルで設定を行ってください。詳細は[Revornix環境変数](https://revornix.com/docs/environment)をご覧ください。

> [!WARNING]
> 手動デプロイを行う場合は、各サービスの`SECRET_KEY`を一致させてください。一致しないとサービス間でユーザー認証が通らなくなります。

### 必要なデータを初期化する

```shell
cd api
python -m data.milvus.create
python -m data.sql.create
```

### コアバックエンドサービスを起動する

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### トレンド集約サービスを起動する

```shell
cd hot-news
pnpm build
pnpm start
```

### Celeryタスクキューを起動する

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
celery -A common.celery.app worker --pool=threads --concurrency=10 --loglevel=info -E
```

### フロントエンドサービスを起動する

```shell
cd web
pnpm build
pnpm start
```

全サービスを起動したら、http://localhost:3000 にアクセスしてフロントエンドを確認できます。

## 貢献者

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
