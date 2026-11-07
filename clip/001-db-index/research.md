# 裏取り

## 主張と出典
1. PostgreSQL の標準のインデックスは B 木（多分岐の平衡木）である。[^1]
2. 木の各階層のページは双方向リンクリストでつながっている（B+木の特徴）。[^1][^2]
3. 1 ノード（ページ）に入るキーの数＝ファンアウトが木の高さを決める。高さ ≒ ⌈log_ファンアウト(キー数)⌉。[^3]
4. ファンアウトが約 1,000 なら、10 億キーでも 3 段。ポイント検索は、木の 3 ページ＋データページ 1 ページの約 4 回の I/O。[^3]
5. 8KB ページの PostgreSQL では、実運用でも「3 つのインデックスページ＋1 つのデータページ」の計 4 回の読み取りで 1 行を取得できる実測例がある（pgbench, 数十万行）。[^4]
6. インデックスがなければ、条件に合う行を探すには全行を調べる（全件走査）ことになる。[^3]

## 動画で単純化する点と、その正当性
- 「4 回ページを読む」：木の 3 段＋データページ 1 回。実際はファンアウトやキー長で 3〜5 段になりうるため、動画では「3〜4 段」と幅を持たせる。[^3][^4]
- 「全行を 1 億回調べる」：最悪の場合の話。ページ単位で読むため、実際の I/O はページ数だが、「調べる行数」としては正しい。動画では「最悪」と明示する。
- ノード内の比較（二分探索）は省略。段数が支配的という説明で、嘘にはならない。[^3]
- 「B+木」と「B 木」は区別しない。多くの DB が使うのは B+木系で、PostgreSQL 自身は Lehman–Yao 型の B+木の実装。[^1][^2]

## 出典
[^1]: PostgreSQL Documentation 16, "67.1. Introduction"（B-tree）. https://www.postgresql.org/docs/16/btree-intro.html （2026-11-07 アクセス）
[^2]: Wikibooks, "PostgreSQL/Index Btree"（階層ごとの双方向リンク、Lehman–Yao）. https://en.wikibooks.org/wiki/PostgreSQL/Index_Btree （2026-11-07 アクセス）
[^3]: Stanford CS145, "B+Tree Indexes"（ファンアウトと高さ、10 億行で 3 段、約 4 I/O）. https://cs145.stanford.edu/Module3B-Indexing/btree-indexes.html （2026-11-07 アクセス）
[^4]: pgconf.eu 2025, "Intro to btree and lsm"（pgbench の 4 reads: 3 index pages + 1 data page）. https://www.postgresql.eu/events/pgconfeu2025/sessions/session/7045/slides/763/ （2026-11-07 アクセス）

※ [^3] は教材、[^4] は講演スライド。公式ドキュメントの範囲では「多分岐の平衡木」までしか確認できていないので、具体的な段数は教科書・講演の値を「目安」として使う。
