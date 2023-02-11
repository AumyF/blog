---
layout: "../../../../../layouts/BlogPostLayout.astro"
title: "作った: dotstingray / 巨大な可能性で殴ってdotfilesを管理する"
synopsis: "無限の拡張性を誇り素直なロジックが書けるdotfiles manager (110行ぐらい) を書いたよ"
---

# Intro - Dotfiles との格闘の歴史

.zshrc のような設定ファイル、いわゆる **dotfiles** は GitHub などにアップロードしておき、複数台のマシンでいい感じに共有したりしなかったりしたいものわけだが、その管理方法は人それぞれだ。

最も素朴でポータブルなのは UNIX シェルスクリプトで Git リポジトリからシンボリックリンクを貼る、またはコピーをする方法だが、シェルスクリプトを書くことは多大な苦痛をもたらし、ときに人を死に至らしめる。

Dotfiles 管理専用ツールもある。Chezmoi が有名だが、Git のようなコマンド体系を把握する必要があるし、ディレクトリ構造の規約が強く、また Go 由来の謎のテンプレート構文がある。

僕は以前は Dhall を使ってシェルスクリプトを文字列で組み立て `dhall-to-json` で JSON に変換し `jq` で繋げて実行するというかなり正気ではないソリューションを採用していたが、簡単なシェルスクリプトではディレクトリの存在を確認するといった機能に結局は限界があり破綻した。

Yaml でシンボリックリンクを定義して管理する方法もある。これはとても宣言的で簡単だが、OS による条件分岐や文字列結合処理といった複雑性が現れると途端に難解になるか不可能になり、処理を素直に書いたほうがよかったということになる (これは GitHub Actions をはじめとする YAML プログラミングの悪口だ)。なので、はじめから、十分な機能を持った汎用プログラミング言語で dotfiles を書けば良いのだ。

僕の求める dotfiles manager は、かなり原始的な API が公開されており、やりたいと思ったことはなんでも素直に書けば動き、必要に応じていくらでも複雑な処理が書ける。それでいて、シンボリックリンクを貼る、その前に対象ディレクトリが存在していることを確認する、といった定型的なタスクは簡潔に書けてほしい。暗黙的な規約はなく、書いたことがすべてであってほしい。セットアップするだけでなく、それがきちんと完了しているかチェックする仕組みも必要だ。

という要求を達成するために僕が作ったのが **[dotstingray](https://github.com/aumyf/dotstingray)** だ。

# Dotstingray の機能

Dotstingray は JavaScript/TypeScript 実行環境の [Deno](https://deno.land) で動くライブラリだ。Chezmoi のような CLI ツールではないため、ユーザーに多くの選択肢を与える。Deno を選んだのは、数少ない静的型付けでスクリプトのように書ける言語 TypeScript が使えること、エコシステムが伸びていることからだ。結局すべては TypeScript になっていくというわけ。このへんの領域で使える言語を作りたい気持ちもある。

単純なシンボリックリンクを貼る場合の定義を見てみよう。

```ts
// import mapsでよしなに
import { defineTask } from "dotstingray/core/mod.ts";
import { link } from "dotstingray/utils/mod.ts";

const home = Deno.env.get("HOME");

if (!home) throw new Error("$HOME is not set");

const deploy = defineTask([
  link({
    source: "./starship/starship.toml",
    destination: `${home}/.config/starship.toml`,
  }),
  link({ source: "./git/config", destination: `${home}/.config/git/config` }),
  link({ source: "./git/ignore", destination: `${home}/.config/git/ignore` }),
  link({
    source: "./neovim/init.lua",
    destination: `${home}/.config/nvim/init.lua`,
  }),
  link({ source: "./zsh/rc.zsh", destination: `${home}/.zshrc` }),
  link({ source: "./zsh/env.zsh", destination: `${home}/.zshenv` }),
  link({
    source: "./direnv/rc.sh",
    destination: `${home}/.config/direnv/direnvrc`,
  }),
]);
```

まあまあ宣言的ではなかろうか。

さて、ここからがキモで、`use` が返すオブジェクト (`Task` という名前をつけている) は stat と run という関数を生やしており、run することで use で指定した配置作業を、stat でその確認を行える。

```ts
if (Deno.args.includes("deploy")) {
  if (Deno.args.includes("run")) {
    await deploy.run();
  } else {
    await deploy.stat();
  }
} else {
  console.log(`unknown commands: ${Deno.args}`);
  Deno.exit(1);
}
```

# 内部を見る

Dotstingray が扱う処理の最小単位は `Action` といい、dotfiles 構築のために行われる処理を、処理そのものである `run` と、処理の結果を確認する `stat` の組み合わせとして扱う。たとえば「`./git/config` へのシンボリックリンクを `~/.config/git/config` に貼る」という `run` と「`~/.config/git/config` に `./git/config` へのシンボリックリンクが貼られていることを確認する」という `stat` をセットにする。

本質的には dotstingray の `defineTask` は `Action` を組み合わせるだけの処理だ。

```ts
export type Action = { run: () => Promise<void>; stat: () => Promise<Stat> };

export type Stat = { name: string } & (
  | { ok: true; message?: undefined }
  | { ok: false; message: string }
);
```

実は `link` は `Action` を返す。

```ts
import { ensureDir } from "std/fs/mod.ts";
import { dirname } from "std/path/mod.ts";
import { Action } from "../core/mod.ts";

/** Given a `source` and a `destination`, returns `Action` which represents symbolic link from `source` to `destination`. */
export const link = ({
  source,
  destination,
}: {
  source: string;
  destination: string;
}): Action => ({
  run: async () => {
    await ensureDir(dirname(destination));
    await Deno.symlink(await Deno.realPath(source), destination);
  },
  stat: async () => {
    let path: string;

    try {
      path = await Deno.readLink(destination);
    } catch (e) {
      return { name: destination, ok: false, message: e.message };
    }

    let sourcePath: string;
    try {
      sourcePath = await Deno.realPath(source);
    } catch (e) {
      return { name: destination, ok: false, message: e.message };
    }

    if (path === sourcePath) {
      return { name: destination, ok: true };
    } else {
      return {
        name: destination,
        ok: false,
        message: "symlink does not point the destination",
      };
    }
  },
});
```

単純にシンボリックリンクを作るだけでもいろいろ考えることがあって大変なのだが、それを閉じ込めておける。ともかく、`link` は `defineTask` に渡す `Action` を作るのに便利な関数にすぎないわけ。

逆に、`run` を手書きすれば Deno ができることはなんでもできる。`fetch` でネットワーク経由でファイルを取得したり、複数の文字列を結合してから書き込んだり、`apt` `pacman` `brew` `nix` などを実行したり、デフォルトシェルを変更したりしてもよい。その代わり `stat` は手書きする必要がある。ソフトウェアのインストールをする場合は `--version` するのが手軽だろう。繰り返し使われる `Action` のパターンは関数として切り出すことで再利用して嬉しくなれる。

# Outro - 今後の展望

`defineTask` だけ見ればほぼ完成しているといってもいいのだが、まだもうちょっと API に洗練の余地がありそうなので使いながら考えていきたい。

それとは別に便利ユーティリティをたくさん生やしていくことで、XDG Base Directory に厳密に従った結果 macOS では `~/Library/Application Support` 配下に設定を置くことを要求してくる面倒なソフトウェア[^1]にも対抗できるようにしたい。

[^1]: lazygit とか
