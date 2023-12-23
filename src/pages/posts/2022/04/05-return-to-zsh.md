---
layout: "../../../../layouts/BlogPostLayout.astro"
title: "fishをやめてzshに戻った"
synopsis: "zshはプラグインマネージャが乱立していてその管理がつらいという欠点が、fishには既存シェルスクリプトとの互換性がないという欠点がある。好きな地獄を選んでよ"
---

純粋関数型パッケージマネージャとして知られる Nix を重用し home-manager で dotfiles を管理していたころ (とその前) は zsh を使っていたのだが、Nix のつらさを感じてきて WSL2 に Arch Linux をインストールし、Nix から離れるようになって、fish を使うようになった。fish を選んだ理由は設定不要でいい感じに使えるソフトウェアが好きだから。インストールしてきてそのまま見た目のよいシェルが手に入るのはとてもよいことだ。

しかしやっぱり Nix が恋しい、Nix に戻りたい、reproducible build 最高という気持ちが起きはじめてきたため、Nix をふたたびインストールする機運が生じた。そこで気づいたのだが、Nix のパスを通すなど重要な操作を行うファイル `/etc/profile.d/nix.sh` は fish では実行できない。なんかよくわからないツールをインストールすると fish でも実行できるらしいのだが、設定不要だから使っていたのに結局設定が必要なんて、という気分になった。ゆえに私は zsh に戻ってきたのである。

# 移行作業

まずは macOS のほうから進めることにした。まだ記事にしていないが dotstingray という dotfiles マネージャをつくり利用しているので、それを zsh に対応させる (この作業は 1 分で終わるし GitHub 上のコードエディタでも十分できるし最悪やらなくてもよい) ことをした。その後 fish.config を見ながら .zshrc と .zshenv を書いた。

## .zshenv

PATH の設定を行う。主に .NET やらが導入する実行ファイルを通すわけだが、よく考えると Nix があればプロジェクト単位で PATH に入れる物体を制御できるしこれも不要な気がする。

```
path=(
    ~/.dotnet/tools
    ~/.ghcup/bin
    ~/.cabal/bin
    ~/.cargo/bin
    $path
)
```

## .zshrc

zsh の嫌いなところはプラグインを管理するのがだるいところだ。パッケージマネージャで導入すると Homebrew と pacman でパスが変わって環境ごとに `/usr/local/share` と `/usr/share/zsh/plugins/` を打ちわける必要が生じることに気づいて発狂する。そしてプラグインマネージャは乱立している。まあ、とはいっても antigen と zplug はリポジトリを見るとコミットが 1 年以上なくサスティナビリティに不安感を感じたので候補から外れ、zinit を使うことになった。zinit のほうも今年 (2022) のはじめあたりに作者が organization ごと爆破するという事件があったらしいが、現在は生きているのでまあたぶん大丈夫だろう。きっと。

zinit は公式が提供している `curl` を `sh` する手順で飛んでくるインストーラの行儀が悪く、勝手に .zshrc に追記してくるのだが、追記してくる内容が「zinit が入ってなかったら入れ、zinit を起動」というもので、「これを最初から .zshrc に書いておけば `curl` を `sh` なんてする必要ないじゃないか！！！」とおもわず叫んでしまった。そんなわけで .zshrc の先頭に以下が書いてある。

```
# If there is no zinit installation, install it
if [[ ! -f $HOME/.local/share/zinit/zinit.git/zinit.zsh ]]; then
    print -P "%F{33} %F{220}Installing %F{33}ZDHARMA-CONTINUUM%F{220} Initiative Plugin Manager (%F{33}zdharma-continuum/zinit%F{220})…%f"
    command mkdir -p "$HOME/.local/share/zinit" && command chmod g-rwX "$HOME/.local/share/zinit"
    command git clone https://github.com/zdharma-continuum/zinit "$HOME/.local/share/zinit/zinit.git" && \
        print -P "%F{33} %F{34}Installation successful.%f%b" || \
        print -P "%F{160} The clone has failed.%f%b"
fi

# Load zinit
source "$HOME/.local/share/zinit/zinit.git/zinit.zsh"
```

追記されるバージョンは末尾に入る=`compinit` の後に実行される関係で [`compinit` のあとに書く場合専用のスニペット](https://github.com/zdharma-continuum/zinit#manual-installation) が入っているが、この場合はそんなことをするのは無駄なので先頭に書いてこのスニペットは省いている。

補完を起動、`cd` の省略、ヒストリの重複を除去、スペースから始まるコマンドはコマンド履歴に追加しない。

```
autoload -U compinit; compinit

setopt auto_cd

setopt hist_ignore_all_dups
setopt hist_ignore_space
```

入れるだけでいい感じになるプロンプトの starship、ディレクトリ履歴をファジーサーチする zoxide、コマンド履歴をファジーサーチする mcfly を導入。それぞれ `zi` コマンドと Contorl-R で発動し、いい感じに動いてくれる。

```
eval "$(starship init zsh)"
eval "$(zoxide init zsh)"

export MCFLY_FUZZY=2
export MCFLY_INTERFACE_VIEW=BOTTOM
eval "$(mcfly init zsh)"
```

`chpwd` 関数を定義するとディレクトリを移動したときに実行されるのだが、リッチな `ls` の `lsd` をここに差し込むことでディレクトリ移動のたび `ls` する手間を省ける。めちゃくちゃエントリの多いディレクトリをどう扱うかは要検討。

```
chpwd() {
    lsd --long --classify --date "+%F %T"
}
```

zinit をつかってプラグインを読み込む。`zinit ice wait` すると次のプラグインを非同期に読み込むので起動が早くなる。

```
zinit ice wait
zinit light zsh-users/zsh-autosuggestions

zinit ice wait
zinit light zdharma-continuum/fast-syntax-highlighting
```

# まとめ

bash 非互換シェルを作るのはきついと感じた。まったく新しい正気なシェル言語を作りたいような気もするが後方互換性という悪魔がぜんぶ悪くてやるきがでない。

この記事の一番の価値は zinit の最もまともなインストール方法がわかるところな気がする。
