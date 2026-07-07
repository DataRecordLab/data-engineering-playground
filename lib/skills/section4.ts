import type { SkillSection } from '@/types';

export const SECTION_TOOLS: SkillSection = {
  id: 'tool-selection',
  title: 'ツール選択',
  description: '状況に応じて最適なデータエンジニアリングツールを選べるようになる',
  icon: '🔧',
  accent: '#06B6D4',
  bg: '#020e14',
  lessons: [

    // ── Lesson 1: オーケストレーション ──────────────────────────────────
    {
      id: 'orchestration',
      title: 'オーケストレーション選択',
      description: 'Airflow・Step Functions・Prefect・Dagster の使い分けを判断する',
      icon: '🔀',
      xpReward: 60,
      concept: {
        title: 'DAGでパイプラインの依存関係を管理する',
        body: 'オーケストレーションツールは、複数のタスクを定義した順序で実行し、失敗時に再実行する役割を担います。\n\nAirflow・Prefect・Dagster はOSSの主要ツールです。AWS環境なら Step Functions も有力な選択肢です。チームのスキル・既存インフラ・スケール要件によって最適解が変わります。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】ECサイトの分析基盤で、毎晩100本以上のSQLが複雑な依存関係で実行される。チームはPythonが得意で、パイプラインをコードで管理したい。どのツールが最適？`,
          options: [
            { label: 'Apache Airflow — DAGをPythonで定義でき、複雑な依存関係管理に強い', correct: true },
            { label: 'AWS Step Functions — シンプルだがPythonコードで依存関係を表現しにくい', correct: false },
            { label: 'cron — シンプルだが依存関係管理が手動になり破綻する', correct: false },
            { label: 'GitHub Actions — CI/CDツールでありデータパイプライン向きではない', correct: false },
          ],
          explanation: 'Airflowは「コードとしてのDAG」が最大の強み。100本以上の複雑な依存関係をPythonで表現・可視化・管理できます。小規模・シンプルなパイプラインではオーバースペックですが、大規模バッチ処理では定番の選択肢です。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】AWSネイティブ環境で、S3にファイルが到着したらLambdaで変換→Glueでカタログ更新→RDSにロードする3ステップのシンプルなパイプライン。インフラ管理コストを最小化したい。`,
          options: [
            { label: 'AWS Step Functions — AWSサービス統合がシームレスでサーバーレス運用できる', correct: true },
            { label: 'Airflow — 強力だがサーバー管理が発生しこのシンプルさでは過剰', correct: false },
            { label: 'Prefect Cloud — 優れているがAWSネイティブ統合ではStep Functionsが勝る', correct: false },
            { label: 'cron + Lambda — 依存関係の待機制御が難しくエラーハンドリングが複雑になる', correct: false },
          ],
          explanation: 'Step FunctionsはAWSサービス間の連携に最適化されており、サーバーレスでインフラ管理不要。Lambda・Glue・ECS・SageMakerなどをJSONまたはYAMLで宣言的に繋げます。逆にAWS外部サービスが多い、Python定義が必要な場合はAirflowが向いています。',
        },
        {
          id: 'q3',
          type: 'multiple_choice',
          question: `【シナリオ】3人のスタートアップデータチーム。Airflowを使っていたが、サーバー管理・バージョンアップ・プラグイン競合に時間を取られている。Python-nativeでクラウド管理オプションがあるモダンな代替ツールを探している。`,
          options: [
            { label: 'Prefect または Dagster — Python-nativeでUI・管理サーバーのクラウド版がある', correct: true },
            { label: 'Step Functions — AWSネイティブだがPython-nativeではなく表現力が限られる', correct: false },
            { label: 'Luigi — 古いツールでAirflowより管理が面倒', correct: false },
            { label: 'dbt — 変換ツールであり、オーケストレーションツールではない', correct: false },
          ],
          explanation: 'Prefect・Dagsterはモダンなオーケストレーターで、Python関数を直接タスクとして定義できます。Prefect CloudやDagster Cloudを使えばサーバー管理が不要。小〜中規模チームのAirflow移行先として急速に採用が増えています。',
        },
        {
          id: 'q4',
          type: 'true_false',
          question: 'Airflowは「スケジューラー」であり「実行エンジン」ではないため、Sparkジョブ・dbt・Pythonスクリプトなど様々な処理を orchestrate（調整）するだけで、処理の中身自体は別の場所で動く。',
          correct: true,
          explanation: '✓ 重要な設計上の理解です。AirflowはDAGの順序制御・スケジューリング・依存関係管理を担います。実際のSQLはdbt/BigQuery、Sparkジョブはクラスター、Pythonスクリプトはコンテナで実行。Airflowは「指揮者」であり「演奏者」ではありません。',
        },
        {
          id: 'q5',
          type: 'multiple_choice',
          question: `【シナリオ】パイプラインの一部タスクが失敗したとき、最初から全て再実行するのではなく「失敗したタスクから再開」したい。この要件を満たせるツールはどれか？`,
          options: [
            { label: 'Airflow・Prefect・Dagster — いずれもタスク単位の再実行（partial rerun）をサポート', correct: true },
            { label: 'cron — ジョブ全体を再実行するしかない', correct: false },
            { label: 'Step Functions のみ — 他のツールにはこの機能がない', correct: false },
            { label: 'GitHub Actions のみ — ワークフロー再実行機能は GHA 独自', correct: false },
          ],
          explanation: 'モダンなオーケストレーターはタスクレベルの再実行が可能です。Airflowでは「Clear Tasks」で失敗タスクのみ再試行、Prefectは「Re-run from failed task」、DagsterはAsset Materialization単位で再実行できます。これがcronとの決定的な差です。',
        },
        {
          id: 'q6',
          type: 'ordering',
          question: 'オーケストレーションツールの選定プロセスを正しい順序に並べてください。',
          items: [
            'チームのスキルセット・クラウド環境を確認する',
            'パイプラインの複雑さ（依存関係・本数）を把握する',
            'インフラ管理コストの許容度を決める',
            '候補ツールをPoC（概念実証）で評価する',
          ],
          correctOrder: [1, 0, 2, 3],
          explanation: 'まずパイプラインの規模・複雑さを把握し（何をオーケストレートするか）、チーム環境（AWS/GCP/Azure、Python力）を確認、運用コスト許容度を判断したうえでPoCに進むのが定石です。ツールを先に決めてから要件を当てはめるのは失敗のパターン。',
        },
      ],
    },

    // ── Lesson 2: データ取り込みツール ───────────────────────────────────
    {
      id: 'ingestion',
      title: 'データ取り込みツール選択',
      description: 'Fivetran・Airbyte・Kafka・CDCの使い分けを判断する',
      icon: '📥',
      xpReward: 60,
      concept: {
        title: 'ソースからDWHへデータを運ぶ',
        body: 'データ取り込みツールはソースシステムからDWHへのデータ転送を自動化します。\n\nFivetran・Airbyte はコネクタが豊富でノーコードで使えるマネージドサービスです。リアルタイム性が必要な場合は Kafka・Kinesis のようなストリーミング、または CDC（Change Data Capture）を活用します。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】Salesforce・HubSpot・Stripeなど複数のSaaS から毎日データを取り込んでBigQueryに集約したい。データエンジニアが2人しかいないため、コネクタの開発・保守コストを最小化したい。`,
          options: [
            { label: 'Fivetran または Airbyte — 既製コネクタが豊富で開発不要、保守もベンダー側', correct: true },
            { label: 'カスタムPythonスクリプト — 柔軟だが全APIの保守が2人では現実的でない', correct: false },
            { label: 'Apache Kafka — リアルタイム向きでSaaS取り込みのユースケースに対してオーバースペック', correct: false },
            { label: 'AWS Glue — SaaS APIへの対応コネクタが限られる', correct: false },
          ],
          explanation: 'Fivetran/Airbyteは「マネージドコネクタ」が強みで、Salesforce・HubSpot・Stripe等200〜500以上のSaaSに対応。APIの仕様変更があってもベンダーがコネクタを更新します。小チームではコネクタ保守より分析価値創出に時間を使うべきです。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】ECサイトのRDS（PostgreSQL）でユーザーの注文・決済・ステータス変更が毎秒数百件発生する。分析チームはこの変更を10秒以内に把握してリアルタイムダッシュボードに反映したい。`,
          options: [
            { label: 'CDC（Change Data Capture）+ Kafka — DBの変更ログをリアルタイムで捕捉してストリーム配信', correct: true },
            { label: 'バッチSQLで5分ごとに差分取得 — 10秒以内の要件を満たせない', correct: false },
            { label: 'Fivetran — SaaS向けコネクタは優秀だが秒単位のリアルタイム同期は不向き', correct: false },
            { label: 'APIポーリング — サーバー負荷が高く大量の変更を取りこぼす可能性がある', correct: false },
          ],
          explanation: 'CDCはDBのトランザクションログ（WAL）を読み取り、INSERTやUPDATEをイベントとして捕捉します。Debeziumが定番のCDCツールで、Kafkaと組み合わせてダウンストリームに配信。バッチより圧倒的に低レイテンシで、DBへの追加負荷も最小限です。',
        },
        {
          id: 'q3',
          type: 'true_false',
          question: 'FivetranとAirbyteの最大の違いは「Airbyteはオープンソースでセルフホスト可能」であり、コネクタのカスタマイズが必要な場合はAirbyteが選ばれやすい。',
          correct: true,
          explanation: '✓ Fivetranはフルマネージド（SaaS専用）で信頼性が高い一方、コスト高め。Airbyteはオープンソースなのでセルフホスト可能でコスト削減できますが、運用負担が発生。またAirbyteはカスタムコネクタを自作しやすく、内製APIへの対応が必要な場合に強いです。',
        },
        {
          id: 'q4',
          type: 'multiple_choice',
          question: `【シナリオ】マイクロサービスが10個あり、それぞれが注文・在庫・ユーザーイベントを発行する。これらを集約して複数のコンシューマー（データウェアハウス・通知サービス・機械学習パイプライン）に配信したい。`,
          options: [
            { label: 'Apache Kafka — pub/subモデルで複数コンシューマーへの配信、高スループット、ログ保持に優れる', correct: true },
            { label: 'Fivetran — コンシューマーへの配信よりSaaSからの取り込みに特化', correct: false },
            { label: 'REST API直接通信 — コンシューマーが増えるたびにマイクロサービス間の結合が爆発的に増える', correct: false },
            { label: 'AWS S3 + cron — 秒単位の配信が必要な場面では遅延が許容できない', correct: false },
          ],
          explanation: 'Kafkaはイベントストリーミング基盤の定番で「1対多配信」が得意です。1つのトピックに複数のコンシューマーグループが独立して購読でき、メッセージを最大7日間（デフォルト）保持するためコンシューマーが一時ダウンしてもキャッチアップできます。',
        },
        {
          id: 'q5',
          type: 'multiple_choice',
          question: `【シナリオ】社内のオンプレDB（Oracle）から毎日全件抽出してSnowflakeにロードしている。テーブルが5000万行あり、毎日の全件ロードに4時間かかっている。改善策は？`,
          options: [
            { label: '差分抽出（Incremental Load）に切り替える — 更新日時カラムで前日以降の変更分のみ取得', correct: true },
            { label: 'サーバーをスケールアップして全件ロードを高速化する — コスト高で根本解決ではない', correct: false },
            { label: 'ロード頻度を週1回に下げる — データの鮮度が落ちビジネス価値が損なわれる', correct: false },
            { label: 'Kafkaを導入してリアルタイム化する — 大規模改修が必要でオーバーエンジニアリングの可能性', correct: false },
          ],
          explanation: '全件ロード（Full Load）は変更が少ないのに毎回全データを転送する非効率なパターンです。updated_atやcreated_atカラムを使って「前回実行以降に変更されたレコードのみ」取得するIncremental Loadに切り替えることで、ロード時間を大幅削減できます。',
        },
      ],
    },

    // ── Lesson 3: データウェアハウス選択 ─────────────────────────────────
    {
      id: 'warehouse',
      title: 'データウェアハウス選択',
      description: 'BigQuery・Snowflake・Redshift・DuckDB の使い分けを判断する',
      icon: '🏭',
      xpReward: 50,
      concept: {
        title: 'ユースケースに合ったDWHを選ぶ',
        body: 'クラウド DWH は大規模データを高速に分析するためのデータベースです。\n\nBigQuery（GCP）・Snowflake・Redshift（AWS）がクラウド三強です。コスト構造・既存クラウド環境・チームのスキルセットで選択します。ローカル分析・テスト用途には DuckDB が最適です。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】GCPをメインクラウドとするスタートアップ。クエリ使用量が不定期で、月に数回しか大規模クエリを実行しない。常時起動のコンピュートコストを避けたい。`,
          options: [
            { label: 'BigQuery — サーバーレスでクエリ量課金（$5/TB）、使わない間コストゼロ', correct: true },
            { label: 'Redshift — 常時起動のクラスター課金でスポット利用には向かない', correct: false },
            { label: 'Snowflake — 優れているが最小クレジット消費があり完全アイドル無料にはならない', correct: false },
            { label: 'Aurora PostgreSQL — OLAPクエリには最適化されておらず大規模分析には遅い', correct: false },
          ],
          explanation: 'BigQueryはサーバーレスで「クエリを実行した分だけ課金」のモデル。常時起動クラスターが不要なため、使用量が少ない・不定期なチームに最適です。一方で大量クエリを毎日実行するチームはSnowflake/Redshiftのフラット料金の方が割安になることも。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】本社はAWS、海外子会社はAzureを使っている。データウェアハウスは一元化したいが、特定クラウドへの依存を避けたい。マルチクラウド対応が重要。`,
          options: [
            { label: 'Snowflake — AWS・GCP・Azure全てで動作し、クラウドに依存しない設計', correct: true },
            { label: 'Amazon Redshift — AWSネイティブでマルチクラウドには対応していない', correct: false },
            { label: 'BigQuery — GCPネイティブでAzure上では動作しない', correct: false },
            { label: 'Azure Synapse — Azureネイティブでマルチクラウドへの対応は弱い', correct: false },
          ],
          explanation: 'Snowflakeはマルチクラウドアーキテクチャが最大の差別化要素で、AWS/GCP/Azureのいずれかに同一のUIとSQLで接続できます。ストレージとコンピュートが完全分離されているため、クラウド間でデータを柔軟に扱えます。',
        },
        {
          id: 'q3',
          type: 'multiple_choice',
          question: `【シナリオ】データエンジニアがローカルでCSVファイル（2GB）を探索分析したい。Pythonを使いつつ、BigQueryやSnowflakeを立ち上げるまでもない軽い分析作業。`,
          options: [
            { label: 'DuckDB — インプロセスで動くOLAP、インストール不要でPythonやSQLで2GBを高速処理', correct: true },
            { label: 'BigQuery — クラウド接続が必要でローカルCSVの直接読み込みには手間がかかる', correct: false },
            { label: 'SQLite — OLTPエンジンでありGBスケールの分析クエリには遅い', correct: false },
            { label: 'Pandas DataFrame — 2GBはメモリを圧迫し、SQLでの集計が書きにくい', correct: false },
          ],
          explanation: 'DuckDBはローカルで動く高速OLAPエンジンで「データウェアハウスをラップトップに」という設計です。pip install duckdbだけで使え、CSVやParquet、Pandasデータフレームを直接SQLで操作できます。本番では大規模ウェアハウスを使いつつ、ローカル探索にDuckDBを組み合わせるパターンが増えています。',
        },
        {
          id: 'q4',
          type: 'true_false',
          question: 'Redshiftは「ストレージとコンピュートが分離されていない」ため、データが増えるとノードを追加する必要があり、SnowflakeやBigQueryと比べてスケールアップ・ダウンの柔軟性が低い。',
          correct: true,
          explanation: '✓ RedshiftはノードにデータをローカルストアするアーキテクチャのためStorage-Computeが結合されています（Redshift Serverlessは例外）。SnowflakeはStorage/Compute完全分離、BigQueryはサーバーレスで動的スケーリング。この構造の違いがコスト・運用の差として表れます。',
        },
        {
          id: 'q5',
          type: 'ordering',
          question: 'データウェアハウスの選定基準を、重要度の高い順に並べてください（一般的な優先度）。',
          items: [
            '既存クラウド環境・チームスキルとの親和性',
            'クエリパフォーマンス要件（SLA）',
            'コスト構造（定額 vs 従量課金）',
            'ベンダーエコシステム・コネクタの充実度',
          ],
          correctOrder: [0, 1, 2, 3],
          explanation: '「すでにGCPならBigQuery、AWSならRedshiftから始める」という既存環境との親和性が最優先。次にSLAを確認し、そのうえでコスト比較、エコシステムの順で検討するのが現実的な選定プロセスです。「最強ツール」より「チームが運用できるツール」が重要。',
        },
      ],
    },

    // ── Lesson 4: 変換ツール選択 ─────────────────────────────────────────
    {
      id: 'transform',
      title: '変換ツール選択',
      description: 'dbt・Spark・SQL・Pythonの使い分けを判断する',
      icon: '⚙️',
      xpReward: 60,
      concept: {
        title: 'SQL変換をどのツールで管理するか',
        body: '変換ツールは DWH 内のデータを加工・モデリングする役割を担います。\n\ndbt は SQL を使ってバージョン管理・テスト・ドキュメントを一元管理できる業界標準ツールです。大規模データには Spark、Pythonの柔軟性が必要な場合は Pandas も使われます。',
      },
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `【シナリオ】Snowflake上で毎日バッチでSQL変換を行っている。モデル間の依存関係管理、テスト自動化、ドキュメント生成を効率化したい。処理データは最大で日次500GB程度。`,
          options: [
            { label: 'dbt（data build tool）— SQLテンプレート・依存関係・テスト・ドキュメントを統合管理', correct: true },
            { label: 'Apache Spark — 分散処理エンジンでSQL変換の依存関係管理には別途ツールが必要', correct: false },
            { label: 'Pandas — インメモリ処理のため500GBは扱えない', correct: false },
            { label: 'Airflow — オーケストレーターであり変換ロジック自体は書けない', correct: false },
          ],
          explanation: 'dbtはウェアハウス上のSQL変換に特化したツールで「モデル定義・依存関係グラフ・テスト・ドキュメント自動生成」がセットになっています。Snowflake/BigQuery/Redshiftなどのウェアハウスに処理を委ねるため、500GB程度であれば十分対応できます。',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `【シナリオ】IoTセンサーが1分ごとに10万台から送信するデータ（日次で数TB）を集計してダッシュボードに反映したい。BigQuery単体のクエリでは実行時間が許容を超えている。`,
          options: [
            { label: 'Apache Spark（Databricks等）— 分散並列処理でTBスケールも高速に処理できる', correct: true },
            { label: 'dbt — SQLウェアハウスへの委譲なので数TBのJOINが遅いという同じ問題が残る', correct: false },
            { label: 'Pandas — シングルノードでTBスケールはメモリ不足で動作しない', correct: false },
            { label: 'cron + SQL — スケールしない、問題の本質を解決していない', correct: false },
          ],
          explanation: 'SparkはTB〜PBスケールの分散データ処理に強く、Databricks・EMR・Dataproc上で大量ノードを並列稼働させます。dbtはウェアハウスの処理能力に依存するため、ウェアハウス自体がボトルネックの場合には解決になりません。「dbt vs Spark」はデータ規模と処理の性質で使い分けます。',
        },
        {
          id: 'q3',
          type: 'true_false',
          question: 'dbtとSparkは競合するツールではなく、「dbtでウェアハウス内のSQL変換」+「SparkでTBスケール以上の前処理・機械学習特徴量生成」と組み合わせて使われることも多い。',
          correct: true,
          explanation: '✓ よくある組み合わせパターンは「Spark（Databricks）で大規模前処理・Feature Engineering → ウェアハウスに書き込み → dbtでビジネスロジック変換・マート作成」です。ツールは競合ではなく、データの規模・性質・用途によって役割を分担します。',
        },
        {
          id: 'q4',
          type: 'multiple_choice',
          question: `【シナリオ】dbtでモデルを100本管理している。あるモデルで「顧客の生涯購買額の平均」を計算したが、翌日から値が変わらなくなった。最初に確認すべきことは？`,
          options: [
            { label: 'dbt test を実行して上流モデルのデータ品質（NULL・重複）を確認する', correct: true },
            { label: 'Snowflakeを再起動する — ウェアハウスの問題ではなくデータの問題の可能性が高い', correct: false },
            { label: 'そのモデルのSQLを書き直す — 原因を特定せずに修正してもリスクが高い', correct: false },
            { label: 'Airflowのスケジュールを確認する — dbtの実行自体は成功しているケースが多い', correct: false },
          ],
          explanation: 'dbtのデバッグ鉄則は「データリネージを上流に遡ってdbt testで品質を確認すること」です。「値が変わらない」は上流のINSERTが止まっている・重複排除で全件消えているなどのデータ問題が原因であることが多い。SQLを触る前に、まずデータを疑う。',
        },
        {
          id: 'q5',
          type: 'multiple_choice',
          question: `【シナリオ】データエンジニア1人・データサイエンティスト2人のチーム。SQLは書けるがSparkは未経験。データは最大日次50GB。変換パイプラインを構築するなら？`,
          options: [
            { label: 'dbt + クラウドウェアハウス（BigQuery等）— チームスキルに合い50GBなら十分なパフォーマンス', correct: true },
            { label: 'Spark（Databricks）— 50GBには過剰スペックで学習コストが高い', correct: false },
            { label: 'Pandas — 50GBはメモリ依存で処理が不安定、本番環境としてリスクが高い', correct: false },
            { label: 'カスタムPython ETL — 車輪の再発明で依存関係管理・テストを自前で実装する必要がある', correct: false },
          ],
          explanation: '50GB以下であれば現代のクラウドウェアハウスは十分速い。チームが未経験のSparkを導入するより、SQLが書けるメンバーにとって学習曲線の緩やかなdbtを採用する方がROIが高い。エンジニアリングの選択は「最強ツール」ではなく「チームが使いこなせるツール」が正解です。',
        },
      ],
    },
  ],
};
