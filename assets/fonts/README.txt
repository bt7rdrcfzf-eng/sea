Jiyi Serif — Noto Serif SC subset used by 季忆

This file covers the Chinese used across the page: the brand, the large season
glyphs, the gift dialog, the hint, and the season letter page. 250 glyphs,
~84 kB, variable weight axis 400–700 kept.

Charset source of truth: assets/fonts/page-chars.txt
  (generated from index.html, letter.html, assets/js/app.js, assets/js/world.js)

Source typeface: Noto Serif SC
  https://fonts.google.com/noto/specimen/Noto+Serif+SC
License: SIL Open Font License 1.1
  https://openfontlicense.org

Regenerate from the project root (fontTools + brotli):

  python -m fontTools.subset path/to/NotoSerifSC-VF.ttf \
    --text-file=assets/fonts/page-chars.txt \
    --flavor=woff2 --output-file=assets/fonts/jiyi-serif.woff2 \
    --layout-features="" --no-hinting --desubroutinize

If you add Chinese copy to the page, add the characters to page-chars.txt and
run the command again. Characters outside the subset fall back to the system
serif; the Latin UI keeps the system/sans stack.
