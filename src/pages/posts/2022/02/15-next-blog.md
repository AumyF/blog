---
layout: "../../../../layouts/BlogPostLayout.astro"
title: "ブログを作り直した"
synopsis: "もはや何回ブログを作り直したかもわからなくなってきたころ、ふと思い立ったのだ。「そうだ、ブログ作り直そう」"
---

ブログを作り直した。

# なぜ？

式年遷宮。

# 技術スタック

Next.js に MDX を組み合わせた。ちょうど 2 月のはじめに [MDX v2 がリリースされていた](https://mdxjs.com/blog/v2/) のでそれに乗っかってみようとした次第。

スタイリングは選択するのが面倒なので Tailwind を選択。カラースキームは自分の好みに合わせてカスタマイズしようかと思ったがデフォルトがそれなりに気に入る色合いだったのでそのまま使っている。Microsoft 製 CSS in JS の Griffel を試そうかとも思ったのだが、いまいちピンと来なかったのでやめた。

v2 以前に MDX そのものの理解がぜんぜんなかったので、問題に対する解決策が見当もつかず悩んだ挙句にドキュメントを頭から読んで解決する、ということを数回やった。かなり段取りが悪いという自覚がある。

# たのしい MDX

MDX はよく言われる説明としては、Markdown の中に JSX が書ける拡張である。Markdown の中で `<Link></Link>` のような形で React など (v2 で React 非依存になった) のコンポーネントが利用できる。しかし、その処理系に目を向けてみると、実際には少し異なる本質が見えてくる。MDX 処理系は MDX とよばれる Markdown のスーパーセット言語を解釈し、**JavaScript へと変換する** 処理系である。

以下の MDX ドキュメントは、Markdown としても妥当である。

```
Nuxt v3はNext.jsのようなAPI Routes機能を備えている。
```

Markdown として解釈すれば、このドキュメントは

```html
<p>Nuxt v3はNext.jsのようなAPI Routes機能を備えている。</p>
```

というような HTML 片に変換されるであろう。これに対して、MDX では、件のドキュメントは、概念上としては

```jsx
/* @jsxRuntime automatic @jsxImportSource react */
export default function MDXContent() {
  return <p>Nuxt v3はNext.jsのようなAPI Routes機能を備えている。</p>;
}
```

このような JSX コードに変換されると考えてもらっていい。実際にはさらに一段階下の、プレーンな JavaScript へと変換されている。つまり、MDX 処理系によって変換されたドキュメントは、他の JavaScript コードから `import` 構文によって読み込むことができる。

より面白い例を出すと、JavaScript の変数宣言が MDX でも行えるため、Markdown でいう Frontmatter (記事の最初に YAML でメタデータを記述する記法) のようにメタデータが書ける。

```mdx
export const metadata = {
  title: "ブログを作り直した",
  description:
    "もはや何回ブログを作り直したかもわからなくなってきたころ、ブログが作り直された。",
};

記事の内容記事の内容記事の内容
```

そして、JS からインポートしたときに使用できる。

```js
import { metadata } from "./post.mdx";
```

ちなみに、`post.mdx` のように MDX ファイルを直接インポートする行為は webpack に loader を噛ませるなどの設定によって可能になる。

# 本ブログと MDX

本ブログの現状のアーキテクチャでは `/pages/posts` 以下に `yyyy/mm/dd.mdx` という形式で記事データを保存している。このように `/pages` 配下に直接記事が置けるのは、webpack の loader によって素の JS に変換され、また MDX コンテンツ全体はデフォルトエクスポートされているからである。

ところで、このブログでは MDX の変換時にカスタム loader を導入している。内容は以下。

```js
module.exports = /**
  @type {import("webpack").LoaderDefinitionFunction}
  @param {import('webpack').LoaderContext} this
*/ function (src) {
  const code = `import { BlogLayout } from "../../../../components/BlogLayout";


${src}

export default ({ children }) => <BlogLayout metadata={metadata}>{children}</BlogLayout>;
`;

  return code;
};
```

ここで `export default` されているコンポーネントは MDX コンテンツの wrapper としてはたらく。MDX はエディタサポートが貧弱でコンポーネント名や Tailwind のクラス名の補完が期待できないため、ブログ記事ページの詳細なレイアウトを `BlogLayout` に追い出すことで快適な記述を実現している。

また、記事一覧のページを表示するために `getStaticProps` で記事の全データを取得する必要があるが、その場合は Dynamic Import `import()` で処理した。正直言ってなんでちゃんと動いているのかわからない、webpack 魔法すぎて怖い。

# メタデータのスキーマを書く

MDX に型サポートなどというものはないので、`import` した値はすべて `any` 型になってしまう。これはさすがに気持ち悪いため、ランタイム型チェッカである Ajv を利用してバリデーションを書いていく。

```ts
import Ajv, { JTDDataType } from "ajv/dist/jtd";

const ajv = new Ajv();

const metadataSchema = {
  properties: {
    title: { type: "string" },
    description: { type: "string" },
  },
} as const;

export type Metadata = JTDDataType<typeof metadataSchema>;

export const validateMetadata = ajv.compile(metadataSchema);
```

実はここで利用しているのは JSON Schema ではなく、RFC8927 で仕様化されている **JSON Type Definition** という形式である。RFC という点と、tagged union を表現可能といった特徴に惹かれて採用してみた。今回はここで逆張りポイントを稼いでいる。

# TODO

このブログは MVP (Minimal Viable Product) であるためいろいろなものが欠けている。当面はこれらを課題としていきたい。

- リンク先の情報を取ってリッチな表示をするやつ
  - 実装大変そう
- コードブロックのシンタックスハイライト
  - 実装めんどそう
- 数式表示
  - 実装つらそう
- Table of Contents
  - 実装ダルそう
- 過去記事の移植
  - 記事による
- 脚注
  - 脚注芸で遊びたいため

# おわりに

今回のこのブログは末永く運用していきたいところだなあ。そもそも Zenn にも大して記事を上げられていないという問題があるので、2022 年はどばどばアウトプットを出したい。
