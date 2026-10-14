# Vercel配信手順

## 1. ソースを置く
ZIPを展開する。`afterlight-app/package.json`がプロジェクトの起点。GitHubの新規非公開リポジトリへafterlight-app内のファイルを追加する。node_modules、.next、.local-db、.env.localは追加しない。`.gitignore`を同梱している。

## 2. PostgreSQLを用意
VercelのStorage/MarketplaceからPostgreSQLプロバイダーを接続するか、既存PostgreSQLを使う。アプリは標準のpgドライバーで接続する。Neon等のプール付き接続URLを利用できる。
DBの利用量・費用は選択したプランに依存。このパッケージが外部サービスや有料プランを作成することはない。

## 3. DBスキーマを適用
ローカルで次を実行。

```bash
npm ci
```

`.env.local`を作成し、選んだDBの接続URLを`DATABASE_URL`に設定。例のホストやパスワードをそのまま使わず、プロバイダーの実接続文字列を使う。

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

```bash
npm run db:migrate
```

成功すると「schema version 1 applied」と表示。スキーマはIF NOT EXISTS付きなので再実行可能。実運用で将来のスキーマ変更を行う際はバージョンを追加した移行が必要。既存の独自テーブルと名前が衝突するDBへは適用せず、このゲーム専用DBまたはschemaを用意する。

## 4. VercelへImport
Vercel → Add New Project → GitHubリポジトリを選択。

|設定|値|
|---|---|
|Framework Preset|Next.js|
|Root Directory|package.jsonのあるディレクトリ。リポジトリ直下に中身を置いたなら`.`|
|Node.js|22以上（利用できるLTSを選択）|
|Install Command|npm ci|
|Build Command|npm run build|
|Output Directory|Next.jsの既定値。静的exportへ変更しない|

Environment Variablesに設定：

|名前|必須性|内容|
|---|---|---|
|DATABASE_URL|必須|適用済みPostgreSQLの接続URL。サーバー専用|
|APP_ORIGIN|推奨|公開URLのorigin。例 `https://YOUR-PROJECT.vercel.app`。末尾パスなし|

DB秘密値にNEXT_PUBLIC_を付けない。PreviewとProductionを分ける場合は対応する環境ごとにDB URLを設定する。`AFTERLIGHT_ALLOW_LOCAL_DB`と`LOCAL_DB_PATH`はVercelで設定しない。

## 5. 動作確認
Deploy後に公開URLを開く。`/api/health`で`status: ready`を確認する。
ゲスト開始→1戦→一括育成→10連→アカウント登録→別ブラウザでログインし進捗一致を確認。2アカウントでフレンド申請/承認、ギルド参加と寄付、アリーナを試す。
ガチャが通信中に途切れた場合は再同期し履歴を確認する。演出だけを理由に再抽選しない。

## よくある起動失敗
- ビルドは成功したがAPI503：DATABASE_URL未設定、接続不可、DBスキーマ未適用のいずれか。`/api/health`を確認。
- 更新API403：公開ドメインとAPP_ORIGINの不一致、別サイト経由、Originなしのリクエスト。画面内の操作はOriginを自動送信する。
- 409 STALE_VERSION：別タブ等で状態が変わった。画面は再同期し再操作を促す。古いリクエストを別キーで乱発しない。
- 移行が接続できない：プロバイダーの実URL、プール/SSL設定、アクセス権を確認。接続文字列を画面の公開コードへ入れない。

## 現在未実施の確認
このパッケージをユーザーのVercelへ実際にDeployしていない。外部PostgreSQLの接続・実端末でのE2E・長時間負荷・本編所要時間の実測は、公開環境を作った後に確認する。

## 参照した公式資料
- https://vercel.com/docs/postgres
- https://vercel.com/docs/environment-variables/manage-across-environments
- https://nextjs.org/docs/app/api-reference/file-conventions/route
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
- https://pglite.dev/docs/api
