# API・サーバー設計

## 製品構成案
Unityクライアント → HTTPS REST API → ASP.NET Coreのゲームサービス → PostgreSQL。
Redisは短期のレート制限・セッション・ランキング候補キャッシュ、オブジェクトストレージ＋CDNは画像・音声・Addressables、ワーカーは週集計・メールボックス付与・対戦検証。最初は一つのアプリ内モジュール分割とし、決済・抽選・対戦を無理に別マイクロサービス化しない。
クライアントは画面・操作・演出・キャッシュを担当。抽選、所持数、育成費用、報酬、勝敗、対人順位はサーバーが権威を持つ。試作にはバックエンド実装を含まない。backend/openapi.jsonは開始点となる契約、schema.sqlは参照DDL。

## 認証とAPI規約
製品はゲスト作成→プラットフォームアカウントへ引継ぎ。短寿命access tokenとローテーションrefresh token。全API HTTPS、Authorization: Bearer。主語のplayer_idは認証から得てbodyの任意IDを信用しない。友人プロフィール以外の他人所持品を読めない。
金銭・所持品変更POSTにはIdempotency-Key必須。キーをplayer_id＋route＋request_hashに紐づけ、同じキー/同じbodyなら同じ応答、同じキー/違うbodyなら409。送信失敗時は同じキーで再送する。expected_versionで更新競合を検出し409後は状態再取得。
共通応答はrequest_id、server_time、data。エラーはcode、message、request_id、retryable、details。入力422、未認証401、権限403、不足409、期限切れ410、レート制限429、保守503。エラーの内部例外やSQLは公開しない。listはcursor＋limit、最大100。時間はUTC、週境界はAsia/Tokyoの月曜04:00をUTCへ変換して固定する。

## 主要ルート
|領域|ルート|主要処理|
|---|---|---|
|状態|GET /v1/me|通貨、進捗、素材、状態版|
|所持|GET /v1/units /v1/equipment|フィルタ付き所持一覧|
|強化|POST /v1/units/enhance-batch|単一トランザクションで選択体を強化|
|武具|POST /v1/equipment/enhance-batch|保護品を消費せず+20上限|
|編成|PUT /v1/parties/{party_id}|所有確認、5枠重複チェック|
|クエスト|GET /v1/quests|マスタ版とクリア状況|
|開始|POST /v1/battles|敵編成・乱数seed・マスタ版・有効期限を固定|
|行動|POST /v1/battles/{battle_id}/actions|seq順で自軍入力を検証、敵行動と差分を返す|
|結果|GET /v1/battles/{battle_id}|通信復帰、確定報酬を返す|
|召喚|GET /v1/gacha/banners|費用、個別確率、天井と保証|
|抽選|POST /v1/gacha/draws|通貨消費、抽選、所持・継承片、履歴を原子更新|
|復帰|GET /v1/gacha/draws/{draw_id}|同じ結果と演出情報|
|友人|GET /v1/friends; POST /v1/friends/requests|検索・申請・一覧|
|友人操作|POST /v1/friends/requests/{request_id}/accept|双方合意・上限・ブロック確認|
|ギルド|GET /v1/guilds/{guild_id}; POST /v1/guilds/{guild_id}/join|公開情報・申請|
|貢献|POST /v1/guilds/{guild_id}/contributions|週・所属・個人貢献・ノードを更新|
|対戦|GET /v1/arena/opponents; POST /v1/arena/matches|候補提示・スナップショット固定|
|順位|GET /v1/arena/ranking|週IDとカーソル|
|購入将来|POST /v1/purchases/verify|店舗側検証を通したreceiptのみ付与|

## 抽選トランザクション
BEGIN → idempotency行を確保 → walletとpityをSELECT FOR UPDATE → 有効banner/確率版を確認 → 残高確認 → CSPRNGによるサーバー抽選（各枠で天井→10連SR保証→通常抽選）→ wallet減算 → ledger追加 → drawとitemsを挿入 → 新規unitまたは継承片を付与 → pity更新 → 応答をidempotencyへ保存 → COMMIT。
天井とSR保証が同時ならSSRが優先。抽選前に固定したテーブルversionを結果へ記録する。通貨更新のwallet.versionも返す。ROLLBACK時は付与も減算も残らない。単なる画面のアニメーションで取引を開始しない。

## 戦闘・アリーナ
PvEはサーバーが行動列を順に計算。1リクエストで最大5行動を送信できる。PvPも同ロジックの正規化モードで計算し、敵AIと乱数列をサーバー内で確定。seq UNIQUEにより再送を二重実行しない。各入力で行動者所有・生存・未行動・ゲージ・対象を検査。battle終了と初回クリア報酬を同トランザクションで付与する。
対戦開始では両者のunits/equipment/AI設定をJSONスナップショットに固定。rating updateはmatch_idを一意にして一度だけ。アリーナ中のスキル変更やシーズン切替に耐えるためbalance_versionを保持する。

## 運営と保守
告知、メンテ、配布、確率変更は監査付き管理画面で行う。banner公開前に率合計100%、期間の重複、価格、天井引継ぎを自動チェック。DBはバックアップ＋復元訓練、復元後に通貨台帳差分と購入receiptの一意性を確認する。障害時は抽選・購入だけを停止できる機能フラグを持つ。ログにaccess token、receipt全文、個人情報を出さない。

## 初期性能予算（設計目標）
読み取りp95 300ms、育成/抽選p95 800ms（ネットワークを除く）。想定同時接続1000人から負荷試験し、SLOは実測で決める。Battle actionsとwallet変更はplayer単位で競合を限定する。画像は初回最小セット、章ごとの差分配信。起動から操作まで5秒目標、60fps目標・低性能端末30fpsモード。
