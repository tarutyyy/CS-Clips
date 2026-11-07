# 裏取り

## 主張と出典
1. 配列は添字（番号）が分かれば、その要素に直接（一定時間で）アクセスできる。ハッシュテーブルはこの「直接アクセス」を、キーから計算した番号で使う一般化である。[^1]
2. ハッシュ関数はキーを、箱（バケット / スロット）の番号に変換する。格納も検索も同じ計算で同じ箱を指す。[^1][^3]
3. 箱の数（m）より取りうるキーの種類のほうが多いので、異なる 2 つのキーが同じ番号になる「衝突」は避けられない（鳩の巣原理）。良いハッシュ関数は衝突を減らせるが、なくすことはできない。[^1] Wikipedia も、すべてのキーが別の箱に入る（完全ハッシュ）ことは、未知のデータに対しては保証できないとしている。[^3]
4. 衝突の解決法の一つがチェイン法：同じ箱に入ったキーをつないで（連結リストで）持つ。[^1]
5. 表が混んできたら箱を増やして入れ直す。Java の HashMap は、要素数が「負荷率 × 容量」を超えると、箱の数をおよそ 2 倍にして作り直す（rehash）。既定の負荷率は 0.75。[^2]
6. ハッシュ関数がキーを箱にうまく散らすことを前提に、get / put は一定時間で動く。[^2] 適切な大きさのハッシュテーブルでは、1 回の検索にかかる平均時間は格納された要素数によらない。[^3] 単純一様ハッシュの仮定のもと、チェイン法の検索は平均 Θ(1 + α)（α は負荷率）で、箱の数を要素数に比例させれば O(1)。[^1]

## メモとの食い違い
- メモ「ハッシュ関数が優秀なら、衝突は絶対に起きない。だから常に 1 回で見つかる」は誤り。衝突は避けられず（主張 3）、速さは「平均して」一定時間（主張 6）。最悪の場合は同じ箱に多くのキーが集まり遅くなる。台本では「衝突は避けられない → つないで入れる → 混んだら箱を増やす → 平均してほぼ一定」と正しく扱う。

## 動画で単純化する点と、その正当性
- 「apple → 3」「lemon → 3」の番号は説明用の例。実際のハッシュ値ではない。画面に「番号は説明用の例」と表示する。
- 衝突の解決はチェイン法だけ見せる。Python の dict などはオープンアドレス法（空いている別の箱を探す）を使うが、「衝突は起きる、それでも平均して速い」という一点は変わらない。[^1]
- 「ほぼ一定の時間」は平均の話。台詞で「平均して」と明示する。最悪計算量（全キーが同じ箱）には触れない。[^1][^2]
- ハッシュ値の計算コストは、キーの長さに比例するが、件数には依存しないので「件数によらない」は正しい。
- 箱は 7 個の模式図。

## 出典
[^1]: Cormen, Leiserson, Rivest, Stein, *Introduction to Algorithms*, 3rd ed., Chapter 11 "Hash Tables"（11.1 直接アドレス表、11.2 衝突は |U| > m なので避けられない・チェイン法・定理 11.1/11.2 の平均 Θ(1+α)、11.4 オープンアドレス法）
[^2]: Oracle, Java SE 21 API, `java.util.HashMap`. "This implementation provides constant-time performance for the basic operations (get and put), assuming the hash function disperses the elements properly among the buckets." / "...the hash table is rehashed ... so that the hash table has approximately twice the number of buckets." / default load factor (.75). https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html （2026-11-08 アクセス）
[^3]: Wikipedia, "Hash table"（"In a well-dimensioned hash table, the average time complexity for each lookup is independent of the number of elements stored in the table." 完全ハッシュは "impossible to guarantee for unseen given data"）. https://en.wikipedia.org/wiki/Hash_table （2026-11-08 アクセス）
