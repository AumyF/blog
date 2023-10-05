---
layout: "../../../../layouts/BlogPostLayout.astro"
title: "プログラミング言語 Koka 試した"
synopsis: "食らえ秘奥義，algebraic effects を (実アプリケーションではまだ使えません……)"
---

おーみーです．突然ですがみなさん未来は好きですか？未来は最高なのでプログラミングとコンピュータがさらなる進歩を遂げることが期待できますが，今回はまさにそんなプログラミング言語の未来を形作るであろう実験的研究用言語 **Koka** について書きます．Koka でもっともわかりやすい特徴は **代数的エフェクト (algebraic effects)** を搭載していることです．最近流行りの，React Hooks や React Suspense に関係しているアレと言われたらピンとくる方もいらっしゃるのではないですか？さあ，一緒に Koka を触ってプログラミング言語の未来を垣間見ましょう！

Koka は Microsoft Research というところで開発されている研究用言語で，「こうか」と読みます．最初はコカの実とかのもじりかと思っていたんですがそうではなく，なんと日本語の「効果」に由来するらしいです．

> Koka is a function-oriented language that separates pure values from side-effecting computations (**The word ‘kōka’ (or 効果) means “effect” or “effective” in Japanese**). <br /> [A Tour of Koka](https://koka-lang.github.io/koka/doc/book.html#tour) (強調は筆者による)

# インストール

Koka 処理系のインストールは `curl | bash` するだけです．

```shell:(x86_64|aarch64)-(linux|darwin)
❯ curl -sSL https://github.com/koka-lang/koka/releases/latest/download/install.sh | sh
```

```shell:x86_64-windows
❯ curl -sSL -o %tmp%\install-koka.bat https://github.com/koka-lang/koka/releases/latest/download/install.bat && %tmp%\install-koka.bat
```

わたしは [Nix](https://nixos.org) を使っているので，システムにインストールせず試せます．`shell.nix` にこのように書くだけで:

```nix:shell.nix
{ pkgs ? import <nixpkgs> { } }: pkgs.mkShell {
  packages = with pkgs;[ koka ];
}
```

便利．

[VS Code のシンタックスハイライトプラグイン](https://marketplace.visualstudio.com/items?itemName=koka.language-koka)が公式から提供されているので入れておきましょう．

# Hello, world

10 回 hello と言うプログラムを書いてみました．拡張子は `.kk` です．

```text:src/hello.kk
// コメントはダブルスラッシュで書く
// さすがにPrism.jsのシンタックスハイライトはないらしく色がつかない
fun main() {
  say-hello(10)
}

fun say-hello( n : int ) {
  var i := 0
  while(fn() { i < n }, fn() {
    println("hello!")
    i := i + 1
  })
}
```

`while` の周辺が恐ろしい形をしていますが，まだ気にしないことにします．

Koka 処理系は `koka` という名前の CLI から起動できます．`koka -e ファイル名` が `cargo run` とかの「コンパイルして実行」にあたります．

```
❯ koka -e src/hello.kk
compile: src/hello.kk
loading: std/core
loading: std/core/types
loading: std/core/hnd
check  : src/hello
linking: src_hello
created: .koka/v2.3.2/cc-debug/src_hello

Hello, Koka!
```

REPL は `koka` で起動できます．

# 「Minimal but General」

Koka は「Minimal but General」という設計思想があるらしいです．最小限の機能を応用していろんなことができるという考え方です．具体的にどんなところがかというと，一番わかりやすいのは **普通の言語なら組み込み構文になっているものが関数として実装されている** ことでしょう．

さて，ここで 10 回 hello プログラムを再掲:

```text:src/hello.kk
fun main() {
  say-hello(10)
}

fun say-hello( n : int ) {
  var i := 0
  while(fn() { i < n }, fn() {
    println("hello!")
    i := i + 1
  })
}
```

パッと見で `while(fn(){}, fn(){})` という形になっていることがわかるでしょう．Koka では関数呼び出しはダサい方 (丸括弧がつくほう) を採用しており，この `while` は関数です．

`fn(){}` は JavaScript のような見た目をした無名関数です．つまり，この `while` 部分は JavaScript でいうと

```js
while_(
  function () {
    return i < n;
  },
  function () {
    console.log("hello!");
    i = i + 1;
  },
);
```

のようにあらわされることになります(実際の JavaScript ではアロー関数やインクリメントを駆使してもっと短く書けるが，Koka との対応性を優先してこのように書いている)．

実は，引数のない無名関数 `fn(){}` は `{}` と略記できます．

```text:src/hello.kk
fun say-hello( n : int ) {
  var i := 0
  while({ i < n }, {
    println("hello!")
    i := i + 1
  })
}
```

さらに，`{}` が引数になっている場合，関数呼び出しの丸括弧は省略できます．

```text:src/hello.kk
fun say-hello( n : int) {
  var i := 0
  while { i < n } {
    println("hello!")
    i := i + 1
  }
}
```

だいぶ `while` らしくなってきましましたね．

ここで「条件部が波括弧 `{}` で書かれているなんてキモイ！」と思った読者はいるでしょうか？たしかに C 言語での `while (expr) {}` という形からはずれた Koka は慣れないと少々奇妙に感じるかもしれませんね．が，しかし，よく考えてほしい，**`while` において条件部は複数回評価されうる** ということを．普通に関数呼び出しで `while(i < 0)` となっているんだったら，式 `i < 0` は関数に渡される前に 1 回だけ評価されるはずなんです．あなたは C 系言語に慣れきって，一貫性に欠く文法にすっかりなじんでしまって，違和感を覚えなくなってしまったのではありませんか？実際わたしがそうだったのだからそうに違いない．この Koka には正しいと信じる一貫性がある．

最後に，これは好みかもしれないが，`{}` を使ったブロックはインデントに置き換えることができます．

```text:src/hello.kk
fun say-hello( n : int )
  var i := 0
  while { i < n }
    println("hello!")
    i := i + 1
```

`while` はあくまで関数でしかないのだが，あたかも言語組み込みの構文かのように扱うことができている．素晴らしいですね．

ちゃっかり関数宣言のブロックもインデントに書き換わっているが，逆に言うと関数を

```
fun main() fn() {
  say-hello(10)
}
```

とも書ける．先生頭痛が痛いです！

# UFCS

以下は公式チュートリアルから引っ張ってきたシーザー暗号をやるプログラムです:

```text:src/caesar.kk
fun encode( s : string, shift : int )
  fun encode-char(c)
    if c < 'a' || c > 'z' then return c
    val base = (c - 'a').int
    val rot = (base + shift) % 26
    (rot.char + 'a')
  s.map(encode-char)

fun caesar( s : string )
  s.encode(3)

fun main()
  "koka is a programming language which has algebraic effects"
    .caesar
    .println
```

注目すべき点はいくつかある:

- 関数内で関数定義できる
- 早期 `return` がある
- 不変変数は `val`

しかし，もっとも注目すべき点は要所要所で登場するドット `.` です．`rot.char` だとか `(c - 'a').int` のような用法を見ると「あ，それぞれの型に型変換のメソッドが定義されていて，引数を取らない場合は `()` が省略できるのか」というふうに解釈できるんですが，`fun encode ( s : string, shift : int )` というように宣言された関数が `s.encode(3)` と呼ばれています．つまり，Koka では **`f(r, a, b)` は `r.f(a, b)` と書けます**．これは dot notation と呼ばれており，[D 言語](https://tour.dlang.org/tour/ja/gems/uniform-function-call-syntax-ufcs) や [Nim](https://nim-lang.org/docs/tut2.html#object-oriented-programming-method-call-syntax) の UFCS (Uniform Function Call Syntax) に相当する．相当するというかまったく同じなんですが D 言語とは独立に開発されているらしい．

> It was also one of the first languages to have dot notation (This was independently developed but it turns out the D language has a similar feature (called UFCS) which predates dot-notation).
> https://koka-lang.github.io/koka/doc/book.html#sec-with

# `with`

`with` というのは Koka がはじめて導入した (と公式チュートリアルは主張している) 機能です．簡単に言うと

```
f(引数, fn(x){
  残りの部分
})
```

を

```
with x <- f(引数)
残りの部分
```

と書けます．なんだか Haskell の `do` とか OCaml の `let*` とか，特殊化した例で言うと `await` とかにも似ており，Monadic な物体に対して map や bind をかますことはもちろんできます:

```
fun product(a : list<int>, b : list<int>)
  with x <- a.flatmap
  with y <- b.map
  x * y

fun main()
  [1,2,3].product([4,5,6]).show.println
```

しかしながら Koka の `with` はこれに限らず，条件を満たした任意の関数に対してそのまま適用できることが便利です．

たとえば受け取った関数を 2 回呼べば残りの部分を 2 回実行できます:

```
fun twice(f) {
  f()
  f()
}

fun main() {
  with twice
  println("hello!")
}
```

「残りの部分」はいわゆる継続ってやつ (だと思います)．

組み込み関数 `finally` を使うと後続の処理が終了したときに行う処理が定義できます．Go の `defer` みたいなやつ．`finally` はなんか謎の仕組みによって `throw` で終了した場合も確実に処理が実行されるみたいです．ソースコードを読もうとしたが unsafe の文字列が見えたので逃げてきました．

```
fun main() {
  with finally { println("finished!") }
  println("processing!")
  throw("oops")
}
```

# エフェクトの型

Koka は関数のもつ作用を追跡します．たとえばこんな感じの作用があります．

```text:src/effect-type.kk
// int -> total int
// 数学的な全域関数．純粋関数．
fun square(x : int)
  x * x

// (int, int) -> exn int
// 例外をブン投げる可能性がある．exception．
fun divide(x : int, y : int)
  if y == 0 then throw("divide by zero")
  x / y

// int -> div int
// 停止しない可能性がある．diverge．
fun fact(n : int) : div int
  if n == 0 then 1
  else n * fact (n - 1)

// int -> console int
// コンソールに書き込む可能性がある．
fun log(i : int)
  println(i)
  i
```

関数の起こしうる作用は型推論がはたらくので，いちいち型を明示する手間はあまりありません．

エフェクトは型引数にできます．以下のコードでは `map-maybe` に渡す第 2 引数 `f` の作用がそのまま `map-maybe` の作用になる．

```text:src/effect-type.kk
// 1文字が型引数．30要素タプルを扱うときどうするんすか
fun map-maybe(m : maybe<a>, f : a -> e b) : e maybe<b>
  match m
    Just(v) -> v.f.Just
    Nothing -> Nothing

fun main()
  // maybe<int>
  Just(3).map-maybe(square)
  // div maybe<int>
  Just(10).map-maybe(fact)
```

# エフェクト定義とハンドラ

「ログに出力する」というエフェクトを定義してみた:

```text:src/handler.kk
// logのインターフェースだけが定義されている
effect logger
  ctl log(value : int) : ()

// (int, int) -> logger int
fun f(x : int, y : int)
  val a = x * x
  log(a)
  return a * y

// loggerをハンドルしてない
fun main()
  f(2, 3).println
```

これはコンパイルエラーになります．`logger` をハンドルしていないからです．もっと具体化して言うと，`log` の具体的な実装が与えられていない．

```
src/handler.kk(9, 5): error: there are unhandled effects for the main expression
  inferred effect : <console,src/handler/logger>
  unhandled effect: src/handler/logger
  hint            : wrap the main function in a handler
```

「wrap the main function in a handler」というアドバイスをいただいたものの残念ながら `main` はハンドラじゃ囲めないので代わりに `f` を囲んでいきます．

```text:src/handler.kk
fun main()
  handle ({ f(2,3).println() })
    ctl log(value)
      println(value)
```

あー，ちょっと待ってくれ，えーっと？ `handle` の後にあるのがエフェクトを起こす可能性があるブロックで，そこで発生した `log` に詰まった値を `log(value)` でパターンマッチのようにして分解している．

Algebraic effects のハンドラはこんな感じになりがちだが，「エフェクトを起こす可能性があるブロック」が変な位置にある(実は `match 値 パターン` と同じ形をしているのだが，値の位置にブロックという長くなりうる物体が置かれるので読みづらいのだと思う．たぶん)おかげか普通に読みづらく algebraic effects の理解を妨げている感がある，と私は勝手に思っています．そこで Koka が誇る新構文 `with handler` を登場させましょう．

`with handler` 構文を使うと「エフェクトを起こす可能性があるブロック」を `with` のように後ろに持ってこれます．こうすると「囲む」感はあまりないです．

```diff text:src/handler.kk
fun main()
  with handler
    ctl log(value){ println(value) }
  f(2, 3).println
```

## 計算を再開する

さてさて実行結果は～:

```text:結果
4
```

おや？`x * x` の結果しかないですね．それはそうで，`f` が `log` をぶん投げたらそのまま制御がハンドラに移行して帰ってこず，継続である `a * y` や `println` は打ち捨てられてしまっているからです．

これだと，例外のような処理を放棄する仕組みとしては悪くありませんが，ログを出力するという目的にはまったく合致してないです．そもそも algebraic effects とは乱暴に言えば「再開できる例外」なので例としても面白味に欠けます．というわけで，再開，つまり継続を呼び出すことをやっていきます．

継続は `resume` という特別な名前の関数に詰まっています．`log(value : int) : ()` という定義を思い出し，`()` を渡すと:

```text:src/handler.kk
fun main()
  with handler
    ctl log(value)
      println(value)
      resume(())
  f(2, 3).println
```

```text:結果
4
12
```

よし．

## ハンドラを差し替える

ここで，ログを標準出力の代わりにファイルで書き込みたくなった(標準出力をリダイレクトすればいいのではないかというツッコミはなしでお願いします)とする．そのような場合もハンドラを差し替えれば:

```text
import std/os/file
import std/os/path

// ...

fun main()
  // write-text-fileが投げる作用をハンドリング
  // with handler brk の省略
  with brk throw-exn(err)
    println(err.show)
  with ctl log(value)
    // exnを投げうる
    write-text-file("/dev/stderr".path, value.show)
    resume(())
  f(2, 3).println
```

いい感じに実装だけを差し替えられます．

# 状態をつくる

ハンドラ内で共有された状態を作ってみます:

```text:src/state.kk
effect counter
  ctl increment() : ()
  ctl decrement() : ()
  ctl cnt() : int

fun print-increment-print()
  cnt().println
  increment()
  cnt().println

fun countdown()
  while { cnt() > -10 }
    decrement()
    cnt().println()

fun root()
  print-increment-print()
  print-increment-print()
  countdown()

fun main()
  var value := 0
  with handler
    fun increment()
      value := value + 1
    fun decrement()
      value := value - 1
    fun cnt()
      value
  root()
```

## `fun` ハンドラ

`ctl` の代わりに `fun` というハンドラ定義があります．これは「エフェクトの引数を受け取って何らかの計算をし，その結果を継続に渡す」を表しています．

```
with fun foo(引数)
  本体
```

は

```
with ctl foo(引数)
  val f = { 本体 }
  resume(f())
```

に脱糖されます．

## ハンドラを関数に切り出す

ところで，`main()` にハンドラがベタ書きされているのがあまりよくないと思いませんか？同じようなハンドラを何回も書くようなときがありそうですし，関数として再利用したいですね．

```text:src/state.kk
fun handle-state(th)
  var value := 0
  handle (th)
    fun increment()
      value := value + 1
    fun decrement()
      value := value - 1
    fun cnt()
      value

fun main()
  handle-state
    root()
```

ここで先ほどの `fn(){}` の省略が効いてくるわけですね．もちろん `with` を使って書き換えてもよし．

# おわりに

実のところ Koka は研究用言語なので標準ライブラリが不足しておりネットワークとかを使ったアプリケーションがまだ書けなさそうなんですが，それでもいい感じの言語機能を搭載しているってことは伝わったのではないでしょうか．

Koka には他にも [Perceus](https://koka-lang.github.io/koka/doc/book.html#why-perceus) という参照カウントに関連した技を使うことでガベージコレクションなしで C コードに変換されるので GC を使うような言語よりも高速に動作する～みたいな研究も突っ込まれており，実装面でも先進的みたいです．C だけでなく JS や Wasm にも変換できるようなので React みたいな UI フレームワークに algebraic effects を足したものを作れるかもしれませんね．
