#!/bin/sh
# 取得釘選的 XYZ.js v1.25.0 至 .deps/XYZ.js，並確認 commit 未被改寫。
set -eu

tag=v1.25.0
commit=63c917aafa17d8704bfb4d4f5ed871a4ed7d6010
dir=.deps/XYZ.js

if [ ! -d "$dir/.git" ]; then
  mkdir -p .deps
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$tag" https://github.com/JS-PACKAGE/XYZ.js "$dir"
fi

actual=$(git -C "$dir" rev-parse HEAD)
if [ "$actual" != "$commit" ]; then
  echo "XYZ.js 版本不符：預期 $tag ($commit)，實際 $actual" >&2
  exit 1
fi
echo "XYZ.js $tag ($commit)"
