# Tutoring Quiz Viewer

Open `index.html` in a modern browser or host the folder on any static web host.

## Files
- `index.html` interface
- `style.css` minimalist responsive design
- `script.js` Markdown parser, timer, timeout lock, answer viewer, and tutor PIN flow
- `sample-quiz.md` reusable content example

## Use
1. Open the website.
2. Choose a Markdown quiz.
3. Set the duration, warning threshold, and tutor PIN.
4. Preview if needed, then start the student session.
5. The quiz is hidden automatically when time expires.

## Important browser-only limitation
This version is designed for supervised tutoring convenience. It does not provide server-grade security. A technically skilled user with device access may inspect locally delivered content or alter browser storage. Do not use it for high-stakes examinations.

## Display updates
- Overall light theme
- All-questions and single-question viewing modes
- Answer viewer reconstructs each original question and its choices from the quiz block
- For MCQs, begin each matching answer with its choice letter, such as `Q1. B. Mitochondrion`; the viewer bolds and highlights that original choice

## Section and type headings
Place each part heading immediately before its first question, such as `## Part I. Multiple Choice`. In single-question mode, the heading stays with the first question in that part rather than appearing after the preceding question. Questions are displayed in bold. Use the A− and A+ controls to adjust quiz and answer-key text from 12px to 24px; the preference is remembered locally.

## Version 3 updates
- Part headings retain regular heading weight rather than forced bold styling.
- Questions and choices use a plain, borderless layout.
- Correct MCQ choices are bold in the answer viewer without colored boxes.
- After a correct tutor PIN is entered following timeout, tutor authorization remains active for that stored session. Moving between Quiz and Answers does not request the PIN again.
- Syntax Guide is renamed Generate bank and includes a copyable assessment-generation prompt plus the required Markdown syntax.

## Supported question types
Multiple choice, true or false, identification, matching type, enumeration, fill-in-the-blank, sequencing or ordering, short response, and essay are supported. Matching banks use `COLUMN-B:` followed by lettered terms; every matching prompt remains a numbered `Q` item so quiz and answer numbering stay universal. Student and Date lines have been removed from the sample and generator instructions.
