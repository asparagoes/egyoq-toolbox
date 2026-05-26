# flashflow documentation

## What flashflow is

flashflow is a calm, text-first study app for recall cards, cloze blanks, multiple-choice quizzes, and small image-supported cards. It runs as a standalone browser tool and stores banks, ratings, skipped cards, queue position, review steps, filters, and settings in local browser storage.

The app helps by keeping one card as the center of attention. You can import a bank, reveal an answer, rate it, and come back through timed review steps or manual rating filters without building a study plan elsewhere.

## Main study flow

1. Import, paste, load a sample, or create a bank.
2. Read the card front.
3. Reveal with the center card zone, the reveal button, or Space.
4. Rate flashcards with `1 again`, `2 hard`, `3 good`, or `4 easy`.
5. Use previous to revisit the last current-bank card.
6. Use skip for unrated cards or forward for rated cards.
7. Export progress JSON before clearing browser data or moving devices.

## Controls

```text
space              reveal answer, then preview the question again
1 2 3 4            rate revealed cards, or choose quiz choices before reveal
a b c d ...        choose matching quiz choice letters
arrow up/down      move the keyboard quiz choice target
enter              submit typing, choose/toggle quiz choice, or check multi-answer quiz
<                  previous card in the current bank only
>                  skip or forward
escape             close open modals or image preview
```

Card zones:

```text
left side          previous
center             reveal or question preview
right side         skip or forward
```

Buttons, quiz choices, images, and menus do not trigger card zones.

## Card types

### Regular cards

Use regular cards for direct recall.

```csv
type,front,back,accepted,explanation,tags
regular,what organ filters blood?,kidney,kidney|renal,the kidneys filter blood and regulate fluid balance,physiology
```

Typing mode works on regular cards. Accepted answers can be separated with `|`.

### Cloze cards

Use cloze cards when the answer belongs inside a sentence.

```csv
type,text,answer,explanation,tags
cloze,This is a [[cloze]] card.,cloze,the hidden word appears as a blank first,syntax
```

Front:

```text
This is a _____ card.
```

Reveal:

```text
This is a cloze card.
```

The restored cloze word is underlined on the card. Typing mode accepts the hidden term or the full revealed sentence.

### Quiz cards

Quiz cards use a stem, contiguous choice columns, an answer, and an optional explanation.

```csv
type,stem,A,B,C,D,answer,explanation,tags
quiz,which button moves through a rated card?,again,previous,forward,minimal,C,forward moves without changing the rating,quiz
```

Single-answer quizzes grade immediately when a choice is selected.

### Multi-answer quiz cards

Use `A|C`, `A, C`, `1|3`, or exact choice text for multi-answer quizzes.

```csv
type,stem,A,B,C,D,E,answer,explanation,tags
quiz,which formats can flashflow paste?,csv,video,tsv,markdown table,pdf,A|C|D,csv tsv and markdown tables are supported,import
```

Multi-answer quizzes wait for the check button. The selected set must exactly match the correct set.

### Image-supported cards

flashflow is text-first, but card text, choices, explanations, and image fields can include public image links.

```csv
type,front,back,tags,image,imageBack
regular,what view is shown?,front and back images,images,https://drive.google.com/file/d/FILE_ID/view?usp=sharing,https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

Google Drive links are converted internally to:

```text
https://drive.google.com/thumbnail?id=FILE_ID&sz=w1600
```

The file must be shared publicly or as anyone with the link. If it is private, the card shows image unavailable guidance.

Markdown image syntax also works:

```markdown
![slide front](https://drive.google.com/file/d/FILE_ID/view?usp=sharing)
```

Click or tap a card image to open a large preview. Right-click or long-press an image for open, copy link, save, and share actions when supported by the browser.

## Mixed bank format

Rows can be mixed in one CSV, worksheet, pasted table, or created bank. The recommended wide header is:

```csv
type,front,back,text,stem,A,B,C,D,E,answer,accepted,explanation,tags,image,imageBack
```

The `type` column is optional. If it is missing, flashflow detects each row:

- quiz: has `stem`, choice columns, and valid `answer` or `correct`.
- cloze: has `text` with `[[answer]]`.
- regular: has `front/back`, `q/a`, or compatible answer fields.

Saved state still uses `card.tag` internally for compatibility, but the UI, exports, examples, and docs call the field `tags`.

## Importing

### CSV

CSV import creates one bank from the file.

Supported regular-card fields:

```text
front/back
q/a/tag
Stem/Answer/Explanation
accepted/answers
text with [[cloze]]
tags
image/imageBack
```

### XLSX

XLSX import reads every valid worksheet as one bank. Each worksheet can contain mixed card rows. Empty or invalid summary sheets are skipped.

Choice columns should start at `A` and continue without gaps:

```text
Stem | A | B | C | D | Answer | Explanation | Tags
```

### Paste CSV/table

Paste import accepts:

- CSV text.
- TSV or copied spreadsheet rows.
- simple Markdown pipe tables.
- copied HTML tables from spreadsheet apps.

Markdown table example:

```markdown
| type | front | back | tags |
| --- | --- | --- | --- |
| regular | what is active recall? | retrieving from memory | basics |
```

## Rating and review

Ratings:

```text
1 again
2 hard
3 good
4 easy
```

Stats:

- learned: fully learned cards.
- repeating: cards that are not fully learned.
- skipped: skipped cards.

Timed review steps are on by default for new state:

```text
again 1 minute
hard 5 minutes
good 7 minutes
easy 10 minutes
fully learned after 3 consecutive easy ratings
```

When timed review is on, rated cards become due after their delay. If no card is due but reviewable cards still exist, flashflow continues with the queue instead of forcing a wait. If every card reaches the easy streak threshold, the bank shows bank complete.

When timed review is off, use the card filter:

```text
all new again hard good easy skipped learned repeating
```

## Typing mode

Typing mode works on regular and cloze flashcards. It is hidden for quiz cards.

Settings:

- typing mode: show the answer box.
- auto-rating proposal: propose a rating after Enter.
- case sensitive answers: compare exact case.

When typing mode is turned on, auto-rating is enabled by default unless the user has manually turned it off.

## Quiz behavior

Basic quiz mode:

- correct answer rates easy.
- wrong answer rates again.
- reveal without choosing counts as again.

Adaptive quiz mode:

- wrong answers propose again.
- correct answers propose easy, good, hard, or again based on answer speed.
- longer stems and choice sets get more time.
- proposed ratings can be overridden with rating buttons or `1/2/3/4`.

Correct quiz answers receive a green tint after grading. Wrong selected choices are marked separately.

## Manager

Compact manager shows the common controls:

- current bank selector.
- bank selection and create bank.
- import CSV/XLSX.
- sample dropdown.
- paste CSV/table.
- settings tabs.
- card search/filter/list.
- export and restore.

Advanced manager adds:

- rename bank.
- single-bank delete.
- detailed card edit actions.

Card selection and bank selection both include select visible, clear, and delete selected. Select visible respects the current visible list and card search/filter.

## Bank builder

Create bank opens a spreadsheet-style modal. Add row types with quick buttons:

- regular row.
- cloze row.
- quiz row.
- image row.
- mixed set.

Each row can hold:

- front, cloze text, or quiz stem.
- back answer.
- choices, one per line.
- answer or multi-answer key.
- tags.
- explanation.
- front image.
- answer image.

Saving the builder normalizes rows through the same parser used by imports.

## Card tools

Card menu tools are optional and off by default. When enabled:

- copy is visible on the card face.
- edit and delete are inside the ellipsis menu.
- tools are placed inside the colored card face.

Copy question copies the current question text. Copy answer copies the revealed answer; for cloze cards this copies the full revealed sentence.

## Export and restore

Cards CSV exports the active bank.

Progress JSON exports:

- all banks.
- ratings.
- skipped state.
- queues and active card.
- active bank.
- settings.
- review history.

Restore JSON replaces local flashflow state with the saved progress file.

## Samples

`sample-bank.csv` is a small quick-start mixed deck.

`sample-bank.xlsx` is a larger workbook with sheets for:

- start here.
- regular cards.
- cloze typing.
- single quiz.
- multi quiz.
- drive images.
- mixed layout.
- keyboard touch.
- bank builder.
- review steps.

Choose the sample type in the manager dropdown, then select load sample.

## AI prompt for making banks

```text
Create a FlashFlow-compatible mixed study bank as a CSV table. Use this header: type,front,back,text,stem,A,B,C,D,E,answer,accepted,explanation,tags,image,imageBack. Include regular cards, cloze cards using [[answer]], single-answer quiz rows, multi-answer quiz rows using A|C syntax, tags, accepted answers, concise explanations, and optional public Google Drive image links. Keep explanations short and do not repeat the answer exactly.
```

## Use-case examples

### Lecture recall

Make rows with `front`, `back`, `accepted`, `explanation`, and `tags`. Study normally, then filter again and hard cards for focused cleanup.

### Slide or histology image review

Put public image links in `image` and `imageBack`. Ask the identification question in `front`, then reveal the answer image and explanation.

### Exam-style MCQ practice

Use `Stem`, choice columns, `Answer`, and `Explanation`. Single-answer questions grade immediately; multi-answer questions require check.

### Memorizing terms inside sentences

Use cloze syntax like `The [[kidney]] filters blood.` Typing accepts `kidney` or the full sentence.

### Mixed topic bank

Use one worksheet per topic and mix regular recall, cloze, MCQs, and image cards in the same sheet.

## Troubleshooting

- Keyboard shortcuts do nothing: click the card once or close open modals. flashflow blurs controls after bank changes and shortcut actions.
- Quiz letters do not match: verify choice columns begin at `A` and continue without gaps.
- Multi-answer quiz grades wrong: selected choices must exactly match all correct choices.
- Image does not show: make the Drive file public or shared as anyone with the link.
- Sample loading fails from `file://`: run the toolbox through a local server or import the sample file manually.
- Explanation disappears: flashflow hides explanation text when it duplicates the answer exactly.
- Progress is missing: browser storage may have been cleared; restore from progress JSON if available.
