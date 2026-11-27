# Chapter 1 playtest review

The release plays the approved storyboard from welcome through replay. The five stops cover combining supplies and finding the missing amount, comparing two footprint trails, sharing enough berries to make equal groups, finding the least number of gems to take the lead, and balancing a missing-subtraction equation.

| Requirement | What to verify |
| --- | --- |
| Generated mathematics | Each unit is drawn from the current problem. Solutions, hints and teaching tips use the same parameters. Follow the story order and count only the quantity requested. |
| Concrete to visual to symbolic | Move the objects or use the number line. The equation appears after checking the answer or choosing a worked example. The original task stays available after a different example. |
| Working memory and pacing | One current question stays on screen. For two-step problems, the first result stays visible when the second question appears. Drawing and math share one workspace. |
| Direct input | Tap, drag, or activate an object by keyboard. Footprints line up across rows, which share a horizontally scrollable track on narrow screens. The scale tilts according to the two pan totals. |
| Support and feedback | Two hints lead to a worked demonstration with different numbers. Wrong answers invite retry. Making the gem groups tie gets a specific response. Completion records distinguish independent work, instructional help and a worked answer. |
| Parent assistance | Each problem has a question to ask, a real-object demonstration, hints, possible misconceptions, a solution behind an explicit reveal, and a transfer question in a fresh context. |
| Movement | Try any part of the optional break, skip it, or take a break during a problem. The chapter preserves the current response and workspace when an on-demand break closes. |
| Completion and privacy | The Golden Egg badge survives refresh and replay. Chapter state stays in browser storage, with earlier progress recorded separately. There are no accounts, analytics, countdowns or speed metrics. |

## Automated checks

Run `npm test`. The Chapter 1 suite samples 5,000 seeds across all five schemas, verifies intermediate and final relationships, and tests transfers, scene order, retries, recovery, break settings and reward persistence.

To run browser checks, make Playwright and its browsers available locally and serve the branch over HTTP with the `/math-quest/` subdirectory. Then run:

```sh
CHAPTER_URL=http://127.0.0.1:8421/math-quest/ CHAPTER_SCREENSHOTS=/tmp/math-quest-shots node tests/chapter-browser.mjs
CHAPTER_BROWSER=webkit CHAPTER_URL=http://127.0.0.1:8421/math-quest/ node tests/chapter-browser.mjs
```

The script uses a fresh test context and a fictional progress fixture. It follows a full chapter, exercises a replay with the scheduled break turned off, and checks the five parent guides. It covers incorrect and correct answers, tap, drag, keyboard activation, drawing, reduced-motion layout, reload, unsupported-speech fallback, and page overflow at iPad landscape, iPad portrait and phone sizes. Browser emulation tests do not substitute for the iPad checklist.

## Physical iPad acceptance

For pre-merge playtesting, serve a checkout of the development branch from a computer on the same network as the iPad. Run `python3 -m http.server 8421` in the checkout and open `http://<computer-LAN-address>:8421/` in Safari. After the release is approved and published, repeat the smoke test at the [Pages URL](https://chad-martinez.github.io/math-quest/).

1. Open a branch preview in Safari. In landscape, start a new adventure and tap a numbered stop. Open a different stop for practice, then return to the adventure and verify your checkpoint. In math scenes find the story, current question, answer field and math workspace without searching.
2. Tap **Listen**, stop it, then replay it. Check that going to the next scene stops playback and the screen remains readable in silence. Try with VoiceOver and follow the focus order through the question, workspace and answer.
3. Move individual berries using both tap and drag. Try pairing footprints and swiping the row sideways. Confirm a wrong answer lets you retry. In the next step, check that the first result remains visible and that tapping the next number jumps by one tick. In step two, pack spare berries into the same basket, then try the optional number line. After solving, look for T-Rex, the full basket and the matching equation. Use **Restart stop** to bring back the original berry groups.
4. Draw with a finger and Apple Pencil if available. Switch to **Math tools** and back to **Draw**. Open teaching tips and an on-demand break with a partly typed answer. Check that the answer, drawing and pieces are still there upon returning. Rotate to portrait and back.
5. After sharing the berries, try skipping the wiggle break. On a replay turn the scheduled offer off in **Grown-ups**. During a different problem choose **Take a break** and return early.
6. For gems, make a tie, enter that number as an answer, and look for the explanation about adding one more. At the cave, remove stones until the beam is level and try putting one back.
7. Complete the chapter. Check the Golden Egg badge and reload during the celebration. Tap **Continue adventure** and verify the completion count has not increased. Return home and replay. Check that existing stars still show under **Grown-ups**.

## Release limits and deployment

Chapter 1 focuses on five schemas. The wider curriculum, full dashboard and old reset controls remain part of the legacy game. The playtest settings cover the scheduled break. In-progress model arrangements and drawings last for the open activity, while a page reload restores the checkpoint and draft. The release does not include PWA installation or offline caching. The artwork is the supplied first-playtest resolution. Speech and Pencil behavior need verification on a physical iPad.

Review on the development branch. Leave Pages configured to publish from `main` at the repository root. After approval, merge the branch, wait for Pages to publish, and verify the hosted home and a complete playthrough. A confirmed physical iPad run and observations from playtesting guide the next release.
