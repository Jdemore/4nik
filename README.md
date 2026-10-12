# BIOL 1030 Midterm 1 Study Site

Interactive study guide for Environmental Science Midterm I, built from the
instructor's study guide and the seven graded quizzes.

## Run it

Open `index.html` in any browser. No build step, no server, no dependencies.
Progress (practice results, flashcard marks, filters) is saved in the browser's
localStorage only.

## Sections

- **Study Guide** - chapter by chapter, matched to the exam guide. Every exam-guide
  question is answered (click to reveal). Each chapter also shows the quiz questions
  you missed, its key concepts, and its vocabulary.
- **Vocab** - master vocabulary table (402 terms), sortable by term or chapter,
  filterable by chapter and text.
- **Concepts** - master concept table (85 concepts), same controls.
- **Flashcards** - choose chapters; deck can be vocab, concepts, both, or the
  exam-guide questions; flip term-first or definition-first; mark Know it / Still
  learning and drill only the ones still learning. Keyboard: space, arrows, 1, 2.
- **Practice** - all 187 quiz questions sorted by chapter with select-the-answer
  grading, explanations, and filters (missed on the real quiz, got wrong here, not yet
  answered correctly). Matching questions use dropdowns; the essay shows the model answer.
- **Missed** - the 15 items you lost points on, with your answer, the correct answer,
  and why, plus a quiz score summary.
- **Search** - header box searches vocab, concepts, guide answers, and questions.

## Files

- `js/data-chapters.js` - chapters: overview, guide Q and A, vocab, concepts
- `js/data-questions.js` - quiz questions (`missed: true` marks ones you got wrong)
- `js/app.js` - rendering and state
- `css/style.css` - styles (light and dark mode)

To add a question or term, edit the data files; the UI picks it up automatically.
