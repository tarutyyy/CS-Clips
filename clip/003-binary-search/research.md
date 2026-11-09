# 裏取り

## 主張と出典
1. 二分探索は、ソート済みの配列で、探す値と範囲の真ん中の要素を比べ、値が真ん中より大きければ左半分（小さければ右半分）をまるごと候補から外し、残りの範囲で同じことを繰り返す。[^1][^2]
2. 先頭から順に見る方法（逐次探索・線形探索）は、目的の値が最後にあるか存在しない場合、n 個すべてと比べる（最悪 n 回）。[^1][^2]
3. 二分探索の比較回数は、最悪でも ⌊log2 n⌋ + 1 回。1 回の比較で範囲がおよそ半分になるため。[^1][^2]
   - n = 15 なら ⌊log2 15⌋ + 1 = 4 回。
   - n = 1,000,000 なら 2^19 = 524,288 ≤ n < 2^20 = 1,048,576 なので ⌊log2 n⌋ + 1 = 20 回。メモの「20回ほど」は正しい。
   - n を 2 倍にすると ⌊log2 n⌋ が 1 増えるので、最悪の比較回数は 1 回だけ増える。
4. 前提は配列がソート済みであること。Java の `Arrays.binarySearch` は「呼び出す前に配列はソートされていなければならない。ソートされていない場合、結果は未定義」と明記している。大小の比較で捨てる側を決めているため、並んでいないと正しい側を捨てられない。[^3][^2]
5. 添字で真ん中の要素に一定時間で到達できることが前提（ランダムアクセス）。連結リストでは真ん中に行くのに順にたどる必要がある。[^1] ※論点外のため台本では使わない。

## メモとの食い違い
- なし。メモの「最悪 log2(n) 回くらい」「100万個で20回ほど」は主張 3 と一致する。

## 動画で単純化する点と、その正当性
- 「比べる」を 1 回と数える。実装では 1 回の比較で「等しい／小さい／大きい」を判定する（3 方向比較）と見なしている。Knuth の Algorithm B と同じ数え方で、⌊log2 n⌋ + 1 の上界はこの数え方による。[^1]
- 「半分」は厳密には「真ん中を除いた半分（端数切り捨て）」。15 個 → 7 個 → 3 個 → 1 個。画面では箱を暗くして正確に見せるので、ナレーションの「半分」は嘘にならない。
- 例の配列（15 個、探す値 37）は説明用。37 が 4 回目に見つかる、最悪ケースの位置を選んでいる。
- 「100万個でも20回ほど」は最悪の回数。平均はそれより少し少ないが、「ほど」「でも」で上限として語る。
- 実装の細部（mid の計算、境界条件）は扱わない。

## 出典
[^1]: Donald E. Knuth, *The Art of Computer Programming, Vol. 3: Sorting and Searching*, 2nd ed., §6.1 "Sequential Searching", §6.2.1 "Searching an Ordered Table"（Algorithm B: Binary search、比較回数の最大は ⌊lg N⌋ + 1）
[^2]: Wikipedia, "Binary search"（"Binary search runs in logarithmic time in the worst case, making O(log n) comparisons"、最悪 ⌊log2(n)+1⌋ 回、線形探索との比較）. https://en.wikipedia.org/wiki/Binary_search （2026-11-09 アクセス）
[^3]: Oracle, Java SE 21 API, `java.util.Arrays.binarySearch(int[] a, int key)`: "The array must be sorted (as by the sort(int[]) method) prior to making this call. If it is not sorted, the results are undefined." https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html （2026-11-09 アクセス）
