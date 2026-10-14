# 実装とデータ整合性

## Vercel構成
Next.jsの画面は静的生成、APIはNode.jsサーバーレス関数。本番はDATABASE_URLのPostgreSQL、開発はPGlite。全機能の実装はTypeScriptで完結し、別のASP.NETサーバーは不要。前回の参照DDLは元設計として残し、今回使用するDDLはsrc/lib/schema.ts / db/schema.sql。

## 認証
9桁プレイヤーIDは公開検索用。認証は32バイト乱数のセッショントークンをHttpOnly Cookieへ保存する。DBにはSHA-256ハッシュのみ、30日有効、SameSite=Lax、本番Secure。パスワードはランダムsalt付きscrypt、平文をDB・台帳・応答に記録しない。ゲスト登録時は同じplayer_idへhandle/password_hashを追加し、その進捗を維持する。
公開ログインIDとパスワードだけの認証。メール・外部OAuth・パスワード再発行は実装していない。

## 状態保存
accountsとplayer_stateを分け、player_stateはJSONBへゲーム集約を保存。ガチャ履歴、操作キー、台帳、フレンド、ギルド、対戦記録、セッションは独立テーブル。JSONBは任意のクライアント状態を受け付けない。クライアントは操作と対象だけを送り、サーバーが状態を更新する。

## 更新と二重送信
1. Cookie認証とDBレート制限。
2. player_stateをFOR UPDATEでロック。
3. 同じIdempotency-Keyがあればrequest_hashを比較し同じ保存応答を返す。
4. expectedVersionを比較。
5. 所有・素材・対象・期限・ゲージ等を検証。
6. 計算結果と状態版、履歴、台帳、操作応答を同一transactionでcommit。

1リクエストの途中失敗は全体rollback。更新を端末保存と同期させる構成ではない。UIは金銭的変更を成功前に楽観確定しない。通信エラー時は同じbody/キーで1回再送し、確定結果を再取得。キーを変えて再抽選はしない。

## 戦闘
出撃時に自軍能力・敵編成・seedを固定。保存済みbattleへID＋seq＋行動者＋対象＋行動種別を送り、サーバーが実行。通常/必殺/防御、未行動とHP、ゲージ、seq、期限を検査。全員行動後の敵ターンも同じ処理で確定。終了と報酬は同時保存。
敵には章ごとの反撃、封印ゲージ減少、根の継続ダメージ、回復、鏡の強化ギミック。画面に次の単体/全体予告を表示。仲間は5役割ごとに回復・防御・支援・ブレイク・範囲攻撃の必殺を持つ。

## ガチャ
サーバーCSPRNG。R3人 / SR4人 / SSR4人。抽選は3%→22%→75%、10枠目のRのみSRへ変換。SSR未獲得80の次の枠をSSRにする。天井は10連の保証より優先。新規はunit付与、重複は継承片。maxRarityとupgradeは抽選時に保存。演出中のタップは結果を変えない。履歴はDBでは全件、ゲーム画面は最新50件。

## 交流
friendshipsは順序付けたUUIDペアをUNIQUEにして双方承認。承認時は両accountsをID順にロックして100人上限の競合を防ぐ。blockは関係を削除し申請とアリーナ候補を抑止。
ギルドjoinはguild行をロックし30人上限を検査。寄付は自分の星鉱消費と週ポイントを同時更新。報酬はplayer×weekでUNIQUEなので退会/再入会でも同週二重取りはできない。退会局長は参加日時順に後任へ委譲。
アリーナは相手5人の能力を固定したサーバーAI。レベル50、覚醒1、スキル5、武具無効で数値を正規化。役割・別人生選択は残す。両accountsをID順にロックし、rating更新とrating_appliedを一度だけ確定。途中撤退は敗北扱い。

## 初期運用の限界
player_stateを一人ずつロックするため一人の同時操作は直列化する。PGlite側は一プロセスのtransactionを直列化し混線を防ぐ。商用規模の同接性能と外部PostgreSQLは未計測。
operationsの応答は再送復帰のため保存する。長期運用では保持期間を設定して古いoperations・期限切れsessions・rate_limits・guild_messagesを定期整理する運用ジョブが必要。台帳・gacha履歴・対戦記録は別の保持方針を決めて管理する。本版にはその運用ジョブ・管理画面を含めない。

## PWA
manifestでホーム画面追加と縦持ち表示を指定する。Service Workerは公開画像/フォントのみキャッシュし、通信切断時のページへ案内する。オフラインでのゲーム進行はしない。ゲームAPIはキャッシュせずno-storeなので、古い所持状態をオフラインで書き戻さない。

## v0.3の追加実装
GameStateにbossClears/trialClears/storyRead/echoesを追加。DBのmigration version 2はJSONBの左側に初期値を結合し、既存の右側の値を優先する。読込と古い操作応答でも既定値を補う。
支援は出撃時にfriendsとblocksを検査し、相手のsupport設定と能力を固定。攻撃力は自軍平均の1.6倍、HPは1.4倍までに補正。一戦一回、seqと期限を検査し、通常の味方行動は消費しない。
ボスと試練の解放・編成条件はサーバーで検査。初回報酬と状態更新は同じtransaction。PvPの支援は許可しない。
残響武具のorigin属性はサーバーの製作処理のみが設定。JSON操作で任意の武具能力を受け付けない。
