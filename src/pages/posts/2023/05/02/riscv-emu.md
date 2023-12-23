---
layout: "../../../../../layouts/BlogPostLayout.astro"
title: "Arch Linux (x86_64) 上でRISC-Vアセンブリをシュッと動かす"
tag: ["Arch Linux", "RISC-V"]
synopsis: "❤️逆張りオタクなのでRISC-Vが好きだけどRISC-Vのほうは俺のこと嫌ってるらしい"
---

ぼくは逆張りのオタクなのでプログラムの例としてアセンブリを出したいときには新進気鋭のオープンISA (命令セットアーキテクチャ) として知られるRISC-Vを使おうという気持ちになりがち。今回意を決してRISC-Vプログラムを **シュッと** 実行できる環境を構築してみたので共有する。

# ツール類

手順としては、書いたプログラムをコンパイラ/アセンブラでriscv64をターゲットにコンパイルないしアセンブルし、得られたバイナリをシミュレータ上で実行する。

## クロスコンパイラ

一般に種類 (OS, ISAなど) が異なるシステムで実行するためのプログラムをコンパイルすることをクロスコンパイルという。今回はx86_64システム上でriscv64システムのためのプログラムをコンパイルするので、そのようなツールを持ってくる。

`pacman -Ss riscv64` を見ればわかるとおり、Arch Linuxでは公式リポジトリにいくつかRISC-V 64bit向けツールチェインが用意されている。パッと見でコンパイラっぽいものは `riscv64-elf-gcc` と `riscv64-linux-gnu-gcc` とあるが、ここでは `riscv64-elf-gcc` を使うことにする。こちらはsynopsisにもあるようにベアメタル (bare metal) 環境を想定しており、シミュレータ側のセットアップが楽だ。`linux-gnu-gcc` のほうは一般的に使われるGNU/Linux環境向けのツールチェインで、実行時にglibcの動的リンクを解決する必要があり手間がかかる[^gnu]。

[^gnu]: というかさっき試したんだけど `/lib/ld-linux-riscv64-lp64d.so.1` が見つからないと言われる、qemuから `LD_LIBRARY_PATH=/usr/riscv64-linux-gnu/lib` を設定してもだめだった。これだから動的リンクは嫌いなんだ〜

`sudo pacman -S riscv64-elf-gcc riscv64-elf-newlib` として導入する。newlibというのは組込みとかに使えるlibcで、実行ファイルに静的リンクできるので扱いが楽。これがないと `#include <stdio.h>` が見つからねえとか言ってコンパイルできない。こういうのだとmuslが有名だけどなんかないらしい。

## シミュレータ

仮想的にRISC-V ISAを実行するソフトウェア。Webブラウザ上で動作するものもいくつか存在するが、今回はせっかくなのでLinuxシステム上で動作するものを選ぶ。

RISC-Vバイナリを実行できるシミュレータ・エミュレータにはRISC-V専用シミュレータのSpikeと汎用エミュレータのQEMUがある。Spikeを使う場合はSpike上でriscv-pkというELF実行ファイルを実行するためのプラットフォームを走らせ、その上でアプリケーションを動かすことになる。Archの公式リポジトリにはSpikeこそあるがriscv-pkがなく、AURもしくはGitHubリポジトリからビルドしてくる必要がある[^nix-pk]。

[^nix-pk]: 今見たらNixpkgsにはあった

QEMUを使う場合フルシステムエミュレーションとユーザーモードエミュレーションの2つから選ぶ必要があるわけだが、今回はx86_64 Linux上でriscv64 Linux の実行ファイルを実行するだけなのでユーザーモードで十分と判断した。フルシステムの場合は `chroot` 内で `pacstrap` するとか Fedoraの既製品を落としてくるかしてディスクイメージを用意してそこから起動したりする必要があり、ただ簡単なRISC-Vアセンブリの動作確認がしたいだけなのにそこまで大掛かりなのはシュッとでないため嫌感がある[^fs-gnu]。ちなみに Arch では `qemu-user` パッケージを入れるとあらゆるISAのエミュレータが降ってくる。いらねえ

[^fs-gnu]: ただGNU/Linuxをフルシステムエミュレーションすると `riscv64-linux-gnu` でコンパイルしたdynamically-linkedな実行ファイルが普通に実行できると思う、というか仮想マシン内で普通にコンパイルとかできちゃう

### spike + riscv-pk

`spike` をインストール。とくに難しいことはない。

```shell
❯ sudo pacman -S spike
```

riscv-pkリポジトリをクローンする。treeを浅く取る。

```shell
❯ gh repo clone riscv-software-src/riscv-pk -- --filter=tree:0
```

適当なディレクトリでビルド作業を行っていく。リポジトリ直下以外ならなんでもいいそうだが、`riscv-pk/build` が安定択かと。

```shell
❯ cd riscv-pk
❯ mkdir build && cd build
```

`configure` のオプション `--prefix` にはインストール先を指定しておく。どこでもOKだがあとで打ちやすい場所にしておくとよい。

`--host` にはコンパイルで使うツールチェインを指定する。今回使っているツールチェインは `riscv64-elf` で始まるのでそう指定する (ケツハイフン不要)。環境が違うなどでコマンド名が `riscv64-unknown-elf-gcc` になっている場合はちゃんとそれに合わせる。riscv-pkはRISC-V上で実行するプログラムなのでx86_64用のGCCでコンパイルしようとしないこと[^x86-pk]。

[^x86-pk]: 1敗！ｗ

```shell
❯ ../configure --prefix=/hogehoge --host=riscv64-elf
❯ make
❯ make install
```

RISC-Vプログラムを実行するには `spike <PKへのパス> <実行ファイルへのパス>` とする。出力にはBBL (Barkley Boot Loader) がどうとかみたいなメッセージが出るので無視する。

### QEMU

`qemu-user` を入れる。

```shell
❯ sudo pacman -S qemu-user
```

プログラムを実行するには `qemu-riscv64 <実行ファイルへのパス>` とする。

# アセンブラを書く

以下は階乗を求めるプログラムです[^shiki]。ウワー！非構造化プログラミング[^unstructural]！

[^unstructural]: `loop` ラベルを使うことに思い至らず `j fact` した結果無限ループに陥って2時間ぐらい頭を捻っていた　マジで非構造化プログラミングヤバい
[^shiki]: [Shiki.js RISC-Vのシンタックスハイライトあってワロタ](https://github.com/shikijs/shiki/blob/main/docs/languages.md#all-languages)

```riscv
.globl fact # あとでコンパイルするときCから見えるようにする

fact: mv t0, a0
      li a0, 1
loop: beqz t0, exit
      mul a0, a0, t0
      addi t0, t0, -1
      j loop

exit: ret
```

ちなみに `beqz` とか `j` とか `mv` は RISC-V ISAには入ってない疑似命令で、どっか (たぶんアセンブラ) で展開されるっぽい。

さらに本来汎用レジスタは `x0` から `x31` という名付けでプロセッサからは同じようなものなんだけどRISC-V ABI (Application Binary Interface) 的にはそれぞれ別の役割があり、たとえば `x1` はリターンアドレスを保持する `ra`、`x5` は一時利用の `t0`、`x10` は関数の引数であり返り値でもある `a0`、というように別名がついていて、実際みんなその規則に従っているのでその名前でプログラミングしたほうが行儀がよいという[^riscv-abi-reg]。

[^riscv-abi-reg]: https://github.com/riscv-non-isa/riscv-asm-manual/blob/master/riscv-asm.md#general-registers

# コンパイル

アセンブリだと標準出力がダルいのでCからアセンブリで書いた関数を呼び出して出力するという体にする。

```c
#include <stdio.h>

int fact(int n);

int main(char *argv) {
  printf("%d\n", fact(10));
}
```

頭WebエンジニアなのでCのプロトタイプ宣言がマジでTypeScriptの.d.tsファイルに見える。

コンパイルする。

```shell
❯ riscv64-elf-gcc fact.s main.c
```

`a.out` が出てくる。実行方法は上に書きましたね。`3628800` が出たらおk。

# 感想

低レイヤーなソフトウェアのレイヤー感が掴めず<ruby><rb>四苦八苦</rb><rt>SICK&ensp;HACK</rt></ruby>しすぎてきくりお姉さんになった[^sickhack]。結局適当にデフォルト設定でコンパイルしたELF形式の実行ファイルはqemu-system-riscv64にポン置きしても動かないってことでいいんだろうか？

[^sickhack]: この文は筆者が20歳未満で違法に飲酒をしていることを示唆するものではありません.
