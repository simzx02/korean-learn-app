# KorLearn — TOPIK 1–6 vocabulary and grammar

A static study app: no framework, and no build step to deploy.

## What's in it

- **11,137 graded words** across six levels. Each level has 20 core units of 50 words (the most frequent words of that level, grouped by topic); levels 3–6 also have extension units holding the rest of that level's graded vocabulary.
- **248 grammar patterns** (36–48 per level). Each unit shows 20 of them: a few new ones plus review of earlier ones from the same level.
- Per unit: word list, flashcards, multiple-choice quiz, **typing test**, grammar list, grammar quiz.
- Every word shows its origin: hanja (여행 → 旅行), loanword source (버스 → bus) or native Korean.
- Search across all words by Korean, 漢字 or English.
- Listen buttons use the browser's Korean text-to-speech.
- Progress is stored in the browser (localStorage). **Export progress / Import progress** on the home page save and restore a backup file, and move progress between devices. Importing merges: it never lowers a word's status.

## Mascots

Six characters, one per level: PiPi the frog (1), Momo the cat (2), Bobo the puppy (3), Nini the rabbit (4), Koko the fox (5) and Tutu the hamster (6).

- Nothing is redrawn. The six poses (stand, walk, running, jump, sit, wave) and the icon of each character come from the supplied transparent pose files in the original design, imported by `tools/import_poses.py`. Everything is in `assets/mascots/<id>/`.
- Character data (names, colours, profile text, level) is one table, `LIST`, at the top of `shell.js`.
- The Mascots page shows the lineup, each profile and the six action poses. Picking a character changes the page's accent colour; inside a level the accent follows that level's character.
- On unit pages the level's character sits in the corner as a study buddy and uses all six poses: it stands while idle, waves to greet a unit or when clicked, jumps for a right answer, sits for a wrong answer or after 30 seconds without activity, walks when you move to the next question, and runs when a quiz starts or on every third right answer in a row.
- Each character has its own short sound (frog, cat, puppy, rabbit, fox, hamster), generated in the browser with Web Audio from the `VOICE` table in `shell.js`; there are no sound files. It plays on a click and on answers. The "Sound on / Sound off" button under the buddy mutes both the sounds and the spoken phrase.
- The hamster's sheet is labelled "Pipi"; the site calls it Tutu throughout, to avoid confusion with PiPi the frog.

## Where the content comes from

| Content | Source |
|---|---|
| Word list, level tier (초급 / 중급 / 고급), hanja and loanword origins, English definitions, Korean example sentences, topic categories | National Institute of Korean Language, **한국어기초사전 (Korean Learners' Dictionary)**, CC BY-SA 2.0 KR, via [spellcheck-ko/korean-dict-nikl-krdict](https://github.com/spellcheck-ko/korean-dict-nikl-krdict) |
| Frequency order inside a tier | [julienshim/combined_korean_vocabulary_list](https://github.com/julienshim/combined_korean_vocabulary_list) (NIKL 2003 + TOPIK 2015 lists) |
| 300 core words with English-translated example sentences (`content/v*.txt`) | written for this app |
| 90 grammar notes with form, usage and translated examples (`content/g*.txt`) | written for this app |
| 158 further grammar patterns: level and short gloss (`tools/grammar_extra.txt`) are from this app; definition and Korean examples are from the NIKL dictionary | mixed |

Things to know:

- The dictionary grades words in three tiers, not six levels. Here 초급 → levels 1–2, 중급 → 3–4, 고급 → 5–6, split by frequency. The six-level placement is a study sequence, not an official TOPIK list. (TOPIK itself publishes vocabulary only as TOPIK I / TOPIK II.)
- Example sentences taken from the dictionary are Korean only. Only the 300 hand-written words and 90 hand-written grammar notes have English translations of their examples.
- The level given to each grammar pattern follows common textbook sequencing; the dictionary does not grade grammar.
- No machine translation (Papago, Google Translate) was used.
- Because the dictionary data is CC BY-SA, the files in `data/` are shared under the same licence; keep the attribution in the page footer if you publish the site.

## Run locally

```
npx serve .
```

(Opening `index.html` directly from disk will not work, because the app fetches its data files.)

## Deploy to Vercel

```
npx vercel login     # first time only
npx vercel --prod
```

## Editing content

The site reads only `data/*.json`. Those files are generated, so edit the sources and rebuild:

- `content/v1.txt` … `v6.txt` — hand-written words: `word|origin|pos|meaning|Korean=English|Korean=English`
- `content/g1.txt` … `g6.txt` — hand-written grammar: `pattern|meaning|formation|usage note|Korean=English|Korean=English`
- `tools/grammar_extra.txt` — more grammar: `level|pattern as shown|dictionary headword|short English gloss`

Rebuild (needs Python 3 and git; the dictionary download is about 400 MB):

```
git clone --depth 1 https://github.com/spellcheck-ko/korean-dict-nikl-krdict.git krdict-src
git clone --depth 1 https://github.com/julienshim/combined_korean_vocabulary_list.git freq-src
python tools/parse_krdict.py krdict-src krdict.json
python tools/build.py krdict.json freq-src/results.tsv .
```

Keep `krdict-src`, `freq-src` and `krdict.json` out of the deployed folder (they are listed in `.vercelignore`).
