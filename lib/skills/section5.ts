import type { SkillSection } from '@/types';

export const SECTION_ARCH: SkillSection = {
  id: 'arch-decisions',
  title: 'アーキテクチャ判断',
  description: 'データエンジニアとして現場で求められる設計・意思決定力を鍛える',
  icon: '🧠',
  accent: '#F59E0B',
  bg: '#130c00',
  lessons: [

    // ── Lesson 1: バッチ vs ストリーミング ──────────────────────────────
    {
      id: 'batch-vs-streaming',
      title: 'バッチ vs ストリーミング',
      description: '状況に応じてバッチ処理とリアルタイム処理を正しく使い分ける',
      icon: '⚡',
      xpReward: 60,
      concept: {
        title: 'データをいつ処理するかの設計判断',
        body: 'バッチ処理は定期実行（毎日・毎時）、ストリーミングはイベント発生時にリアルタイムで処理します。\n\nリアルタイム性は魅力的ですが、コスト・運用複雑さが格段に上がります。「本当にリアルタイムが必要か？」を問い直すと、多くのユースケースはバッチで十分です。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】ECサイトの「前日の売上日報」を毎朝9時に経営陣にSlackで送りたい。処理データは数百万行のオーダー履歴。どのアーキテクチャが適切？`,
          options: [
            { label: 'バッチ処理（毎朝8時にSQLを実行してレポート生成）— 要件に完全に合致', correct: true },
            { label: 'リアルタイムストリーミング — 「前日の日報」に秒単位の鮮度は不要、コスト過剰', correct: false },
            { label: 'マイクロバッチ（5分毎）— 日報なら毎日1回で十分', correct: false },
            { label: 'Kafkaによるイベントドリブン — 日次集計にはオーバーエンジニアリング', correct: false },
          ],
          explanation: 'バッチ処理は「決まった時間に決まった量のデータを処理する」シンプルで堅牢なアーキテクチャです。日次・週次レポートのように遅延が許容される場合、コストと複雑さの面でバッチが最適解。「リアルタイムが良い」という思い込みは危険で、要件に合った選択が重要です。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】フードデリバリーアプリで、ユーザーが注文を確定した瞬間に「近くの配達員に通知」「在庫を減らす」「決済を処理」する必要がある。`,
          options: [
            { label: 'リアルタイムストリーミング（Kafka + Stream Processing）— 秒以下のレイテンシが必須', correct: true },
            { label: '1分毎のマイクロバッチ — 1分の遅延で配達員通知が遅くなりビジネスに支障', correct: false },
            { label: '毎時バッチ — 注文後1時間待つのはビジネス的に不可能', correct: false },
            { label: '非同期メール通知のみ — リアルタイム在庫・決済の要件を満たせない', correct: false },
          ],
          explanation: 'リアルタイムストリーミングが必須な判断基準は「遅延がビジネスに直接損失をもたらすか」です。配達通知・不正検知・在庫更新は「秒単位の遅延が許容できない」ユースケース。逆に許容できる場合はバッチで十分。技術的に難しいストリーミングを安易に選ぶと複雑性とコストが急増します。',
        },
        {
          id: 'q3',
          type: 'true_false',
          question: 'リアルタイムストリーミングはバッチ処理より常に優れているため、新しいシステム設計では積極的にストリーミングを選ぶべきだ。',
          correct: false,
          explanation: '✗ ストリーミングはバッチより「複雑・高コスト・運用負荷が高い」という現実があります。Netflixの推薦エンジンや不正検知など真にリアルタイムが必要な場合のみ正当化されます。多くのビジネス要件は5分〜1時間のバッチで十分対応可能。技術的なかっこよさではなく要件で決める。',
        },
        {
          id: 'q4',
          type: 'multiple_choice',
          question: `【シナリオ】Webサイトのアクセスログ（毎秒5,000行）をリアルタイム集計して管理画面に「現在のページビュー数」を表示したい。データ基盤チームは3人でKafka未経験。`,
          options: [
            { label: 'マイクロバッチ（30秒〜1分ごとに集計）— 「現在のPV」に数十秒の遅延は許容範囲内', correct: true },
            { label: 'Kafka + Apache Flink — 未経験での導入は学習コスト・運用リスクが非常に高い', correct: false },
            { label: '毎日夜間バッチ — リアルタイム表示の要件を満たせない', correct: false },
            { label: 'APIポーリング（1秒ごと）— DBへの高負荷でサービス本体に影響が出る可能性', correct: false },
          ],
          explanation: '「リアルタイム」という言葉に厳密な定義はなく、多くの場合30秒〜1分の遅延で「実質リアルタイム」と感じてもらえます。マイクロバッチはバッチの技術資産でリアルタイムに近い体験を提供でき、チームのスキルセットにも合致。「正確なリアルタイム」が本当に必要か要件を深掘りすることが大切です。',
        },
        {
          id: 'q5',
          type: 'ordering',
          question: 'バッチかストリーミングかを選定する思考プロセスを正しい順序に並べてください。',
          items: [
            'チームの技術スキルと運用コストを評価する',
            'ビジネス要件上の「許容遅延」を明確にする',
            'データ量と処理頻度を見積もる',
            'アーキテクチャを選定してPoCで検証する',
          ],
          correctOrder: [1, 2, 0, 3],
          explanation: '最初に「何秒・何分の遅延まで許容できるか」をビジネスオーナーと合意するのが出発点。次にデータ量を把握し（量が少なければバッチで十分なことも）、チームスキルを踏まえて選定・PoCへ。許容遅延を確認せずにストリーミングを選ぶのは典型的なオーバーエンジニアリングの始まりです。',
        },
      ],
    },

    // ── Lesson 2: テーブル設計・パーティション ───────────────────────────
    {
      id: 'partition-design',
      title: 'テーブル設計とパーティション',
      description: '大規模テーブルの設計判断と最適化手法を理解する',
      icon: '📊',
      xpReward: 60,
      concept: {
        title: 'クエリコストを劇的に下げる設計',
        body: 'BigQuery・Snowflakeなどはクエリがスキャンしたデータ量に応じて課金されます。\n\n日付カラムでパーティションを設定すると WHERE date = \'2024-01-01\' のクエリは全データではなく当日分のみをスキャンします。パーティション設計はコストとパフォーマンスに直結する重要な設計判断です。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】BigQueryに日次で1億行が追加される注文テーブルがある。分析クエリは常に「特定の日付範囲（WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31'）」で絞り込まれる。最適なパーティション設計は？`,
          options: [
            { label: 'order_dateでDAY分割パーティション — 日付フィルタで不要なパーティションをスキップできる', correct: true },
            { label: 'パーティションなし — 毎クエリで全データをスキャンしコストと時間が爆発する', correct: false },
            { label: 'user_idでハッシュパーティション — 日付フィルタの最適化にならない', correct: false },
            { label: 'order_amountでRANGEパーティション — 日付絞り込みには効果なし', correct: false },
          ],
          explanation: 'パーティションプルーニングは「クエリのWHERE条件に合わせてパーティションキーを選ぶ」のが鉄則です。日付範囲でフィルタするなら日付でパーティション分割。これでBigQueryは対象パーティションのみスキャンし、コストを最大99%削減できます。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】Snowflakeの注文テーブル（5億行）でクエリが遅い。分析チームは常に「WHERE region = 'Asia' AND product_category = 'Electronics'」で絞り込んでいる。パーティション以外の最適化手法は？`,
          options: [
            { label: 'クラスタリングキーを region, product_category に設定する — 頻繁な絞り込み列に合わせて物理ソート', correct: true },
            { label: 'テーブルを全部インメモリにキャッシュする — Snowflakeはキャッシュ管理がほぼ自動', correct: false },
            { label: 'テーブルを地域ごとに手動分割する — 管理が複雑になり横断クエリが困難になる', correct: false },
            { label: 'クエリに LIMIT 100 を付ける — 集計クエリでは意味をなさない', correct: false },
          ],
          explanation: 'Snowflakeのクラスタリングキーは「よく絞り込まれる列」でデータを物理的に並べ替えます。同じ値のデータが同じマイクロパーティションに集まるため、フィルタ時のスキャン量が激減。BigQueryのパーティションに近い概念ですが、クラスタリングは連続した空間をまとめる設計です。',
        },
        {
          id: 'q3',
          type: 'true_false',
          question: 'ファクトテーブルは「粒度（Granularity）を1行1トランザクション」で設計するのが基本原則であり、後から粒度を変更するのはダウンストリームへの影響が大きく困難。',
          correct: true,
          explanation: '✓ ファクトテーブルの粒度は設計時に最も重要な意思決定です。粒度を「1注文1行」で設計した後に「1商品1行」に変えると、下流の全ダッシュボード・dbtモデル・レポートに影響します。粒度を細かく保つ（最小単位）方が集計の柔軟性が高く、後から粗くすることは容易です。',
        },
        {
          id: 'q4',
          type: 'multiple_choice',
          question: `【シナリオ】過去3年分のログデータが1テーブルに30億行ある。90%のクエリは直近3ヶ月のデータしか見ない。コストと速度を最適化したい。`,
          options: [
            { label: 'ホット/コールドストレージ分離 — 直近3ヶ月はホットテーブル、それ以前はアーカイブに移動', correct: true },
            { label: 'インデックスを全カラムに追加する — OLAPウェアハウスはインデックス設計とは別の最適化が有効', correct: false },
            { label: '30億行を全部削除して再ロードする — 過去データが失われる、根本解決ではない', correct: false },
            { label: 'クエリタイムアウトを延ばす — 問題を先送りにしているだけ', correct: false },
          ],
          explanation: 'ホット/コールド分離（Tiered Storage）は大規模データの定番最適化パターンです。BigQueryのpartition expirationやSnowflakeのStorage Tierを活用して古いデータを低コストストレージに移動しつつ、クエリは直近の高頻度データに集中させます。',
        },
        {
          id: 'q5',
          type: 'multiple_choice',
          question: `【シナリオ】dbtでWHERE条件なしの全件スキャンクエリがCIで通っている。本番でこのモデルが毎日実行されるとどんな問題が発生するか？`,
          options: [
            { label: 'クエリコストが日々増大し、テーブルが成長するほど実行時間・コストが線形に増える', correct: true },
            { label: '特に問題はない — ウェアハウスが自動最適化してくれる', correct: false },
            { label: 'CIでエラーになるはずなので本番には届かない', correct: false },
            { label: '最初の1回だけ遅く、以降はキャッシュが効く', correct: false },
          ],
          explanation: '全件スキャンは「技術的負債のタイムボム」です。最初は気づかなくても、データが1億行・10億行と増えるにつれコストと時間が爆発します。dbt modelにはincremental化またはWHERE条件でのフィルタを設計段階から組み込み、dbt testやコストアラートで監視することが重要です。',
        },
      ],
    },

    // ── Lesson 3: スキーマ変更対応 ───────────────────────────────────────
    {
      id: 'schema-evolution',
      title: 'スキーマ変更対応',
      description: '本番データパイプラインでのスキーマ変更を安全に扱う',
      icon: '🔄',
      xpReward: 50,
      concept: {
        title: 'ソースの変更がパイプラインを壊さないようにする',
        body: 'ソースシステムがカラムを追加・削除・型変更した場合、パイプラインが壊れることがあります。\n\n後方互換性のある変更（カラム追加）と互換性のない変更（型変更・カラム削除）を区別し、それぞれへの対応戦略を事前に設計することが重要です。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】本番のfact_ordersテーブルに「discount_amount（割引額）」カラムを追加したい。ダウンストリームにdbtモデルが30本ある。最も安全な手順は？`,
          options: [
            { label: 'NULLABLEカラムとして追加 → 動作確認 → 後からNOT NULL制約を追加する', correct: true },
            { label: 'NOT NULL制約付きで即座に追加する — 既存のINSERTが全て失敗するリスク', correct: false },
            { label: 'テーブルを削除して再作成する — ダウンタイムとデータ損失が発生', correct: false },
            { label: 'ダウンストリームを全て修正してからカラムを追加する — 順序が逆、デプロイが複雑になる', correct: false },
          ],
          explanation: 'スキーマ変更の鉄則は「後方互換性を保ちながら段階的に変更する」です。NULLABLEで追加すれば既存のINSERTは失敗せず、ダウンストリームもNULLとして受け取れます。データが揃った後にNOT NULL制約やデフォルト値を追加するフェーズ分割が安全です。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】APIから取得するJSONにある日突然新しいキーが追加された。Stagingレイヤーで「SELECT * FROM source」をしていたらどうなるか？`,
          options: [
            { label: '新しいカラムが自動的に追加されてダウンストリームモデルが意図しない挙動をする可能性', correct: true },
            { label: '新しいキーは無視されてデータに変化はない', correct: false },
            { label: 'パイプラインが即座にエラーになって気づける', correct: false },
            { label: 'SELECT * は常に安全でスキーマ変更に強い設計', correct: false },
          ],
          explanation: 'SELECT * はスキーマドリフト（意図しないスキーマ変化）に脆弱です。ソースに新カラムが追加されるとダウンストリームに予期せず伝播し、dbtモデルやBIツールで「カラムが増えた・消えた」という問題が発生します。本番では必要なカラムを明示的にSELECTし、スキーマ変更を検知するテストを設けることが重要です。',
        },
        {
          id: 'q3',
          type: 'true_false',
          question: 'カラムのデータ型変更（例: INTEGER → BIGINT）はカラム追加と比べて後方互換性への影響が小さいため、ダウンストリームへの確認なしに実施して良い。',
          correct: false,
          explanation: '✗ 型変更は「破壊的変更」に分類されます。INTEGER → BIGINTはキャストで対応できるケースもありますが、STRING → INTEGERや精度変更はダウンストリームのSQL・BI・機械学習モデルで型エラー・精度損失が発生します。型変更は必ず影響範囲をリネージで確認し、ダウンストリームチームに事前通知が必要です。',
        },
        {
          id: 'q4',
          type: 'multiple_choice',
          question: `【シナリオ】SCD Type 2（Slowly Changing Dimension）を使って顧客の住所変更履歴を保持したい。顧客が住所を変更した際に古いレコードを上書きせずに追跡する方法は？`,
          options: [
            { label: '古いレコードにis_current=false・valid_to日付をセットし、新レコードをINSERTする', correct: true },
            { label: '既存レコードのaddressカラムを上書きUPDATEする — 変更前の住所が失われる（SCD Type 1）', correct: false },
            { label: '変更履歴をJSONカラムに全て詰め込む — 検索・集計が困難になる', correct: false },
            { label: '別ログテーブルに変更前の値だけ保存する — 現在値と履歴の管理が複雑になる', correct: false },
          ],
          explanation: 'SCD Type 2は「履歴を全て保持する最も一般的な方法」で、is_current（現在レコードフラグ）・valid_from・valid_toカラムで管理します。dbtのsnapshot機能がこれを自動化してくれます。「どの時点の顧客住所か」を正確に再現できるため、過去の注文分析に欠かせない設計です。',
        },
        {
          id: 'q5',
          type: 'multiple_choice',
          question: `【シナリオ】毎日本番テーブルにdbtのモデルが追加・変更される。スキーマ変更によるデータ品質劣化をリリース前に検知したい。最も効果的な仕組みは？`,
          options: [
            { label: 'dbt test + CI/CDパイプラインで毎PRに自動テストを実行する', correct: true },
            { label: '週1回手動でデータを目視確認する — 人的ミスが多く変更頻度に追いつけない', correct: false },
            { label: '本番環境でのみテストを実行する — 問題がユーザーに届いてから発覚する', correct: false },
            { label: 'スキーマ変更は一切禁止にする — ビジネス要件に対応できなくなる', correct: false },
          ],
          explanation: 'dbt testをCIに組み込み「PRのたびに自動でnot_null・unique・accepted_valuesなどのテストを実行」する仕組みが業界標準です。本番へのマージ前に品質劣化を検知でき、データ信頼性を保ちながら高速にリリースできます。「テストは本番で」という意識は事故のもとです。',
        },
      ],
    },

    // ── Lesson 4: 信頼性・冪等性設計 ─────────────────────────────────────
    {
      id: 'reliability',
      title: '信頼性と冪等性設計',
      description: 'パイプライン障害に強い設計パターンを身につける',
      icon: '🛡️',
      xpReward: 60,
      concept: {
        title: '失敗しても安全に再実行できる設計',
        body: '冪等性とは「何度実行しても同じ結果になる」性質です。\n\nINSERT ではなく MERGE/UPSERT を使うことで、重複データを発生させずに再実行できます。バックフィル（過去データの再処理）を安全に行えるよう設計することで、障害時の復旧が劇的に楽になります。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】毎日データをロードするパイプラインで、途中で失敗して再実行したら「同じデータが2回ロードされた」。この問題の根本原因は？`,
          options: [
            { label: '冪等性（Idempotency）が設計されていない — 何度実行しても結果が同じにならない', correct: true },
            { label: 'リトライ回数が少なすぎる — 再試行の問題ではなく設計の問題', correct: false },
            { label: 'ネットワークが不安定だった — ネットワーク問題は症状であり設計の欠如が根本原因', correct: false },
            { label: 'Airflowのバグ — ほとんどの場合ツールではなく設計の問題', correct: false },
          ],
          explanation: '冪等性とは「同じ操作を何度実行しても結果が変わらない性質」です。INSERTを繰り返すと重複が発生しますが、UPSERT（INSERT OR REPLACE）や「対象日のデータを削除→INSERT」という設計にすれば何度実行しても同じ結果になります。本番パイプラインは「必ず失敗する」前提で冪等に設計することが鉄則です。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】外部APIの呼び出しが一時的に失敗することがある。パイプラインを止めずに自動回復させたい。どのリトライ戦略が適切？`,
          options: [
            { label: 'Exponential Backoff（指数バックオフ）— 1秒→2秒→4秒と間隔を広げてリトライ', correct: true },
            { label: '1秒間隔で100回リトライする — APIサーバーへの過負荷でDDoSになりかねない', correct: false },
            { label: 'エラーを無視してスキップする — データ欠損が発生し下流に影響', correct: false },
            { label: '即座に1000回リトライする — APIのレートリミットに抵触してBANされる可能性', correct: false },
          ],
          explanation: 'Exponential Backoffは「リトライのたびに待機時間を指数的に増加させる」標準的なリトライ戦略です。一時的な障害（ネットワーク輻輳、APIの過負荷）は時間を置くと自然に回復することが多く、間隔を広げることでサーバーへの追加負荷も防ぎます。さらにJitter（ランダム揺らぎ）を加えると複数クライアントの同時リトライ集中を防げます。',
        },
        {
          id: 'q3',
          type: 'true_false',
          question: '「At-least-once delivery（少なくとも1回配信）」を保証するメッセージングシステムでは、コンシューマー側で重複排除（Deduplication）の設計が必要になる。',
          correct: true,
          explanation: '✓ KafkaやSQSのAt-least-onceは「必ず1回以上届くが、重複する可能性がある」という保証です。コンシューマーが重複を許容できない（例: 決済処理）場合はメッセージIDによる重複排除か、Exactly-once semantics（Kafka Transactions）が必要です。仕組みの保証レベルを理解して設計することが重要。',
        },
        {
          id: 'q4',
          type: 'multiple_choice',
          question: `【シナリオ】日次バッチで「昨日のデータ」を処理するパイプラインが、週末にサーバーダウンで金・土・日と3日分未処理になった。月曜に一括リカバリする最良の方法は？`,
          options: [
            { label: 'バックフィル（Backfill）— 対象日付を指定して過去分を順次再実行する', correct: true },
            { label: '3日分を一度に全て混ぜてロードする — 日付ごとの集計が崩れる', correct: false },
            { label: '金・土のデータは諦めて日曜分だけロードする — データ欠損が恒久的に残る', correct: false },
            { label: '月曜のデータで金〜日を推定補完する — 正確性が失われビジネス判断に影響', correct: false },
          ],
          explanation: 'バックフィルはオーケストレーターの重要機能で「過去の特定日付を指定して順番に再実行」します。Airflowでは`execution_date`パラメータでDAGが正しく設計されていれば、金→土→日の順でバックフィルが実行できます。冪等設計があって初めてバックフィルが安全に動きます。',
        },
        {
          id: 'q5',
          type: 'multiple_choice',
          question: `【シナリオ】本番データパイプラインが3時間以上停止したらオンコールエンジニアに通知したい。最も実践的な監視設計は？`,
          options: [
            { label: 'SLAアラート — 「3時間以内に完了しなかったら」という条件でSlack/PagerDutyに通知', correct: true },
            { label: 'ログを毎分手動で確認する — 運用コストが高く深夜対応が困難', correct: false },
            { label: 'エラーが起きたら誰かが気づくはずと期待する — 障害検知が遅れビジネス影響が拡大', correct: false },
            { label: 'サーバーのCPU使用率を監視する — パイプラインの停止と直接相関しない', correct: false },
          ],
          explanation: 'データパイプラインの監視は「SLA（完了期限）」ベースが効果的です。AirflowのSLA miss callback、Datadog/Grafanaのカスタムアラート、Monte Carlo/Re-dataなどのデータ品質監視ツールを組み合わせます。「エラーが出たら通知」だけでなく「決まった時間に完了しなければ通知」という時間ベースの監視が実務では重要。',
        },
      ],
    },

    // ── Lesson 5: コスト最適化 ───────────────────────────────────────────
    {
      id: 'cost-optimization',
      title: 'コスト最適化の判断',
      description: 'データ基盤のクラウドコストを賢く最適化する思考を身につける',
      icon: '💰',
      xpReward: 50,
      concept: {
        title: 'クラウドDWHのコストをコントロールする',
        body: 'クラウド DWH の費用はクエリのデータスキャン量と保存容量に比例します。\n\n不必要な SELECT * を避ける、パーティションを活用してスキャン範囲を絞る、マテリアライズドビューで頻繁に使うクエリをキャッシュする——これらの習慣がコストを大きく下げます。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】BigQueryの月次請求が急増した。調査したらBIツールからの「SELECT * FROM fact_orders」（フルスキャン・100GB）が1日1,000回実行されていた。最優先の対策は？`,
          options: [
            { label: 'BIツールの接続をマテリアライズドビュー経由に変更して、クエリ結果をキャッシュする', correct: true },
            { label: 'BigQueryのプロジェクトを削除して新しく作り直す — コスト発生源を理解せずに逃げている', correct: false },
            { label: 'BIツールの使用を禁止する — ビジネス価値を毀損する本末転倒な対策', correct: false },
            { label: 'サーバーをスケールアップして処理を高速化する — コストを増やすだけで問題解決にならない', correct: false },
          ],
          explanation: 'マテリアライズドビューはクエリ結果を事前に計算・キャッシュするため、同じフルスキャンクエリが1,000回走っても実スキャンは激減します。BigQueryはテーブルスキャンに課金するため「同じ大きなクエリを何度も実行させない」設計が最大のコスト削減です。BI用の集計済みmartテーブルを作りそちらに向けることも有効。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】Snowflakeで分析チームが複雑なクエリを実行するのに使うウェアハウス（コンピュート）がアイドル時間も常時起動している。月のコストを下げたい。`,
          options: [
            { label: 'Auto-suspend を設定して一定時間アイドルで自動停止、クエリ時に自動起動させる', correct: true },
            { label: 'ウェアハウスをXL以上にスケールアップして処理を速くする — コストが増える', correct: false },
            { label: 'クエリ実行を全て深夜に強制する — 分析チームの生産性を著しく下げる', correct: false },
            { label: 'Snowflakeから他のサービスに乗り換える — 問題の本質はSnowflake自体ではなく設定', correct: false },
          ],
          explanation: 'Snowflakeはコンピュートの「起動中」に課金されます。Auto-suspend（デフォルト10分）を短く設定し、クエリが来たら自動起動させる設定が基本のコスト管理です。さらにクエリパターンに応じて「分析チーム用・ロードジョブ用・BI用」でウェアハウスを分離し、それぞれ最小サイズで運用することも有効です。',
        },
        {
          id: 'q3',
          type: 'true_false',
          question: 'データウェアハウスのコスト最適化において、データを圧縮・カラムナ形式（Parquet・ORC）で保存することはストレージとクエリコストの両方を削減できる。',
          correct: true,
          explanation: '✓ カラムナ形式はクエリで必要なカラムだけ読むため、行形式と比べてI/O量が劇的に減少します。BigQueryのネイティブ形式・Snowflakeの自動圧縮・S3のParquetなど、現代のデータ基盤はカラムナ形式が前提です。RedshiftのEncode・BigQueryのパーティション+クラスタリングと組み合わせると更に効果的。',
        },
        {
          id: 'q4',
          type: 'multiple_choice',
          question: `【シナリオ】S3に保存された3年分のログデータ（50TB）のうち、90%は直近6ヶ月より古く、年に数回しかアクセスされない。月次コストを下げる最良の方法は？`,
          options: [
            { label: 'S3のLifecycle Policyで古いデータをS3 Glacierに自動移行する', correct: true },
            { label: '古いデータを全て削除する — コンプライアンスや後からの分析ニーズに対応できなくなる', correct: false },
            { label: 'EBSボリュームに移動する — ブロックストレージはS3より高コスト', correct: false },
            { label: 'データを圧縮のみで対応する — アクセス頻度による料金差の方がはるかに大きい', correct: false },
          ],
          explanation: 'S3はストレージクラスによって料金が大きく変わります。S3 Standard（頻繁アクセス）→ S3 Infrequent Access（月1回以下）→ S3 Glacier（年数回）と段階的に移行することでコストを最大95%削減できます。Lifecycle Policyで「180日経過したらGlacierへ自動移行」などを設定するだけで自動化できます。',
        },
        {
          id: 'q5',
          type: 'ordering',
          question: 'データ基盤のコスト最適化に取り組む際の優先順位を正しい順序に並べてください。',
          items: [
            'クエリのフルスキャンをパーティション活用で削減する',
            'コスト上位のリソースを可視化・特定する（BigQuery: cost per query, Snowflake: query history）',
            'アイドルコンピュートリソースを自動停止させる',
            '古いデータを安価なストレージ階層に移行する',
          ],
          correctOrder: [1, 0, 2, 3],
          explanation: 'コスト最適化は「何にお金がかかっているか」の可視化から始めます。原因不明なまま対策しても効果が不明確です。次に最も高いクエリコスト（スキャン量）を削減し、アイドルコンピュートを削減、最後にストレージ最適化の順が一般的に効果大→小の順です。',
        },
      ],
    },
  ],
};
