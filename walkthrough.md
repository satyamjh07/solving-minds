# CBT Engine Upgrade & Fidelity Improvements — Walkthrough

## Overview

We have resolved 4 critical flaws in the CBT (Computer Based Test) engine to align it exactly with the official NTA (National Testing Agency) JEE Main portal guidelines:

1. **Option Selection Bug resolved**: Option elements were converted from `<label>` to `<div>` with `select-none` to prevent accidental text highlights and double click events that were toggling selections back to null. The option is now correctly retained, saved on cloud progress, and restored upon jumping.
2. **Subject/Subsection Navigation rebuilt**: Top row now displays sorted subjects (Mathematics, Physics, Chemistry) and renders two sub-tabs (Single Correct and Numerical). Single Correct filters only MCQ questions (first 20), and Numerical filters only Integer questions (last 5). Numbering inside the Choose a Question grid is relative to the active subsection (1 to 20 / 1 to 5).
3. **collapsible Instruction Box & Marking Scheme Details**: Renders NTA specific guidelines, collapsible with chevron clicks. Includes a gray header displaying Question Type and positive/negative marking rules (+4 / -1).
4. **Fullscreen Test Window & Instructions Modal**: Starting a test opens in a new browser window/tab, which requests browser fullscreen upon beginning. The instructions button in the exam header now toggles an inline modal with a ticking timer notice instead of navigating away.
5. **Typography & Styling Improvements**: Enforced standard `Arial, Helvetica, sans-serif` globally on the attempt page to match NTA layout typography exactly.

---

## Files Modified

### 1. [attempt/page.tsx](file:///c:/Users/shubh/Downloads/studentscommunity-main%20(1)/studentscommunity-main/next-app/src/app/exam/[id]/attempt/page.tsx)

- Added state variables: `currentSubsection` (`'single-correct' | 'numerical'`), `instructionsExpanded`, and `showInstructionsModal`.
- Rebuilt derived values: `currentSubQs` filters by subject and question type dynamically, and `qNumber` is index-based inside the subsection.
- Rewrote `jumpToQuestion` and `saveAndAdvance` to traverse sections and subsections relative to the JEE Main flow.
- Replaced option element `<label>` with `<div className="select-none">` and updated `handleSelectOption` to assign the selection value directly.
- Added collapsible instructions details panel and grey question info header.
- Replaced the instructions button router navigation with the `showInstructionsModal` state toggle and added the inline scrollable modal.
- Adjusted font family of results, loading, and main attempt layouts to `Arial, Helvetica, sans-serif`.

### 2. [instructions/page.tsx](file:///c:/Users/shubh/Downloads/studentscommunity-main%20(1)/studentscommunity-main/next-app/src/app/exam/[id]/instructions/page.tsx)

- Added full-screen request calls (`requestFullscreen`, `mozRequestFullScreen`, `webkitRequestFullscreen`, `msRequestFullscreen`) inside `handleStart` when the candidate clicks "I am ready to begin" or "Resume Attempt".

### 3. [tests/page.tsx](file:///c:/Users/shubh/Downloads/studentscommunity-main%20(1)/studentscommunity-main/next-app/src/app/(dashboard)/tests/page.tsx)

- Updated start simulation action inside the initialization modal to invoke `window.open` to launch the exam instructions page in a new window/tab.

---

## Verification

| Check | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ Clean — zero errors |
| Git status | ✅ All changes staged |

---

## Git Commit

```
feat: CBT engine upgrades - fix option selection, relative subject/subsection tabs, collapsible marking schemes, fullscreen launcher, and inline instructions modal
```
