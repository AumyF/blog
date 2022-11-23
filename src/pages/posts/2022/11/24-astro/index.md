---
layout: "../../../../../layouts/BlogPostLayout.astro"
title: "ブログをAstroに移行した"
synopsis: "式年遷宮 (8ヶ月ぶり)"
---

おーみーですよ。きょうはブログを Astro に移行した。

# なぜ

「やっぱさあ、Next.js ってアプリケーションフレームワークなわけで、ブログ作るのには機能過剰じゃない？今は Astro っていうのが流行ってるからそれ使いたいよね」みたいな理由。

Astro について説明しておくと、Web サイト構築用のフレームワークで、JS 抜きで静的な HTML と CSS を吐いて CDN で殴ると初期ロード速くできるよねみたいな方向性。Gatsby や Next.js は router を持ってきて JS でブラウザのページ遷移をエミュレートすることで回遊時の速度を高めているが、それに対抗するアプローチといえる。ついでに island architecture とかいって React や Vue のコンポーネントをページの一部に埋め込んでハイドレートのやるやらを制御できる機能もついているがブログでは使わない。

Astro components というコンポーネント概念が存在する。この Astro components で使えるテンプレートが非常にまともで、`v-for` `x-for` のようなふざけた attribute を書く必要がなく、JSX でするように `array.map` を使って自然に書いてよい。Vue や Alpine のテンプレートがこんなだったらどれほどよかったかと思うが、HTML にベタ書きして使うというユースケースを考慮するとこういうアプローチは取りづらいところがあって仕方がないっちゃない。また `interface Props {}` を定義すると `Astro.props` で props を受け取るとき勝手に型がついたりと独自フォーマットゆえにやりたい放題が行われていて良さがある。

ツールチェイン的には Vite を使っているほか、Astro components の処理には Go を Wasm に変換したものを使っているらしく (パーサの秘孔を突いたときに Goroutine の死体が浮かびあがってきた)、そのへんも面白さがある。

# ハマりどころ

Astro components で `Astro.glob("./posts/**/*.md")` というようにすると posts ディレクトリ以下の.md ファイルの情報が全部取れるのだがこれにバグがあり、Markdown ファイルの CSS が glob する側のバンドルに含まれてしまう。さらにその CSS を読む `<link>` がプロダクションビルドでやたら下のほうに来るので destyle.css が後出しされてスタイルが破壊されるといったことが起きた。

Astro components (`<style>` を書くとデフォルトで scoped style になる) の scoped style は `:where()` セレクタを使うため詳細度が上がらず、詳細度がカチ合ってスタイルシート読み込み順バトルが勃発しがちなのだが、読み込み順に依存するのはかなり脆いので嫌だな〜と思った。実は CSS って狂っていて (メンタリスト)

# Tailwind 剥がした

デザインは大して変わっていないが Tailwind をやめて素の CSS にした。個人プロジェクトなので技術選定はその場の雰囲気で行われる。スタイリングに関しては Every Layout にちょっと影響を受けていて、余白はモジュラースケールになっている。

# Cloudflare Pages

ついでに Vercel から Cloudflare Pages に替えた。全体的に Cloudflare のが太っ腹だった気がするのでプラン比較検証してないが移した。マジで Netlify も過去のものになってしまった感がある。7 ドルの請求は今払うと円高なので払わない、などど言って一生払わないと思う。邪悪ですね。

# シメ

Astro 1.0 とか言ってるけどまだまだ潜在的バグとかありそう、でも良いと思う。もう 1 つぐらいこれでサイト作ってる。