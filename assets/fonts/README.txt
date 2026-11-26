Jiyi Serif — a tiny local subset of Noto Serif SC

Glyphs in this file:
  季 忆 春 夏 秋 冬 花 小 礼 物 左 右 旋 转

Why: the brand, the large season glyphs and the small Chinese labels must look
identical on iOS, Android, Windows and macOS. Noto Serif SC is used as the
drawing source, then subset down to a 7 kB WOFF2 (the variable weight axis is
kept, weight 400–700).

Source typeface: Noto Serif SC
  https://fonts.google.com/noto/specimen/Noto+Serif+SC
License: SIL Open Font License 1.1
  https://openfontlicense.org

Regenerate (from the project root, with fontTools installed):

  python -m fontTools.subset path/to/NotoSerifSC-VF.ttf \
    --text="季忆春夏秋冬花小礼物左右旋转" \
    --flavor=woff2 --output-file=assets/fonts/jiyi-serif.woff2 \
    --layout-features="" --no-hinting --desubroutinize

If you add more Chinese characters to the interface, add them to --text and
regenerate; anything not in the subset falls back to the system serif.
