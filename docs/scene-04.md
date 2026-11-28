# Scene 04 · Brachiosaurus Berry Grove

The map enters the approved arrival, introduction, combine, missing-berries, success and clue beats. The saved scene remains the existing Stop 1. The chapter controller owns answers, checkpoints, outcomes, map advancement and rewards. The illustration, dialogue and movement use the supplied foreground and background art, ordered beats and timing. See the [asset inventory](scene-04-assets.json).

A new first play uses 5 red, 7 blue and a target of 16. Later starts choose from the four supplied replay variants. An existing save already at Stop 1 retains its old seeded values, including an older generated gap of up to six. Existing later questions use the same sequence of random draws. The chapter store keeps the current story beat, numeric draft, hints, optional model selection and piece positions, number-line jumps, and the types of help used. Optional scratch drawing and the separate support dialog stay in memory as before. The dynamic model, equations, feedback, and Parent Teaching Tips all use the current problem. Scenic berries and the existing illustrated baskets stay decorative.

Optional instruction starts with the supplied 2 + 3 example and continues with the separate 4 + 5 guided problem. The primary question remains in place. A verified answer records either independent or assisted completion. Worked-example, guided, hint, tool and parent support are additionally recorded as distinct evidence when used. Opening support, work on the alternate problem, placing berries, and watching the success animation never complete the current problem. Correct submission records the result once. Revisiting a saved success or clue shows the settled state.

## Visual comparison and limits

The approved 4:3 landscape gets cropped on wider screens. Portrait uses the dedicated 1:2 grove. Dialogue uses one readable, interactive bubble at a time. The math workspace uses opaque parchment, and the collection sequence places the actual generated berries in a countable grid next to the basket and equation sign. The Brachiosaurus poses are scaled around the body and feet with simple pose swaps. There is no skeletal rig in the supplied art. The full reference images stay outside runtime assets.

## Verification

Serve the branch under `/math-quest/` and run the following with Playwright available. Set `CHAPTER_SCREENSHOTS` to save screenshots and sequential collection frames. Set `CHAPTER_BROWSER=webkit` to select WebKit.

```sh
npm test
CHAPTER_URL=http://127.0.0.1:8428/math-quest/ node tests/berry-grove-browser.mjs
```

The other chapter suites cover Welcome, The Missing Egg, the Adventure Map and a full chapter. See [testing](testing.md).

## Physical iPad checklist

1. In Safari, start a new adventure and enter Berry Grove through Stop 1. Try landscape and portrait with the browser toolbar visible. Check that T-Rex stands on the trail, Brachiosaurus stays grounded and every story control is reachable. Replay each line with **Listen**, then advance mid-speech and check that it stops.
2. On the first question, keep **Math tools** closed while trying a correct or incorrect answer. Open it, tap and drag red and blue berries, put one back, and try Undo and Reset model. Use the software keyboard and VoiceOver. Confirm that moving pieces never submits an answer.
3. Try two valid incorrect answers, open the optional worked example, and complete both guided questions. Return to the original draft. Try **Hint** three times and confirm the cues build gradually. Open **Grown-ups → Teaching tips for this problem**. Deliberately reveal the equations and try the separate LEGO transfer.
4. Check the verified intermediate total. On Step 2 confirm that the story and total remain visible, the equation has a blank, and the basket has room for additional berries. Move a berry, type a draft, then try **Take a break**, **Trail map → Continue Stop**, and a Safari reload. Confirm the same question and working state return. Try the optional Number line as a second representation.
5. Check the final answer and continue. Count the individual berries Brachiosaurus collects. On first play expect 4 and a final basket of 16. Check both equations. Try tapping Continue during collection, reload from a saved success or clue, and repeat with **Reduce Motion**. Follow the trail and verify that Stop 1 is checked and only the right next stop is available.
6. Repeat with another approved replay variant, which may need 1, 2, 3 or 5 berries. If using an Apple Pencil, verify that the optional drawing tool remains usable through a temporary map or break visit.
