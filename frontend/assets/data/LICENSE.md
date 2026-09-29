# KanjiVG stroke data

The ordered stroke paths in strokes.json are derived from
[KanjiVG](https://kanjivg.tagaini.net/), by Ulrich Apel and KanjiVG contributors.

Source: https://github.com/KanjiVG/kanjivg/tree/master/kanji

License: [Creative Commons Attribution-ShareAlike 3.0 Unported
(CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/)

Changes: SVG paths were extracted in original stroke order, grouped by
character, and serialized as JSON for 142 kana and 20 beginner kanji.
SVG grouping, stroke-number layout and other metadata were not copied.
The derived data remains available under CC BY-SA 3.0.

The interface provides attribution and license links beside the writing
notebook. This license applies to the derived stroke data.

# JMdict word list (Shiritori)

`shiritori-words.json` is derived from [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html),
the property of the Electronic Dictionary Research and Development Group,
distributed through [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
(common-words edition).

License: [Creative Commons Attribution-ShareAlike 4.0 International
(CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/), per the
[EDRDG licence statement](https://www.edrdg.org/edrdg/licence.html).

Changes: only common nouns with a kana reading of 2–8 characters were kept;
vulgar, derogatory, sensitive, archaic and obsolete entries were removed; each
entry keeps only its reading and usual written form (no glosses). Regenerate with
`node scripts/build-shiritori-words.js <jmdict-eng-common.json>`. The derived list
remains available under CC BY-SA 4.0. Attribution appears on the game setup screen.
