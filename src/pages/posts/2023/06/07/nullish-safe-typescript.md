---
layout: "../../../../../layouts/BlogPostLayout.astro"
title: "nullとundefinedを祓う技術 / TypeScript 4.1"
tags: [TypeScript, JavaScript]
synopsis: TypeScriptを使ってNull安全を手に入れよう
---

「[Null 安全でない言語は、もはやレガシー言語だ](https://qiita.com/koher/items/e4835bd429b88809ab33)」と言われたのが 2016 年の終わり……いまこの記事を仕上げている 2023 年 6 月から見れば 6 年半が経つわけですが、みなさんいかがお過ごしでしょうか？Null 安全してますか？それともこの変化の激しい IT 業界においてレガシー呼ばわりされて 6 年も経過している Null 安全でない言語を使って `undefined is not a function` とか `Cannot read property 'foo' of undefined` みたいな実行時エラーに頭を悩ませているのでしょうか？6 年間で ECMAScript の数字がいくつ上がったかご存知ですか？6 年間で TypeScript の機能がどれくらい増えてどれくらい便利になったか把握できていますか？

TypeScript を導入する最大の利点は **静的型検査** によって型エラーを実行前に検知できることです。静的型検査は「数値を受け取る関数にうっかり文字列を渡してしまう」ことや、「null や undefined が入っている変数にうっかりアクセスして実行時エラーが起こる」ことを阻止します。この 2 つの例のうち後者は **Null 安全** と呼ばれています。本質的に同じものをなぜ呼び分けているのかというと、JJava、C# (8.0 以前)、Go など、静的型付け言語であっても null や undefined といった **虚無値** に対する型チェックが貧弱な (Null 安全でない) ものが多く、Null の引き起こす実行時エラーが莫大な苦痛と損害を生み出してきたからです。現在の TypeScript は静的型付けで Null 安全な言語であり、null や undefined を含めて、型の不整合による実行時エラーを強力に防止することができます。

6 年間で TypeScript の Null 安全機能は大きく進歩してきました。本記事では 2023 年 6 月時点での最新版である TypeScript 5.2 で使える、null と undefined とうまく付き合っていくための言語機能を網羅的に紹介していきます。

# 読むのに必要な知識 / この記事で扱わない内容

- 基礎的な JavaScript の知識
  - ECMAScript 2015 程度
  - `let` `const` `() => {}` (アロー関数) などの機能を断りなく使います
  - わかんないことがあったら [JSPrimer](https://jsprimer.net) を読むといいと思います
- 静的型付け言語の基礎的な知識

TypeScript の動作を確かめたいときは Web 上で試せる [TypeScript Playground](https://typescriptlang.org/play/) をおすすめします。

## ソースコード中の絵文字について

- 「💥」は実行時エラーです。コードを実行すると `TypeError` などのエラーが発生します
  - 実際にプログラムを運用している最中に発生して異常終了等を招くので、プログラムを書く上では可能な限り避けたいものです
- 「❗」はコンパイルエラーです。TypeScript→JavaScript のトランスパイル時に `tsc` が出力します
  - 実際に運用する前に発生し、実行時エラーを事前に告知する役割があります

# Null とは

Java、Kotlin や C#では `null` と、Go では `nil` とよばれ、これらの言語では無効な参照を表しています。

# Null 安全とは

**Null チェック (値が Null でないことの確認) を強制** することで、Null (および nil, None などのいわゆる虚無値) による **実行時エラー** を起こさせない仕組みのことです。

「無効かもしれない値」を型で表現する、というアイデアは OCaml, Haskell, Elm といった関数型言語においてはそう新しいものではありません。それが最近では Swift, Rust, Kotlin, Dart といったイカしたマルチパラダイム言語に導入されて一躍注目されるようになったわけです。

JavaScript には `null` の他に `undefined` という虚無値があるので「Null/Undefined 安全」とか呼んだほうがいいかもしれませんが、長いので単に Null 安全と呼びます。

## ぬるぽ

大前提として、JavaScript では `null` `undefined` へのプロパティアクセスや関数としての呼び出しを試みると `TypeError` が発生します。Java のぬるぽ (`java.lang.NullPointerException`) に相当します。

```js:JavaScript
const str = null;
str.toUpperCase();
// 💥 TypeError: Cannot read property 'toUpperCase' of null
```

:::message
`null` `undefined` のプロパティにアクセスした場合は `TypeError` になりますが、演算子を使ったり関数の引数に使ったりした場合は必ずしもそうとは限りません。`null` `undefined` で挙動に差があることもあり、たとえば `Number(undefined)` は `NaN` を返しますが `Number(null)` は `0` を返します。
:::

## 静的型付けだけど Null 安全じゃない

TypeScript で変数 `str` に `string` という型注釈をつけると、 `number` などの関係ない型の値を代入することは不可能になります。Null 安全とかは関係なく、静的型付け言語としては当たり前の挙動です。これで型エラーにならなかったら静的型の意味がないです。

```ts:Null安全じゃないTypeScript
const str: string = 42;
// ❗ Type 'number' is not assignable to type 'string'. (2322)
```

ですが、**Null 安全でない** 状態では、`string` 型の変数に `null` `undefined` を代入することができます。**できてしまいます**。`null` や `undefined` が変数に入った状態でメソッドを呼び出したらどうなるかはもはや言うまでもありません。

```ts
const str: string = null;
str.toUpperCase();
// 💥 TypeError: Cannot read property 'toUpperCase' of null
```

何が悪かったのかおわかりでしょうか。**`string` 型に `null` が代入可能であることが間違っている** のです。なぜなら `null` `undefined` は `toUpperCase()` といった `string` の機能が使えないからです。**`string` として使えないにもかかわらず`string` 型の一員として認められている** のです。これは Java などの非 Null 安全言語が犯している大きな過ちです。

:::message
`T` 型の値に `null` を代入できる、という壮大な誤りについては『[null 安全を誤解している人達へのメッセージ - Qiita](https://qiita.com/omochimetaru/items/ee29d4c6eb0d78f02b15#%E6%84%8F%E8%A6%8B-null%E5%AE%89%E5%85%A8%E3%81%8C%E3%81%9D%E3%82%93%E3%81%AA%E3%81%AB%E7%B4%A0%E6%99%B4%E3%82%89%E3%81%97%E3%81%84%E3%81%AA%E3%82%89%E3%81%9D%E3%81%AE%E5%8F%8D%E9%9D%A2%E9%AB%98%E3%81%84%E3%82%B3%E3%82%B9%E3%83%88%E3%81%8C%E3%81%82%E3%82%8B%E3%81%AF%E3%81%9A%E3%81%A0%E7%94%9F%E7%94%A3%E6%80%A7%E3%81%8C%E4%B8%8B%E3%81%8C%E3%82%8B%E3%81%AF%E3%81%9A%E3%81%A0)』が詳しいです (動的型付け言語の JavaScript とはあまり重ならない話もありますが)。
:::

## Null 安全を有効化する

それでは満を持して Null 安全を導入します。TypeScript では後方互換性の都合^[`strictNullChecks` は TypeScript 2.0 で導入されたもので、それまでの TypeScript は Java 同様 Null 安全でない言語でした。] で Null 安全を有効化するにはオプション `strictNullChecks` を有効化する必要があります。各種の厳格なチェックを有効化する `strict` にも含まれています。

オプションとは言っても、`tsc --init` で生成される tsconfig.json は `strict: true` なのでそのまま使うだけで Null 安全になります。フレームワークとかテンプレートによっては `strict: false` な `tsconfig.json` がデフォルトになってるのも存在はしますが、新規のプロジェクトなら `strict` を有効化して開発するとより型安全になるのでおすすめです。

なお、これらのコンパイラオプションは `tsc` コマンドのオプションとして指定することもできます。

```shell
tsc --strictNullChecks
```

`--strictNullChecks` を有効にし、**Null 安全になった** TypeScript で先程のコードを実行すると、型エラーになります。Null 安全な TypeScript では、`null` は `string` 型ではありませんから、`string` 型の変数に `null` を代入することはできません。この状態の `string` は null を含まないので **Null 非許容型** あるいは **Non-Nullable** と呼ばれます。

```ts
const str: string = null;
// ❗ Type 'null' is not assignable to type 'string'. (2322)
str.toUpperCase();
```

`str` に `null` を代入したいときは `null` との **Union 型** にします。Union 型は「`string` **または** `null`」と読み下すことができます。`string` 型の値、**または** `null` を割り当てることができる型です。`null` を許容するので **Null 許容型** 、あるいは **Nullable** とも呼びます。

```ts
const str: string | null = null;
str.toUpperCase();
// ❗ Object is possibly 'null'. (2531)s
```

代入は問題なく行われましたが、`toUpperCase()` を呼び出そうとするとコンパイルエラーが発生します。`str` は `string` だけでなく `null` の可能性 (_possibly_) があります。`null` だった場合は先程の例のように実行時に `TypeError` が発生してしまいます。実行時エラーの可能性があるので、コンパイラは型チェックを通しません。

## null チェックをしよう

null による実行時エラーの可能性があるので型チェックが通らないのならば、**null でないことを確認し、実行時エラーの可能性をなくせば** 型チェックは通ってくれるわけです。`if` 文を使って Null チェックを行いましょう。

```ts
let str: string | null = null;

if (str !== null) {
  str.toUpperCase();
}
```

`str !== null` という条件により、`if` の中では `str` は `null` ではありません。TypeScript コンパイラ `tsc` はこのロジックを理解し、自動的に `str` の型 `string | null` から `null` を除去して `string` にします。VSCode で変数 `str` にマウスカーソルを載せてみるとよりわかりやすいと思います。

`null` に関するエラーはコンパイル時にチェックされ、実行時されるより前の段階で未然に防がれました。これが Null 安全です。

# Nullish を知る

前述したように JavaScript は珍しい言語で、虚無値が 2 つあります。`null` と `undefined` です。この 2 つをあわせて呼ぶ呼び方として、ぜんぜん普及していませんが **Nullish** という言葉を使います。これは `null` と `undefined` をうまく処理するための演算子 「Nullish Coalescing Operator」 に由来していますが、日本語訳が「Null 合体演算子」となっているので微妙に伝わりづらいのが悩みの種です。

## Null

`null` は値がないことを示すプリミティブ値です。`undefined` と異なり、関数の返り値として現れることはあっても JavaScript の構文から自然発生することはありません。

たとえば ECMAScript の `String.prototype.match()` や DOM API の `document.querySelector()` は `null` を返します。言語に依存しない API では null が使われることが多いです。

## Undefined とその出現場所

未定義であることを示す値です。`null` と違い `undefined` は JavaScript の構文から勝手に誕生することが多く、予期しないエラーはこちらで起こりやすいです。

`undefined` が出現するのは以下のような場面です。

- 宣言されているが初期化されていない変数
- オブジェクトの存在しないプロパティ
- 関数の省略された引数
- 何も返さない関数の返り値
- `void` 演算子
- Optional Chaining で nullish にアクセス

# TypeScript は Nullable をユニオン型で表現する

Kotlin や Swift では Nullable 型を `int?` というように `?` で書きますが、TypeScript では **Union 型** を使って `T | null` というように書きます。

Union 型は合併型とも呼ばれ、`A | B` 型は「`A` 型か `B` 型」という意味をもちます。`number | null` は数値か null なので、受け入れられる値は例えば `3.14` とか `42` とか `-Infinity` とか (`number`) と `null` です。

型は値の集合と捉えることができます。`number` 型は IEEE 754 の 64 ビット浮動小数点数で表現できる数値の集合です。`null` 型は `null` 値 1 つだけを含む集合です。Union 型 `number | null` はこの 2 つを合わせたものです。なんだか和集合 $\cup$ っぽいですね。

![](https://storage.googleapis.com/zenn-user-upload/rs2qcg6kh5nv2i9j82exedzmdngh)

Union 型は Nullish のみならず `string | number` というような使い方も可能です。JavaScript は動的型付け言語であるため 1 つの変数や引数が複数の型をとることががしばしばあり、そのようなものも含めて Union 型なら適切に型をつけることができます。同じく動的型付けの Python に型をつけるときも Union が登場するみたいです。Python では Nullable に相当する `Optional[Foo]` は `Union[Foo, None]` と同じだそうです。

## `NonNullable<T>` でユニオン型から Nullish を除去する

既存の Nullable な型を変形して Nullable でない型にしたい、という場面はよくありますが、そんな時に便利なのが `NonNullable<T>` 型です。`NonNullable<T>` は `T` から `null` `undefined` を除去した型になります。

```ts
type Foo = number | null | undefined;
type NonNullFoo = NonNullable<Foo>;
// NonNullFoo = number
```

TypeScript に組み込みで用意されているので、TypeScript のコードなら明示的なインポートは不要でいつでもどこでも使うことができます。これは `lib.es5.d.ts` に定義することで実現されています。`lib.es5.d.ts` による `NonNullable<T>` の定義は以下です。VSCode や TypeScript Playground 上で `NonNullable` を Control-クリックして確認することもできます。

```ts:NonNullableの定義
type NonNullable<T> = T extends null | undefined ? never : T;
```

この型は TypeScript 2.8 で追加された Conditional Types を使っています。Conditional という名前が示すとおり、型レベルで条件分岐ができます。`T extends U ? X : Y` という構文で、`T` 型が `U` 型を満たしていたら `X` 型、そうでなかったら `Y` 型に解決されます。`NonNullable<T>` においては Union distribution という挙動を使っていい感じに Union 型から `null` `undefined` を除去しています。

型引数を受け取って新しい型を返す、という型を関数に見立てて **型関数** と呼ぶこともあるみたいです。個人的には関数型と紛らわしいので型関数ではなくユーティリティ型と呼ぶことが多いです。

Conditional Types そのものの使い方は覚えておかなくても大丈夫ですが、`NonNullable<T>` はとても便利なのでぜひ使っていきましょう。Union distribution を含めた Conditional Types の詳しい情報は以下の記事が参考になります。

[TypeScript 2.8 の Conditional Types について - Qiita](https://qiita.com/Quramy/items/b45711789605ef9f96de)

:::message
Conditional Types に限らず TypeScript の高度な型は便利なユーティリティ型を表現するための低レイヤーな API だと思っています。`NonNullable<T>` そのものを実装するのではなく、`NonNullable<T>` を作るための道具を実装することで、それを使って `NonNullable` 以外にもいろいろな型を書くことができるというわけです。実際に Conditional Types を使ったユーティリティ型には関数の引数の型をタプルの形で得られる `Parameters<T>`, 関数の返り値の型を得られる `ReturnType<T>` などがあります。
:::

### `DeepNonNullable<T>`

Conditional Types では再帰も行えるので、やろうと思えばオブジェクトから再帰的に Nullish を除去する型も書けますが、複雑になるためか TypeScript 標準には入っていません。[utility-types](https://github.com/piotrwitek/utility-types) や [ts-essentials](https://github.com/krzkaczor/ts-essentials) といったライブラリの `DeepNonNullable<T>` がよさそうです。

TypeScript 標準で入ってないほど複雑な型ということは扱いが困難であるということでもあります。関数の返り値などに設定するとまっとうな手段で型を合わせることが困難 (`as` が必要) になる場合があります。

# Null or Undefined?

あなたがなにか関数を書いていて、失敗を表現したいとします。JavaScript では一般的には `null` か `undefined` を返せばよさそうですが、それではどちらを使いますか？これはなかなか悩ましいですね。`null` と `undefined` の使い分けは開発者の間でも意見が分かれている問題です。

Facebook が主導する React では `null` と `undefined` は明確に区別されています。たとえばコンポーネントは `null` を返すことで「何も描画しない」ことを示せますが、undefined を返すことはできません。型定義上でも禁止されていますし、実行時にもエラーが発生します。

```tsx
const Valid: React.FC = () => null;
const Invalid: React.FC = () => undefined; // ❗ Type 'undefined' is not assignable to type 'ReactElement<any, any> | null'.(2322)
```

Microsoft が中心になっている TypeScript コンパイラそのもの ([microsoft/TypeScript](https://github.com/microsoft/typescript)) の開発では `undefined` のみを使っています ([Coding guidelines - microsoft/TypeScript](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines#null-and-undefined))。ただしあくまで TypeScript コンパイラでのガイドラインであり、TypeScript の開発陣としてこれを推奨しているわけではなく、ましてや「TypeScript を使った開発ではこのガイドラインに従え」ということでは決してないので、あなたがあなたのプロジェクトでどう使うかは自由です。それを理解できなかった人がたくさんいたらしく、ガイドラインの最初にはこのことが `<h1>` のクソデカ太字で 2 回も書いてあります。

null と undefined の 2 つの使い分けが便利な場合もあります。

```ts
const map = new Map<string, number | null>();

const foo = map.get("foo"); // foo: number | null | undefined

switch (foo) {
  case null: {
    console.log("値がない");
    break;
  }
  case undefined: {
    console.log("フィールドがない");
    break;
  }
}
```

この例ではハッシュマップ `map` に格納されているデータ自体は `number | null` です。その値を取得する `get()` メソッドは指定したキーが存在しないとき `undefined` を返します。これにより、`null` はデータ上での `null`、`undefined` は値の取得時にキーが存在しない、という別個のものを表しています。

## `Nullable<T>` 型はどこ？ `number?` って書けないのはなんで？

`NonNullable<T>` はありますが `Nullable<T>` というような型はありません。さきほど説明したとおり、プロジェクトによって `null` 使わないとか `undefined` 使わないといった宗派があるからです。そして `Nullable<T>` については `T | null` のほうが短いです。

`number?` と書けないのも同様の理由によるものと思われます。それに型中での `?` は現状すでに Conditional Types が使っているのでパースがつらそうです。また `P | Q?` はおそらく `P | Q | null | undefined` と等価になるでしょうが、これは `P | Q[]` が `P | Array<Q>` になるのと異なっていて混乱の種になると筆者は考えます。

https://github.com/Microsoft/TypeScript/issues/23477

Nullable のネスト可否は Null 安全言語の間でも仕様が違うところで、ざっくり言うと代数的データ型で実現してる言語はネストできますがそれ以外では不可能な場合が多いです。TypeScript は説明したとおり Union なのでネスト不可能ですが、オブジェクト型とかを駆使して代数的データ型っぽいのを模倣し、ネストできる Option データ構造を作れます。これは本筋とあまり関係がないので後で触れます。

本記事中では `null` のほうを多用しているように見えるかもしれませんが、単純にスペルが長く手の動きが複雑で typo しやすい ~~`undefiend`~~ `undefined` を打つのをめんどくさがっているだけです。

# Union 型と制御フロー解析

Null 安全言語では Null を代入できる型 (Null 許容型) と Null を代入できない型 (Null 非許容型) を明確に区別します。Null 許容型は Null チェックを行ってはじめて Null 非許容型として扱えるようになります。これを言い換えれば Null 安全な言語には **コード中の Null チェックを発見して変数を適切な型に変更する** 機能が備わっているということになります。

TypeScript は `if` `switch` などの制御構造から Union 型の変数をより詳細な型に絞り込む機能 (**制御フロー解析**) を備えています。TypeScript の Nullable 型は `string | null | undefined` のような Union 型ですからもちろん制御フロー解析が働きますし、Nullable 以外の `string | number` のような Union 型にも同じように働きます。

代表的な Null チェックは上述したような `if` での比較です。

```ts:Nullチェックして文字列を順番反転して返す関数
function nullCheckReverse(str: string | null | undefined) {
  if (str !== null && str !== undefined) {
    return str.split("").reverse().join("");
  }
}
```

「null でも undefined でもない」という条件によって、`str.split` を呼び出すことができています。

ところでこの関数には返り値の型シグネチャがありませんが、返り値の型は何になるでしょうか？`if` の条件に合致した場合は `string` が返っていますが、null や undefined であった場合は `return` に到達しないまま関数が終わるので、返り値は `undefined` になります。したがってこの関数の返り値の型は `string | undefined` になります。

null と undefined をまとめて扱うのに いちいち `str !== null && str !== undefined` と書くのは面倒ですね。これを一気に書くショートハンドをご紹介します。

```ts:Nullチェックして文字列を順番反転して返す関数
function nullCheckReverse(str: string | null | undefined) {
  if (str != null) {
    return str.split("").reverse().join("");
  }
}
```

`if` の条件部分で非厳密不等価演算子 `!=` を使用しています。`if` の中で `str.split("")` ができていることからわかるように、**`str != null` は null または undefined でないとき true になります**。

非厳密等価演算子 `==` `!=` のガバガバな挙動は JavaScript の闇要素としてしばしばネタにされています。左右のオペランドで型が合わない場合 _親切にも_ 暗黙的な型変換を行ってから等価判定してくれるからです。普通はそんなおせっかいは不要なのでわざわざ 1 タイプ多い厳密等価演算子 `===` `!==` を打たねばならないのですが、null チェックの場合は厳密でないことが逆に便利で、具体的に言うと `null == undefined` が `true` になることを利用して nullish のチェックを簡単にできます。

```js
null == undefined; // => true
null === undefined; // => false
```

これは null と undefined を同時にチェックできる非常に重要なテクニックです。`==` `!=` を許さない ESLint の推奨設定でさえ null との比較だけは例外的に通してくれます。

## ガード節

ガード節 (guard clause) は `return` `throw` による脱出を使って条件分岐のネストを浅くするテクニックです。先程の関数 `nullCheckReverse` の例を上げてみましょう。あの関数は返り値の省略を行っていましたが、返り値を明示するとこのようになります。

```ts
function nullCheckReverse(str: string | null | undefined) {
  if (str != null) {
    return str.split("").reverse().join("");
  } else {
    return undefined;
  }
}
```

`if` がある分ネストが深く、異常値の処理が後回しになっているのであまり読みやすくありません。ここで、`str` が nullish だったら undefined を返して関数を終了するように書き換えます。

```ts
function nullCheckReverse(str: string | null | undefined) {
  if (str == null) return undefined;
  // ここより下では str: string
  return str.split("").reverse().join("");
}
```

異常値の処理を先に行うことで、本質的なロジックに集中できる環境が整いました。

三項演算子に書き換えられる程度の関数だと微妙ですが、`n` の Null チェック後が長い場合にとくに効果が高いです。

条件演算子 (三項演算子) を使うこともできます。

```ts
const nullCheckReverse = (str: string | null | undefined) =>
  str == null ? undefined : str.split("").reverse().join("");
```

## `throw` - nullish だったら例外を投げたい

`return` と同じように `throw` でエラーを投げ (ることで大域脱出を行っ) てもしっかり型推論されます。`return` との違いは

- 関数の外でも使える
- 返り値のことを考えなくてもよい
- `catch` しそこねるとアプリケーションがまるごと落ちる

の 3 つです。

```ts:数値の平方を返し、nullishだった場合はthrowする
const square = (n: number | null | undefined): number => {
  if (n == null) {
    throw new Error();
  }
  return n * n;
};
```

「実行時エラーが飛んでる時点で Null 安全でない状態とそう変わらないのでは？」と思われるかもしれませんが、「nullish だったらエラーが起きても構わない」状態に比べると「nullish だったら問答無用でエラーにする」 `throw` のほうが行儀はいいとも考えられます。算術演算など、nullish だったとしてもエラーが発生しない処理の場合ならなおさらです。

## ループや再帰 で Null チェック

あまり出番があるかはわかりませんが、ループを行う `while` `for` も条件分岐を含んでいるので制御フロー解析の対象になります。

*実践的な例*として数値の平方を返し、nullish を渡す不届き者には無限ループにより負荷をかける関数を定義します。

```ts:間違えてもプロダクションで使わないように
function square (n: number | undefined) {
  for (; n == null;);

  return n ** 2;
}
```

どんなループでも再帰に書き換えることが知られています。ループ構文に条件分岐が含まれていることを示すために、再帰による実装例も載せておきます。

```ts
function square(n: number | null | undefined): number {
  return n == null ? square(n) : n ** 2;
}
```

再帰が絡むと返り値が推論できなくなるので注釈を書いています。

冗談はともかくとして、`for` `while` を使った実用的な null チェックコードをご存知の方はどうぞコメントください。

## `never` を返す関数

TypeScript の `never` 型は値がない型です。集合で言うと空集合 $\emptyset$ に相当します。空集合は元が存在しない、つまり濃度 0 の集合で、それと同じように `never` 型の値は存在しません。変数が `never` 型になったらその部分のコードは実行されません。引数に `never` 型の値をとる関数は呼び出すことができません。`never` 型の値を返す関数は値を返しません。

`null` 型、`undefined` 型との混同にご注意ください。`null` 型は `null` 値、`undefined` 型は `undefined` 値、それぞれ 1 つだけの値をもつ型です。

たとえばある変数が `never` に制御フロー解析でキャストされたら、その部分のコードは **型システム上実行されることがありえない** ということを表しています。

```ts
(n: number) => {
  if (n == null) {
    // n: never
  }
};
```

`n` は絶対数値なのだから `n == null` が true になって if の中が実行されることはありえません。ありえないので never になっています。

never を返す関数は **関数が正常に終了して値を返すことがありえない** ことを表します。たとえば必ずエラーを投げる関数は呼び出されたら期待通りにエラーを投げ、呼び出し元に戻って `catch` に捕まるまで次々に関数を抜けていきます。正常終了して返り値をくれることはありえません。なので `never` が返り値にきます。

```ts
const panic = (e: unknown) => {
  throw e;
};
// panic: (e: unknown) => never
```

Node.js ではプログラムを終了するのに `process.exit()` が使えます。このメソッドも呼び出されたらプロセスが終了するので後続のコードは実行されません。したがって返り値は `never` です。

`never` は制御フロー解析に影響を与えることができます。たとえば Node.js で引数が足りないとき終了コード 1 でプロセスを終了させたいとします。

```ts
const argv1 = process.argv[1]; // (string | undefined)[]

if (argv1 == null) {
  console.error("Not enough arguments");
  process.exit(1); // ここでneverが返る => 後続のコードは実行されない
}

// ここ以降ではargv1: string
```

`process.exit(1)` でプロセスは終了コード 1 を返して終了するので後続の処理は実行されません。これは undefined である可能性を排除したことになります。結果的に下の方では `argv1` が `string` に推論されました。

# 値が nullish かを判別したい！

`if` や `switch` や条件演算子 `?:` を使って Null チェックする場合、条件部分に真偽値を入れなければいけません、じゃあどうやって nullish か否かを判定したものだろう、という話題です。

## `typeof` 演算子と歴史的経緯

`typeof 変数` は変数の型を表す文字列を返します。文字列と聞くと不安な気持ちになるかもしれませんが、`typeof` の返り値は `"string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function"` という文字列リテラル型の Union 型になっているのでうっかりタイポしたらちゃんと型が合わずエラーが出ます。

```ts
(n: number | string | undefined) => {
  switch (typeof n) {
    case "number": {
      // ここではnはnumber
    }
    case "string": {
      // ここではnはstring
    }
    default: {
      // ここではnはundefined
    }
  }
};
```

歴史的経緯により `typeof null === "object"` となることに注意してください。`if (typeof foo === "object")` でチェックすると `object | null` 型に推論されます。

> JavaScript の最初の実装では、JavaScript の値は型タグと値で表現されていました。オブジェクトの型タグは `0` で、`null` は NULL ポインター (ほとんどのプラットフォームで `0x00`) として表されていました。その結果、`null` はタグの型として `0` を持っていたため、`typeof` の戻り値は `"object"` です。([リファレンス](http://www.2ality.com/2013/10/typeof-null.html))
> ECMAScript の修正案が (オプトインを使用して) 提案されましたが、[却下されました](https://web.archive.org/web/20160331031419/http://wiki.ecmascript.org:80/doku.php?id=harmony:typeof_null)。それは `typeof null === 'null'` という結果になるものでした。

https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/typeof#typeof_null

## `instanceof` 演算子

`typeof` では `Function` 以外のオブジェクトは全て `'object'` になり (さらに `null` も混入してしまい) ますが、`foo instanceof Foo` なら適当なクラスのインスタンスであるかを確認できます^[厳密にはクラスじゃなくコンストラクタだと思います]。nullish はどのクラスのインスタンスでもないので null チェックになります。

```ts
const localeStr = (date?: Date) => {
  if (date instanceof Date) {
    date.toLocaleString("jp");
  }
};
```

## nullish は falsy だから/だけど

`null` `undefined` は **falsy** な値なので、真偽値に変換すると `false` になります。

```ts
Boolean(null); // => false
Boolean(undefined); // => false
```

falsy な値は boolean 型の `false`、number 型の `0` `-0` `NaN`、bigint 型の `0n`、string 型の `""`、そして `null` `undefined` の 8 つです。

https://developer.mozilla.org/ja/docs/Glossary/Falsy

オブジェクトは全て truthy なので、`function | undefined` や `Klass | null | undefined` といった `truthyな値しかない型 | null | undefined` の形をしたユニオン型は false だった時点で null か undefined と推論でき、条件式を少し短くできます。

```ts
declare const date: Date | null;

if (date) {
  date.toLocaleTimeString("ja"); // date: Date
}

// --------------------------

if (date != null) {
  date.toLocaleTimeString("ja"); // date: Date
}
```

ちょっと便利というか「JavaScript 理解ってる」感を演出できますが、前述したように falsy な値は null と undefined 以外にもあることに注意してください。number 型では `0` `-0` `NaN` が、string 型では `''` (空文字列) が、そして boolean 型では当然ですが `false` が falsy になるため、このショートハンドをうっかり使ってしまうと 0 や空文字列が来たときに Nullish 用の (つもりで書いた) コードが走ってしまいます。

```ts
const fn = (n: number | undefined) => {
  if (n) {
    return 2 + n;
  }
  throw new Error(`${n}`);
};

fn(0); // 💥 Error: 0
```

これでバグを埋め込むとちょっと恥ずかしいですね。ちなみに下側の行では `n` を `0 | undefined` ^[`NaN` も number 型かつ falsy ですが、[`NaN` にはリテラル型がない](https://github.com/microsoft/TypeScript/issues/15135) のでこのような不完全な推論になっています。] に推論しますから、マウスホバーすると出てくる型情報をちゃんと見れば気付けるかもしれません。

# カスタム型ガード

## `is` カスタム型ガード - Nullish かどうか判別する関数がほしい

いままで `foo != null` というような式を `if` などの条件に書いてきました。この処理は正攻法では関数に切り出すことができません。

```ts
const notNullish = (foo: unknown) => foo != null;

(str: string | null | undefined) => {
  if (notNullish(str)) {
    str.codePointAt(0); // ❗ Object is possibly 'null' or 'undefined'.(2533)
    //
  }
};
```

これは「関数の中身までチェックしていると推論が追いつかない」という、制御フロー解析の限界によるものです。推論が無理なので我々人間がコンパイラ様に畏れながら「この関数が `true` を返したなら `foo` は Nullish ではない」と明示してさしあげなければなりません。それが `is` です。関数の返り値の位置で `foo is T` という注釈を書き、`foo` が `T` 型であると扱ってほしいときは `true`、そうでないときは `false` を返します。

```ts
const notNullish = <T extends {}>(foo: T | null | undefined): foo is T =>
  foo != null; // 👈

(str: string | null | undefined) => {
  if (notNullish(str)) {
    str.codePointAt(0);
    //
  }
};
```

`unknown` のままだと表現できないのでジェネリクスを生やしました。ちなみに今回は Nullish を排除した型を `T` にしていますが、返り値の型を `NonNullable<T>` にして `<T>(foo: T): foo is NonNullable<T>` というシグネチャに書き換えても大丈夫です。

`is` で言っている内容はあくまで人間がそう言っているだけであって、実際に「この関数が `true` だったら `foo` は Nullish でない」ということはコンパイラはチェックしてくれません ^[返り値が `boolean` か否かはちゃんとチェックします]。コードで嘘をつかないようにしましょう。といっても今回詳しくチェックするまでもありませんが。

## `asserts` - `throw` や `never` でのチェックを関数に切り出したい

`if` を使ったチェックの条件部分を関数に切り出すのが `is` なら `asserts` は `throw` や `never` でのチェックを切り出せるようにします。`asserts foo is U` は「この関数が何らかの値を返したら `foo` は `U` 型として扱っていいよ」という意味です。

何らかの値を返さない場合というのは例えば、

- エラーが `throw` された
- `process.exit()` などでコードの実行が終了した

という場面です。

引数が Nullish だった場合は `throw` する (ので、正常に関数が終了したら引数は `null` でも `undefined` でもないと推論させる) 関数を書きました。

```ts
const assertsNonNull = <T>(foo: T): asserts foo is NonNullable<T> => {
  if (foo == null) {
    throw new TypeError("assertsNonNullがnullishを受け取った");
  }
};
```

`throw` の例で出した `square` を簡単に書けるようになります。

```ts
const square = (n: number | null | undefined): number => {
  assertsNonNull(n);
  return n * n;
};
```

`is` と同じように、`asserts` においてもアノテーションと実装の整合性はプログラマが責任を持ちます。

## コンマ演算子 `,` - `asserts` Null チェックと値の使用を 1 つの式にしたい

**あなたはコンマ演算子を知っていますか？** カンマで区切った複数の式を左から評価し、最後の式の値を返します。シンタックスエラーとかでたまに見かけるかもしれません。

```ts
let a = 0;
let b = (a++, a * 2); // b => 2;
```

末尾以外の式は基本的に副作用を起こすものが選ばれるでしょう。再代入、インクリメント、デクリメント、 `console.log()` などの副作用持ち関数、等々。そして `asserts` 型述語をもつ関数にも (TypeScript の型システム上の) 副作用があります。つまり、コンマ演算子を使うと `asserts` 関数による Null チェックとチェック済みの変数を使う式を 1 つの式としてまとめることができます。

```ts:assertsNonNull() が定義済みだと思って読んでください
const square = (n: number | null | undefined): number => (assertsNonNull(n), n * n);
```

この使い方、コンマ演算子の知名度が低すぎたのかごく最近まで TypeScript の推論対象になっていませんでした。Issue ができたのが今年の 10 月で [microsoft/TypeScript#41264: Assertions do not narrow types when used as operand of the comma operator.](https://github.com/microsoft/TypeScript/issues/41264) 修正が取り込まれたのが現時点の最新版である 4.1 です。

参考: [asserts で assert 関数 - Qiita](https://qiita.com/sugoroku_y/items/bd82009001973ddfa3d4)

# 「Nullish 以外の値」を表す型

`null` `undefined` 以外ならどんな値でもいい、という場合には `{}` 型か `Object` 型を使います。`{}` は「プロパティを 0 個以上もつ型」、`Object` は「`Object` のインスタンス」です。字面での意味はまるっきり違いますがこの 2 つは本質的に同じ型です。

`{}` 型は JS の空のオブジェクトリテラル `{}` が指す値の型です。しかし TypeScript の型システムは構造的部分型なので「プロパティを 0 個以上もつオブジェクト」という解釈がなされ、`3` などのプリミティブ値も含めたあらゆる非 nullish 値が代入できます。

```ts
let rularula: {} = {};
rularula = 3;
rularula = () => {};
rularula = "";
```

:::details プリミティブと構造的部分型についてもっと詳しく
`length` というプロパティをもっている型を定義します。

```ts
interface Length {
  length: number;
}
```

数値型の `length` プロパティをもつ値はわりと存在します。

```ts
const arr: Length = [1, 3, 5];
arr.length; // => 3

const fun: Length = (n: number) => n ** 2;
fun.length; // => 1

const str: Length = "Hello";
str.length; // => 5
```

`"Hello"` はプリミティブですがオブジェクトと同様に `length` にアクセスできるので `Length` を満たす値として扱えます。

:::

`Object` 型は「JS の組み込みオブジェクト `Object` のインスタンス (と同等の型)」を表します。TypeScript の値はプリミティブ含めてすべて `Object.prototype` を継承している `Object` のインスタンスなのでやはり nullish 以外ならなんでも代入できます。`Object` を継承しない値を `Object.create(null)` で作ることもできますが **TypeScript でそれの型を表現する手段がない** ので TypeScript に飼われている限りは気にする必要はありません。

それで意気揚々と `{}` を使うと `@typescript-eslint` の推奨設定では「`{}` `Object` は使うな」という怒られが発生してしまいます。「何らかの (プリミティブでない) オブジェクト」を表す正しい型は `object` なのですが、これを知らないと誤って `Object` `{}` を使ってしまいがちなのでこういう設定になっているものと思われます。これがウザい場合は `@typescript-eslint/ban-types` を無効化するか、`{}` とほぼ等価な型 `boolean | string | number | bigint | symbol | object` を外延的に書いてゴリ押すとよいです (実はこちらのほうが型推論する上で有利に働くことがあります)。

# `unknown` 型は Nullish を内包している

`unknown` 型はトップ型とも呼ばれます。部分型関係の頂点に位置し、あらゆる型のあらゆる値を内包する型です。`unknown` 型の変数にはなんでも代入できますし、`unknown` を引数に取る関数にはなんでも渡せます。「あらゆる値」には nullish も含まれるため、Nullable とかどこにも書いてありませんが本質的には Nullable な型です。そのため素の状態ではほとんど何の操作もできません。

```ts
declare const u: unknown;

u.toString(); // ❗ Object is of type 'unknown'.(2571)
```

`unknown` 型は `{} | null | undefined` 型とほぼ同じ ^[実際は `{} | null | undefined` が `unknown` の部分型になっています] ですが実際にユニオン型として定義されているわけではないので、`if (u != null)` といった「Nullish であることの否定」で `{}` 型を導くことはできません。ほしい型があるなら `typeof u === "string"` や `u instanceof Date` のように直接推論させましょう。nullish だけ除去した `{}` を得たい場合は `u instanceof Object` すれば同等の `Object` を得られます^[先程の `Object.create(null)` のように `Object` を経由していない値が漏れる点に注意してください]。

# Null 合体演算子 `??` - 式が Nullish だった場合の代替値を与えたい

「ある式が Nullish だった場合の代替値を与えたい」というのは非常によくある場面です。非常によくあるので ES2020 / TS 3.7 で専用の演算子 **Nullish Coalescing Operator** (**Null 合体演算子**) が導入されました。こいつがあれば今まで苦労して書いてきた冗長なコードは全部不要なので先に説明します。

Null 合体演算子は「左オペランドを返す。ただし、左が nullish だったときは右オペランドを返す」という演算子です。リテラルで挙動を見てみましょう。

```ts
null ?? 1; // 1
undefined ?? 1; // 1
0 ?? 1; // 0
12 ?? 1; // 12
```

「データを取得してきて nullish だった場合デフォルト値 `1` を与える」場合です。`fetchData()` は `number | null | undefined` を返します。

```ts
const data: number = fetchData() ?? 1;
```

`??` のありがたみを理解し、古いコードを読む際に困らないように `??` 以前の方法も解説します。

まず、`||` が使われることがそこそこありました。JavaScript の論理和 `||` は「**左オペランドが falsy なら右オペランドを、truthy なら左オペランドを返す**」という挙動をします。nullish な値 `null` `undefined` は falsy なので、左が nullish だったら右を返してくれます。

```ts
const data: number = fetchData() || 1;
```

うまくいってそうですね、と言いたいところですが、**この場面で `||` を使うのはバッドプラクティス** です。この問題は先程説明したものと同じです。このコードは falsy な値、たとえば `0` が渡ってきた場合もデフォルト値 `1` が入ってしまいます。リテラルで確認してみましょう。

```ts
null || 1; // 1
undefined || 1; // 1
0 || 1; // 1
12 || 1; // 12
```

3 つ目の例は `??` と挙動が違いますね。`??` が nullish を捕捉するのに対して `||` は **falsy の場合に** 右オペランドを返す、つまり `0` `-0` `0n` `NaN` `""` `false` といった値が来たときも右オペランドを返してしまいます。これは nullish だけを排除したい場合には意図しない挙動を引き起こします。意図しない挙動を引き起こすのは左オペランドが `number` `bigint` `string` `boolean` 型のときです。先程 `if (foo) {}` の例で説明したことですね。

この場合 `??` を使わないで書き換えるには条件演算子を使います。

```ts
const fetched: number | null | undefined = fetchData();
const data: number = fetched != null ? fetched : 1;
```

新しい一時変数 `fetched` が必要になっています。これは条件演算子の中で null チェックする値が 2 回評価されるからです。

`||` を使っても間違いではない、という場面もあります。これも先程と同じですね。`object` `symbol` などの「すべての値が truthy である型」と nullish との Union になっている場合、左辺が falsy だった場合は確実に nullish と判別できます。

```ts
declare const date: Date | null | undefined;

const foo = date || new Date(Date.now());
```

しかしこの例も `??` で完全に置き換えることができます。「左辺が nullish のときのデフォルト値を与える」場合は全部 `??` を使っておけば間違いありません。`??` を使いましょう。

# オブジェクトの省略可能なプロパティ `prop?: T`

オブジェクト型において、`プロパティ名?` で省略可能 (オプショナル) な型を表現できます。Swift や Kotlin で Nullable を表す `Foo?` になんとなく似ていますが、オブジェクト型のプロパティに使う構文です。

```ts
type User = {
  name: string; // 省略不可 Required
  age?: number; // 省略可能 Optional
};

const bob: User = {
  name: "Bob",
  age: 16,
};

const alice: User = {
  name: "Alice",
  // 年齢不詳
};
```

JavaScript には「オブジェクトの存在しないプロパティにアクセスした場合 `undefined` になる」仕様があるので、`age?: number` と定義したプロパティの実際の型は `number | undefined` になります。

ここで注意しなければならないのは、**プロパティが省略可能であることとプロパティが undefined との union 型になっていることは同値ではない** ということです。すなわち、

```ts
type User = {
  name: string;
  age: number | undefined;
};
```

このように定義した `User` 型のプロパティ `age` は `undefined` との Union 型ですが省略可能ではありません。

```ts
const charlie = {
  name: string, // ❗ Property 'age' is missing in type '{ name: string; }' but required in type 'User'.(2741)
};
```

## Mapped Types でプロパティの省略可否を操作する

既存のオブジェクト型のプロパティを省略可能・省略不能にしたバージョンがほしい、という場面では TypeScript 組み込みの `Partial<T>` と `Required<T>` を使います。

```ts:PartialとRequiredの定義
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
```

これに登場しているのが Mapped Types という機能です^[日本語訳はよくわかりません。型の写像とか言われたりもしますし、コンパイラはマップされたオブジェクト型と言ってたような気もします。]。`{ [P in K]: T }` で、「`K` 型をプロパティ名にもちプロパティの値が `T` である」型です。Mapped Types で `:` の前に `?` や `-?` を付けることで、プロパティを省略可能にしたり省略不能にしたりできます。

例によって Mapped Types がよくわからなくても `Partial<T>` と `Required<T>` というユーティリティ的な型が TypeScript 組み込みで用意されており、オブジェクト型のプロパティを省略可能にしたり不能にしたりするのが自在にできます。

# 配列・インデックスシグネチャと `--noUncheckedIndexedAccess`

TypeScript の配列型には危険なところがあります。

```ts
const names: Array<string> = ["Choso", "Eso", "Kechizu"];

const yuuji: string = names[3]; // 存在しないプロパティ 実際の値はundefined
```

それは、**存在しないキーにアクセスして `undefined` が返る可能性** を無視していることです。

この挙動を改善するために TypeScript 4.1 でコンパイラオプション `--noUncheckedIndexedAccess` が導入されました。`--noUncheckedIndexedAccess` が有効化されている場合、インデックスシグネチャによるアクセスで得られる値に `| undefined` が付きます。

**インデックスシグネチャ** という言葉が出てきました。インデックスシグネチャは、オブジェクトのキー (プロパティの名前) の型を指定するための記法です。その代表例である配列型は「型変数 T をとり、数値をキーに、T を値にもつ」オブジェクトとして定義されています。

```ts
type Array<T> = {
  [index: number]: T;
  length: number;
  // 以降pop()、map()、flat()等のメソッド定義が続くけど省略
};
```

オブジェクトを辞書として使う場合にも使われます。

```ts:文字列型のキーと数値型の値をもつオブジェクト
type StringRecord = {
  [key: string]: number;
};

const populations: StringRecord = {
  yokohama: 3.757,
  kawasaki: 1.539,
  sagamihara: 0.722,
};

const yokohama = populations.yokohama; // 3.757
```

そして、存在しないキーにアクセスできてしまいます。

```ts
const populations: StringRecord = {
  yokohama: 3.757,
  kawasaki: 1.539,
  sagamihara: 0.722,
};

// 🤬タイポしてる！！！！！！！！！
const yokohama = strRecord.yokohma;

// 🤬numberとして扱えちゃってる！！！！！！！
console.log(`人口は${yokohama * 100}万人を数える大都市`);
```

プロパティ名を打ち間違えて `yokohama` でなく `yokohma` の値を取得してしまっています。そんな名前のプロパティはないので実行時に変数 `yokohama` に入る値は `undefined` になります。

また、Mapped Types `{ [P in K]: T }` の `K` が `string` `number` `string | number` になる場合も最終的な型が等価なインデックスシグネチャ (`{ [x: string]: T }` など) に書き換えられるためやはり同じ危険があります。これの代表例は TypeScript 組み込みの `Record<K, V>` 型です。

```ts
const record: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese",
};

const de: string = record.de; // 実際はundefined
```

`Record<string, string>` 型は `{[P in string]: string}` であり、`{[x: string]: string}` に変形されます。

```ts
// 実際の型は { [x: string]: string }
const record: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese",
};

const de: string | undefined = record.de; // string | undefined
```

なお、このオプションは `--strict` に含まれていません。

# タプルと省略可能な要素

TypeScript では固定長の配列をタプルとして扱います。

```ts
type Tp = [string, number, boolean];
const tp: Tp = ["ea", 214, true];
```

タプルの要素となる型名に `?` を後置するとその要素は省略可能になり、型は `undefined` との Union 型になります。この「省略可能」はオブジェクトのオプショナルなプロパティと同じ扱いです。`length` の型は `1 | 2` になります。

```ts
type ToStrParam1 = [number, number?];
const a1: ToStrParam1 = [4, 10];
const b1: ToStrParam1 = [4];
const c1: ToStrParam1 = [4, undefined];
```

`?` ではなく `undefined` との Union 型にした `ToStrParam2` を用意しました。これは一見 `ToStrParam1` と同じように見えますが、`length` が `2` で固定になっているので、長さ 1 のタプルを代入することはできません。

```ts
type ToStrParam2 = [number, number | undefined];
const a2: ToStrParam2 = [4, 10];
const b2: ToStrParam2 = [4];
// Type '[number]' is not assignable to type 'ToStrParam2'.
// Source has 1 element(s) but target requires 2.(2322)
const c2: ToStrParam2 = [4, undefined];
```

この関係はオブジェクトの省略可能なプロパティと同じですね。

ラベル付きタプルではラベルの後に `?` です。ますますオブジェクトリテラルみたいですね。

```ts
type ToStrParamL = [num: number, radix?: number];
```

ラベルは型チェックに一切影響を及ぼしません。ラベルが生きるのは関数の引数に展開した時です。

```ts
type ToString = (...args: ToStrParamL) => string;

// この型に展開される
type ToString = (num: number, radix?: number | undefined) => string;
```

num, radix という引数名が継承され radix は省略可能な引数になっていることに注目してください。

# `?.` - Nullish かもしれない値にプロパティアクセスしたい！

記事の投稿者の GitHub アカウントのユーザー名を取得したい季節ですね。以下のインターフェースがあると想定します。関数の実装は関係ないので `declare` で返り値の型だけ書いています。

```ts
interface User {
  name: string;
  githubUrl?: string;
}

interface Article {
  title: string;
  author: User;
}

declare function fetchArticle(): Article | null | undefined;
```

GitHub アカウントの名前ですが、直接は取得できませんね。有能なことに API ドキュメントが完備されているので `githubUrl` には `https://github.com/AumyF` というような末尾スラッシュなしの形式で URL が入っていることがわかりました。ユーザー名は `githubUrl.split('/').pop()` で取得できそうです。

では `fetchArticle` で記事を取得するところからやってみましょう…

```ts
const article = fetchArticle(); // aricle: Article | null | undefined

const githubUrl = article.author.githubUrl; // ❗ Object is possibly 'null' or 'undefined'.(2533)
```

おっと！`fetchArticle()` が `null` `undefined` を返しうることを忘れていましたね。`article` が nullable なので `article.author` にアクセスする前には null チェックが必要です。今回は Null 合体演算子のときとは逆に、古い書き方の問題点を指摘した後に Optional Chaining を導入していきます。まずは古い書き方から。

## Optional Chaining のない時代の血と汗と涙

もっとも素朴なのは `if` 文で Null チェックして分岐することでしょう。

```ts
if (article != null) {
  const githubUrl = article.author.githubUrl; // githubUrl: string | undefined
  if (githubUrl != null) {
    const githubName = githubUrl.split("/").pop(); // githubName: string | undefined
  }
}
```

ネストが多くて地獄ですね。それでは条件演算子を使ってみましょう。

```ts
const githubName =
  article != null
    ? article.author.githubUrl != null
      ? article.author.githubUrl.split("/").pop()
      : undefined
    : undefined;
```

インデントがさらに増え、一時変数と可読性が減りましたね！これではだめです。実は `article` の検査はまだもうちょっと省略できます。

まず `Article` 型はオブジェクト型なので真偽値に評価するとかならず `true` になります。そのため `Article | null | undefined` 型の値が `false` になった場合は確実に nullish だとわかり、`!= null` がなくても null チェックができます。さきほども説明したあれですね。

```ts
const githubName = article
  ? article.author.githubUrl != null
    ? article.author.githubUrl.split("/").pop()
    : undefined
  : undefined;
```

さらに JavaScript の論理積 `&&` は「**左オペランドが truthy なら右オペランドを、falsy なら左オペランドを評価して返す**」という挙動をします。条件演算子で書き換えると `p ? q : p === p && q` という関係になります。論理和 `||` と同じように右オペランドは必要になるまで評価されない (短絡評価) ので、たとえば左が nullable のとき、**右オペランドが評価されるのは左が nullish でなかったとき** だけになります。

要するに `nullable ? defaultValue : undefined` という 式は `nullable && defaultValue` とかなり似ていて置き換え可能、ということです。

```ts
const githubName =
  article &&
  article.author.githubUrl &&
  article.author.githubUrl.split("/").pop();
```

:::message
このコードは微妙に間違いを含んでいます。`githubUrl` は `string` 型なので `&&` に突っ込むと `false` に評価される可能性があります。そのような挙動を示すのは空文字列 `''` です。しかしこの場合に限っては `''.split("/").pop();` をしてもしなくても変わらず `''` なので無視しました。「難しくてよくわからない…」って思っているそこのあなたも安心してください。Optional Chaining があればこんなことを考える必要はありません。
:::

まあまあ短くはなった気がしますが、繰り返しが多くて無駄です。`article` は 3 回も登場しています。ここでついに ES2020 で Nullish Coalescing と一緒に導入された Optional Chaining を導入します。

## Optional Chaining のある喜びを噛みしめて

Optional Chaining は `?.` という構文です。プロパティアクセスの `.` の代わりに使って `foo?.bar` とすると、`foo` が nullish だった場合もエラーにならず `undefined` を返します。条件演算子で書き換えると `foo != null ? foo.bar : undefined` です。配列など `foo[bar]` を使う場合は `foo?.[bar]` です。

`foo?.bar.baz` と繋げると、`foo` が nullish であった場合全体が `undefined` になります。`foo?.bar` が `undefined` になって `undefined.baz` でエラーになると誤解しがちで、実際そのような挙動を示す言語もありますが、JavaScript ではエラーになりません。

```ts:Optional Chaining を使う
const githubName = article?.author.githubUrl?.split("/").pop();
```

`githubName` は `string | undefined` 型です。`undefined` なのは以下の場合です。

- `article` が nullish だった
  - `article` が `null` だった場合も `undefined`
- `article.author.githubUrl` が `undefined`
- `pop()` の返り値が `undefined`
  - `split("/")` で空の配列 `[]` が返ってきたときのみ。文字列は絶対スラッシュ入りで渡ってくるので実装上はありえないはずだが型の上では nullable

これに `undefined` だったときのデフォルト値を与えるには？

```ts:小指が赤い糸で結ばれてるコンビかよチクショウ！
// githubName: string
const githubName =
  article?.author.githubUrl?.split("/").pop() ??
  "This user doesn't have a GitHub account.";
```

もちろん、Null 合体演算子です。同時に導入されただけあってとても相性がいいですね。

# プロパティアクセスと Optional Chaining と制御フロー解析

制御フロー解析は `foo.bar` のようなプロパティにも働きますが、特に `foo?.bar?.baz.foobar != null` のような Optional Chaining を挟んだものにも働きます。`foo?.bar?.baz.foobar` が nullish でない場合、`foo` も `foo.bar` も `foo.bar.baz.foobar` も nullish ではないことがわかり、これらは Non-Nullish に推論されます。

![](https://storage.googleapis.com/zenn-user-upload/14wm7izncv7vbvpuoeqm1080tmj4)
_Excalidraw でフローチャートに起こしてみた図。縦長すぎて記事を読む邪魔になっている_

Optional Chaining の解説に使った例を挙げると

```ts
if (article?.author.githubUrl != null) {
  // articleがnullishでないことも保証されている
  console.log(article.title);
}
```

# Optional Chaining `?.()` で Nullish かもしれない値を関数として呼び出す

以下のような値を関数として呼び出せます。

```ts
declare const fn: Function | null | undefined;
```

```ts
fn && fn();
fn?.();
```

わりとありそうな例はライフサイクルフック的なものですかね？

```ts
class BuildChan {
  onBuildStart?: (arg: OnBuildStartParams) => void;
  onBuildFinish?: (arg: OnBuildFinishParams) => void;
  build() {
    this.onBuildStart?.();

    // ここでなんかビルドの処理する

    this.onBuildFinish?.();
  }
}
```

:::message
`?.()` や `?.[]` は正直キモめのビジュアルですが、`?[]` `?()` だと条件演算子と紛らわしいのでこうなっています。if が式だったらこんなことで悩む必要なかったと思うんですがねえ。
:::

# 関数版 Optional Chaining がほしい！

引数が nullish だったら `undefined` を返す関数とかわりと便利そうですね。**作りましょう**。

```ts
const map = <T extends {}, R>(f: (t: T) => R) => {
  function r(t: null | undefined): undefined;
  function r(t: T): R;
  function r(t: T | null | undefined): R | undefined;
  function r(t: T | null | undefined): R | undefined {
    return t != null ? f(t) : undefined;
  }
  return r;
};
```

これはカリー化された関数です。`map(fn)` すると `fn` を nullish に対応させた新しい関数 (`r`) を返します。`r` はオーバーロードされており、

- `t: null | undefined` ならば `undefined`
- `t: T` ならば `R`
- `t: T | null | undefined` ならば `R | undefined`

を返します。オーバーロードせず `function r(t: T | null | undefined): R | undefined;` だけだと `r(3)` とか `r(null)` など返り値が自明に `R` や `undefined` である場合も `R | undefined` になってしまいます。

`T` の制約を取り払って Conditional Types で `T extends null | undefined ? undefined : R` としてもよいのですが、関数の返り値に Conditional Types が来た場合は `as` がないとコンパイルが通らないので行っていません。オーバーロードもオーバーロードで `as` こそ見えていませんが実装側で嘘がつけてしまうので普通に危険です。同じ危険ならより見た目がよく見える方を、オーバーロードした理由なんてそんなものです。

実際の使い方はこんな感じです。

```ts
const add5 = (n: number) => n + 5;

const add5N = map(add5);

add5N(undefined);
add5N(124);
map(add5)(null);
```

# `!` - 型は Nullable だけど Non-Null として扱わせたい

どうしても「ロジックの上では絶対に Null にならないけど型は Nullable になってる」という状況というのはあります。その時に値を Non-Null として扱わせるための後置演算子 (のようなもの) が Non-null assertion `!` です。「ようなもの」と書いたのは、この `!` はランタイムに何の影響も及ぼさないからです。ここでだけは Null 安全を投げ捨てるという意味です。

```ts
const toString = (n: number) => n.toString(10);
declare const num: number | null | undefined;

toString(num!);
```

当たり前ですが `!` を使っている場合、その値が nullable でないことを保証する役割はコンパイラからプログラマに移ります。むやみやたらに使うと危険です。

まあ、うっかり落ちると言っても非 Null 安全言語で null チェックすっぽかしてエラー落ちするのと完全に同じですからね。しかも危ない箇所が `!` で可視化されるので、どこに注意を払えばいいのかも一目瞭然です。

# 変数やプロパティの初期化チェック

`let` で再代入できる変数を定義しました。JS の仕様で未初期化の変数の値は `undefined` になるのでこの変数の値も `undefined` です。

```ts
let str: string;
```

「`str` は型が `string` なのに実際の値は `undefined` だなんて危険にも程がある！TypeScript は危険な言語！█████(任意の AltJS)を使うべき！」と高らかに糾弾したいところですが、TS では初期化していない変数を使おうとするとコンパイルエラーになるので、うっかり未初期化の変数にアクセスすることはありません。安全です。

```ts
str.toUpperCase(); // ❗ Variable 'str' is used before being assigned. (2454)
```

もちろん、値を代入して初期化すれば普通に使えるようになります。

```ts
str = "hello";
str.toUpperCase(); // => "HELLO"
```

初期値として `undefined` を渡したいときもあるかと思いますが、そのときは当然 `undefined` を型注釈に書く必要があります。その場合でも NonNullish 値で再代入すれば Nullish を除去した形に自動キャストしてくれます。

```ts
let str: string | undefined = undefined;

str = "hello";
str.toUpperCase(); // => "HELLO"
```

switch, try-catch といった構文が出てきて `const` が使いづらいときも心配はいりません。

```ts:何らかのasync関数の中だと想定してください
let data: Data | undefined = undefined;

switch (process.NODE_ENV) {
  case "development": {
    data = new Data(["Denji", "Aki", "Power", "Makima"]);
  }
  case "production": {
    data = await Data.fetch("https://example.com");
  }
}

doSomethingWith(data); // Data型
```

## クラスのフィールド

TypeScript 2.7 で導入されたコンパイラオプション `--strictPropertyInitialization` を有効にすると、クラスのフィールドを初期化しないとコンパイラに怒られるようになります。変数の場合は未初期化のものを使おうとしたときにエラーですが、クラスのフィールドではクラスの定義時にエラーが出るところが違います。

```ts
class User {
  name: string;
  // ❗ Property 'name' has no initializer and is not definitely assigned in the constructor.(2564)
}
```

このエラーを解消するにはフィールド定義かコンストラクタ内で初期化する必要があります。

```ts:定義で初期化
class User {
  name: string = "Yuuri";
}
```

```ts:コンストラクタで初期化
class User {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
```

未初期化でインスタンス化させたい場合はやはり変数同様に `T | undefined` にします。再代入で値を割り当てると `undefined` が取り除かれた型になります。

```ts
class User {
  name?: string;
}

const user = new User();
user.name = "Chito";

console.log(`My name is ${user.name}.`);
```

## 未初期化警告の無視 `!`

TypeScript は変数やフィールドの初期化について面倒を見てくれますが、流石に関数内での代入操作までは見てくれません。特にコンストラクタ内で呼び出す際は不便ですね。

```ts
class User {
  name: string;
  // ❗ Property 'name' has no initializer and is not definitely assigned in the constructor.(2564)
  constructor(name: string) {
    this.initName(name);
  }
  initName(n: string) {
    this.name = n;
  }
}
```

真偽値での絞り込みも `throw` での絞り込みも `is` `asserts` なしでは関数には切り出せませんし、中で変数に代入することを表す型述語は (まだ？) 存在しません。そんなこんなで「未初期化警告とか出さなくていいから型チェック通してくれ～！」というプログラマの想いを表現する `!` という修飾子的ななんかがあります。省略可能の `?` みたいな感じで `!` を書くだけであら不思議、初期化してなくても怒られが発生しなくなりました！

```ts
class User {
  name!: string;
  constructor(name: string) {
    this.initName(name);
  }
  initName(n: string) {
    this.name = n;
  }
}
```

例によってこれはチェックの無効化なので、使用する際はそこそこ注意を払っておくといいです。

## 省略可能な引数 `(t?: T) => T`

オブジェクト型のプロパティと同様に、関数の引数も `?` を使って省略可能にできます。省略された引数は `undefined` になるので、省略可能な仮引数 `t?: T` の型は `T | undefined` になります。

```ts
function fiveTimes(n?: number): number {
  if (n == null) return 0;
  return n * 5;
}
```

関数の仮引数でも変数と同じように再代入での型チェックが効きます。

```ts
function fiveTimes(n?: number): number {
  if (n == null) n = 0;
  return n * 5;
}
```

## ラベル付きタプルと関数の引数

TypeScript では関数の引数の型を配列 (⊃ タプル) で指定できます。

説明が難しいので例を出します。

```ts
type StrStrNum = [string, string, number];

// スプレッドでの指定でそのまま受け取る
const strStrNumFunc = (...args: StrStrNum) => `${args[0]}${args[1]}${args[2]}`;

// 実装では普通に固定長で受け取る例
const strStrNumFunc3: (...args: StrStrNum) => string = (head, body, tail) =>
  `${head}${body}${tail}`;
```

## デフォルト値

関数の仮引数で `arg: number = 0` とすると、引数が省略された (厳密には `undefined` が渡った) 場合のデフォルト値を設定できます。デフォルト値を設定すると呼び出し側は (TypeScript の型システム上で) その引数を省略できるようになります。なお `arg?: number = 0` という形にすると `Parameter cannot have question mark and initializer.(1015)` でコンパイルエラーになります。

```ts
// add42: (n?: number) => number
const add42 = (n: number = 0) => {
  return n + 42;
};
```

デフォルト値はオブジェクト、配列に対する分割代入にも使用できます。

```ts
(user: { name: number; githubName?: string }) => {
  const { githubName = "" } = user;
};
```

デフォルト値で注意しなければならないのは、デフォルト値が適用されるのは値が **`undefined` だった場合** です。**`null` は含まれません。**

```ts
// add42: (n: number | null | undefined) => number
const add42 = (n: number | null = 0) => {
  return n + 42; // ❗ Object is possibly 'null'.(2531)
};
```

`null` の可能性がある場合のデフォルト値はどう与えたらいいかというと、**Null 合体代入演算子** `??=` を使います。

## Null 合体代入 (Logical nullish assignment)

TypeScript 4.0 で追加された新しい代入演算子 (Logical assignment operators) の 1 つです。ECMAScript では 2021 年 1 月現在 Stage 4 で `esnext` 扱い、年次のバージョンには来年の ES2021 で追加される予定です。左辺が nullish だった場合右辺値を代入します。デフォルト値を与えるように再代入できます。

```ts
let foo: number | null | undefined = null;

foo ??= 0; // ここ以降では foo: number
// ---
foo ?? (foo = 0);
foo != null ? foo : (foo = 0);
```

`foo ??= 1` と `foo = foo ?? 1` には少し違いがあります。`foo` の評価回数が違うのもそうですし、Null 合体演算子の短絡評価により `foo ??= 1` は `foo` が nullish でない場合は代入自体が行われません。

デフォルト値が `null` を潰せない問題もこれがあれば解決します。

```ts
const threeTimes = (n?: number | null) => {
  n ??= 1;
  return n * 3;
};
```

# Nullish を含む配列から Nullish を削除したい！

`Array<T | null | undefined>` という配列から Nullish な値を排除して `T[]` にしたい場合、もっとも簡単なのが `Array.prototype.flatMap` を使う方法です。

```ts
const compact = <T extends {}>(arr: Array<T | null | undefined>): T[] =>
  arr.flatMap((n) => n ?? []);
```

`Array.prototype.flatMap(fn)` は ES2017 で追加されたメソッドで、`array.map(fn).flat()` と等価です。関数 `fn` で `[]` (長さ 0 の配列) を返すとその要素が削除されます。このコードでは Null 合体演算子 `??` を使って Nullish だった場合は `[]` を返し、その要素を削除するようになっています。このように `flatMap` は `[]` で要素を削除したり、`[n, n * 3]` で要素を挿入したりできます。たのしいのでぜひ使いましょう。

`is` つき関数と `Array.prototype.filter` を合わせることもできます。もちろん関数本体の処理が正当かはプログラマが責任を負う…といってもこの場合は見りゃわかりますが。

```ts
const compact = <T extends {}>(arr: Array<T | null | undefined>): T[] =
  arr.filter((n): n is T => n != null);
```

配列そのものが Nullable の場合もあると思います。型としては `Array<string | null | undefined> | null | undefined` のような形です。そんなときは Optional Chaining と Nullish Coalescing を組み合わせます。

```ts
declare const tags: Array<string | null | undefined> | null | undefined;
arr?.flatMap((n) => n ?? []) ?? [];
```

# Tagged Union で Nullable を表現する

Null 安全を実現するアプローチには複数あると説明しました。TypeScript では Union 型ですが、Haskell, Swift, Rust, そして AltJS の一角である Elm, PureScript, Reason 等の言語で使われるのが **Tagged Union** を使った方法です。言語ごとの呼び方の違いが大きく、Rust では C の似た機能に寄せて **enum** 、現在の Elm では **カスタム型** と呼ばれていますが、かつてはユニオン型と呼んでいた時期もあったようです。もちろん TypeScript の Union 型とは異なるものですが、複数の選択肢 (variant) から 1 つを選ぶという点では共通しています。代数的データ型 (Algebraic data types, ADT) とも呼ばれます。

```haskell
data Maybe a = Nothing | Just a
```

`Maybe` 型は型引数 `a` をとり、`Nothing` か `Just` のどちらかの値です。`Just` は `a` 型の値を 1 つ持ちますが `Nothing` は何も持ちません。

ADT を使うと何がいいかというと、ADT を使った Nullable はネストできます。ネストができると Nullable の発生箇所が複数ある場合にどこで発生した虚無値か見つけられてちょっと便利です。TypeScript でも文字列リテラル型とユニオン型を使って代数的データ型を模倣したものが作れます。

```ts
interface None {
  readonly _tag: "None";
}

interface Some<A> {
  readonly _tag: "Some";
  readonly value: A;
}

type Option<A> = None | Some<A>;
```

その代わりというか、言語の標準ライブラリなど含めて `Option` `Maybe` になっている Rust や Elm と異なり TypeScript のこれは JavaScript のエコシステムから離れてしまうので、素の nullish との変換がどうしても必要になります。結果的にユーティリティ関数がたくさん必要になります。fp-ts はそのへんの関数もちゃんと用意してますが、自力で定義していくのはつらいかもしれません。そしてそんなにがんばるならもう最初から ADT を扱える言語でいいんじゃないか、というのが筆者の個人的意見です。

# オフトピック集

nullish に関連しているがあまり役に立たない話題を書きます。

## `undefined` はリテラルではない

ソースコード中の `null` は `null` という値を示すリテラルです。立派な予約語でありグローバル変数ではないので、`null` とかいう名前の変数を定義するようなことはできません。それに対し `undefined` は ECMAScript の組み込みオブジェクト、すなわちグローバル変数やグローバルオブジェクトのプロパティとも言えるものです。`globalThis.undefined` で `undefined` を得られます。ECMAScript 5 以降では仕様によりグローバル変数の `undefined` には再代入できませんが、`null` と違って予約語ではないのでグローバルでないスコープでは `undefined` という名前の変数を定義できます。もちろん推奨はされていません。

## `document.all`

`document.all`というオブジェクトがあります。これには面白い特徴があります。

- `Boolean(document.all) === false`
  - **オブジェクトなのに falsy**
- `document.all == null && document.all == undefined`
  - **オブジェクトなのに nullish との非厳密比較が真**
- `typeof document.all === "undefined"`
  - **オブジェクトなのに `typeof` が `undefined`**

です。まさにやりたい放題ですね。さすがに nullish ではないので `document.all ?? 0` で 0 が返ってきたりはしないんですが、実はこの `document.all` が `v != null ? v : u === v ?? u` の例外になっています。

だからといってこんなアノマリーのために気を遣った実装をする必要はないと思います。

## `void` 型

関数が「何も返さない」ことを示す型です。`return` が無い関数、`return;` で値を返さない関数が該当します。

```ts
const boido = (): void => {};
```

JavaScript の仕様上「何も返さない」といっても実際には `undefined` が返っていますから、`undefined` は `void` 型の値として使用できます。

```ts
const boido = (): void => undefined;
```

## `void` 演算子

実は `void` は ECMAScript の予約語で、これを使った `void` 演算子というものがあります。`void 何らかの式` と書くと `undefined` を得られるというものです。先ほど `undefined` に別の値が入っていることがある、という話をしましたが `void 0` のように `void` を使うとグローバル変数の `undefined` を使わず `undefined` 値を得ることができます。見た目と活用方法が直感的でなさすぎて、「JavaScript とかいう難解プログラミング言語ｗｗｗｗｗ」みたいな話題で登場しがちです。

あとは、式を実行したいけど返り値は `undefined` であってほしい場面で使うそうです。式しか書けない場所で副作用のある関数を実行したいときに使う感じですかね？

```ts
const pop = (arr: unknown[]): void => void arr.pop();
```

この場合は

```ts
const pop = (arr: unknown[]): void => {
  arr.pop();
};
```

これでも十分じゃないかと思いますが。

# おわりに

TypeScript で null と undefined を安全に扱うための機能について網羅的に解説しました。nullish を安全に扱う、と言いつつこれらの機能やテクニックの中には nullish 以外に使えるものも数多く存在します。TypeScript において nullable 型はただの Union 型です。Union 型が理解できれば何ら難しいことはありません。この記事を通してみなさんが Null 安全な言語の素晴らしさに触れ、Null 安全をあたりまえのものとして受け入れてくれることを願っています。
