# 한걸음 — TOPIK 1–6 vocabulary and grammar

A static study app: no framework, no build step.

- **Vocabulary** — 300 core words (50 per level), each with its hanja (漢字) or loanword source, part of speech, English meaning and two example sentences with translations. Word list, flashcards and quiz.
- **Grammar** — 90 patterns (15 per level) with meaning, formation rule, usage notes and two examples. Pattern list and quiz.
- **Word index** — 7,342 entries from the NIKL (2003) and TOPIK (2015) public vocabulary lists with hanja, searchable. Reference only: no definitions.
- Listen buttons use the browser's Korean text-to-speech. Progress is stored in the browser (localStorage).

## Run locally

```
npx serve .
```

(Opening `index.html` directly from disk will not work, because the app fetches its data files.)

## Deploy to Vercel

Option A — CLI:

```
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

Option B — Git: push this folder to a GitHub repository, then in Vercel choose **Add New → Project**, import the repo, keep Framework Preset = **Other**, leave Build Command and Output Directory empty, and deploy.

## Add your own content

Data lives in `data/` as plain text, one entry per line, fields separated by `|`.

Vocabulary (`v1.txt` … `v6.txt`):

```
word|origin|pos|meaning|Korean sentence=English translation|Korean sentence=English translation
여행|旅行|n|travel, trip|저는 여행을 좋아해요.=I like traveling.|…
```

- `origin`: hanja (`旅行`, `工夫+하다`), a loanword source (`Eng. bus`, `Ger. Arbeit`), or empty for a native Korean word.
- `pos`: `n`, `v`, `adj` or `adv`.

Grammar (`g1.txt` … `g6.txt`):

```
pattern|meaning|formation|usage note|Korean sentence=English translation|Korean sentence=English translation
```

Do not use `|` inside a field, and use `=` only between a sentence and its translation.

## Sources and notes

- `data/index.json` is derived from `results.tsv` in [julienshim/combined_korean_vocabulary_list](https://github.com/julienshim/combined_korean_vocabulary_list) (MIT-licensed code; the underlying lists belong to the National Institute of Korean Language and the TOPIK organizers).
- TOPIK publishes vocabulary only as TOPIK I / TOPIK II, not per level 1–6. The per-level placement of the 300 core words and 90 grammar patterns here follows common textbook sequencing and is a study guide, not an official list.
