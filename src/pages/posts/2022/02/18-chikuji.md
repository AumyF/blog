---
layout: "../../../../layouts/BlogPostLayout.astro"
title: "OCamlの血に見る逐次実行と変数宣言のかたち"
synopsis:
    "F#の美しさを真似したい．OCamlの堅牢さも捨てがたい．Rustのフレンドリーさも無視することはできない．"
---

OCaml には 2 人の子供がいる．C++ との子は Rust という名前であり，C# との子は F# という．これらの言語の簡単な比較として，逐次実行と変数宣言について見ていこう．

# OCaml: `;` と `in`

OCaml は，堅牢な文法という印象を受ける．インデントは構文上の意味を持たない．インデントが意味を持つ F#や Python のような言語では，プログラマーは，どこからどこまでがブロックであるかを，厳密にインデントを使って丁重に教えてやる必要がある．そのコードは平らた板で城を組み上げたように無駄がなく，そして崩れやすい．1 行，インデントが破れた箇所があれば，すべてが壊れてしまうだろう．

OCaml ではトップレベル宣言を除けばあらゆるものが式で構成されている．C や JavaScript に慣れた人間にとっては奇妙なことだが，変数宣言も式である．`let 変数名 = 式 in 変数を使用する式` という文法で，`let` 式全体の値は `変数を使用する式` の値になる．

```ocaml
(* トップレベル宣言 *)
let () =
  (* 変数msgを宣言 *)
  let msg = "Hello" in
  (* msgを使用する式 *)
  print_endline "%d" msg
```

`let ... in` は入れ子にしてもかまわない．この場合，C などでの変数宣言の連続に似た見た目になる．

```ocaml
let () =
  let x = 3 in
  let y = x * x in
  print_endline "%d" (x + y)
```

逐次実行は `;` _演算子_ によってなされる．`左 ; 右` と書いたとき，まず `左` を評価し，次に `右` を評価してその結果を返す．左辺の値は捨てられてしまうため，通常左の式には何らかの副作用を起こすものが好まれる，標準出力とか．

```ocaml
let () =
  print_endline "Hello!";
  print_endline "I love OCaml!";
  print_endline "You?"
```

C 言語などで式文に使われる `;` は `式;` という形をとるので―

```c
int main(void) {
  printf("Hello!\n");
  printf("I dislike C!\n");
  printf("You?\n");
}
```

―最後の式にも `;` をつけるが，OCaml の `;` は 2 項演算子であるため，最後の式には `;` をつけない．これは一見奇妙かもしれないが，最後の式は `;` によって連ねられた式全体の値という特別な役割を担っているということを考えるとごく自然である．

このように，OCaml においては変数宣言は `let 変数名 = 式 in 変数を使用する式`，逐次実行は `副作用のある式 ; 式` という形で表現され，たがいに別々である．

```ocaml
let () =
  let y =
    let x = 3 in
    x * x
  in
  print_endline "%d" y;
  print_endline "Hello!"
```

ちなみに，`let ... in` によって式が区切られ，`;` で逐次実行するという特徴により，OCaml には C のようなブロック `{}` というものが存在しない．構文上の曖昧さから `;` を含む式全体を `()` で囲むことはあるが，それだけである．

# F#: インデント

OCaml を .NET にしてインデント構文をぶち込んだ言語こと F# では，インデントの深さによって `in` と `;` を省略することができる．

```fsharp
let main _ =
  let y =
    let x = 3
    x * x
  printfn "%d" y
  printfn "Hello!"
```

えーっめっちゃきれいじゃん．これセミコロンが省略できる C 系言語，たとえば Kotlin―

```kotlin
val y = {
  val x = 3
  x * x
}
println(y)
println("Hello!")
```

―みたいでだいぶイカしている．

以上の例でわかるように F# では `in` と `;` を省略可能にすることで，変数宣言と逐次実行の見た目上の違いが薄く，Kotlin で変数宣言や式文に `;` がいらないのに似て親しみやすいコードを書くことができる．

# Rust: `;`

C++ と OCaml を混ぜて所有権をぶち込んだ言語こと Rust では，逐次実行および変数宣言の文法は C++ に近くなっている．文という概念があり，式文 `式;` があり，ブロック `{}` もあり，変数宣言は `let 変数名 = 式;` と，セミコロンを必要とする．

```rust
fn main() {
  let y = {
    let x = 3;
    println!("{}", x);
    x * x
  };
  println!("{}", y);
  println!("Hello!");
}
```

ブロックの中で最後の式の値がブロック全体の値になるのだが，よく見ると最後の式には `;` がついていない．これは `x * x;` としたらそれは文になってしまうからなのだが，そんなことよりこれはさっき見たような見た目だ．そう，OCaml の `;` である．

```ocaml
let () =
  let y =
    let x = 3 in
    print_endline "%d" 3;
    x * x
  in
  print_endline "%d" y;
  print_endline "Hello!"
```

最後の式には `;` も `in` もつけないのだった．

以上のように，Rust では 変数宣言の末尾も式文も `;` にすることで変数宣言と逐次実行の統一感を出している，というか C 系の言語はほとんどがそうなので，結果的に親しみやすい．C 系言語からみて違和感のあるブロック末尾式の仕様はどことなく OCaml を彷彿とさせる．

# まとめ

変数宣言と逐次実行は別物なのだが，似たような見た目をしていると直感にうれしいのでそうさせたい人たちがいる．OCaml はその動きに真っ向から反発していて面白い．式指向ブロックなし free-form 言語 (ちなみにフリーフォーマットは和製英語の可能性がある) でもっとこの 2 つを似た見た目にしてみたいが，どうやったらいいかは知らない．プログラミング言語作りたいなあ，作れよ．