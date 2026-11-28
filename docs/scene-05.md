# Scene 05 · Velociraptor Trail

Velociraptor Trail uses the existing Stop 2 checkpoint and presents arrival, challenge introduction, optional matching, answer submission, celebration, and the eggshell discovery. The final dialogue sends the player back to the map with Stop 3 available. See the [asset inventory](scene-05-assets.json).

The first new play compares 12 and 8 footprints. Replays select an approved variant and include both more-than and fewer-than wording. Saves already in Stop 2 keep their original quantities. Matching pairs one print from each trail without changing either group. The child can tap the prints, use **Match a Pair**, or undo a pair. The active problem, matching state, answer draft, and hint progress survive reloads, breaks, and map visits. An explicit worked example uses 5 and 3, and the separate Parent Teaching Tips transfer uses 9 and 6. Correct submission alone records completion. Used hints, matching, or explicit help can make the outcome assisted.

## Visual comparison

The story scenes keep the approved individual characters and dedicated environments. The supplied matching-board picture stays a reference. The interactive board uses the individual footprint sprite, a dynamic connection for each pair, and dashed outlines for prints left over. The original comparison stays visible above or alongside the workspace. The initial environments show only decorative tracks. The final scene highlights the shell painted into the clue backgrounds and uses no duplicate prop.

The same approved art covers multiple viewport aspect ratios, so very wide landscape and narrow portrait screens crop different edges. Some supplied poses retain small painted ground or foliage patches, and the early backgrounds can show mild softening where the shell was removed in the source art. In compact views, the expanded model can scroll vertically to preserve readable controls and footprint touch targets.

## Verification

Serve the repository under `/math-quest/` and set `CHAPTER_URL` to the local URL. Set `CHAPTER_SCREENSHOTS` to capture the six beats, support states, responsive layouts, and motion sequence. Playwright must be installed. The browser tests stub speech synthesis to verify spoken text and cancellation calls. Check actual audio and VoiceOver on a device.

```sh
npm test
CHAPTER_URL=http://127.0.0.1:8429/math-quest/ node tests/velociraptor-trail-browser.mjs
CHAPTER_BROWSER=webkit CHAPTER_URL=http://127.0.0.1:8429/math-quest/ node tests/velociraptor-trail-browser.mjs
```

## Physical iPad acceptance checklist

1. In Safari, enter Stop 2 from the map. Rotate from landscape to portrait during the introduction. Check the camera crop, grounded characters, all buttons, and one dialogue segment at a time. With the browser toolbar shown, confirm the primary action remains reachable. Repeat in Chrome if that is the playtest browser.
2. Check the first comparison with **Math tools** closed. Open the tool and count 12 prints and 8 prints. Tap a print from each trail, use **Match a Pair**, and then use **Undo Match**. Check that paired prints cannot be used twice and neither row quantity changes. Try touch, an external keyboard, and VoiceOver.
3. Type a draft answer and make a pair. Rotate, take a break, return from the map, and reload Safari. The quantities, draft, and pairs should still be there. Check that tapping the prints never submits an answer.
4. Try an incorrect answer such as 20, then use successive hints and open the optional **Try with help** example, and tap **Show how**. Return to the original problem. Check **Grown-ups → Teaching tips for this problem** for the actual quantities and test the suggested 9-versus-6 transfer. In the child workspace, look for the solved equation only after a correct submission.
5. On first play, submit 4. Verify the celebration and `12 − 8 = 4`. Advance, confirm the eggshell appears for the first time, and follow the story to the map. Check that Stop 2 is completed once and Stop 3 is available. Try quick double taps and leave during narration or animation. Repeat with **Reduce Motion** turned on.
6. Repeat with a fewer-than replay. Compare what the question asks for with the number of prints left unmatched. Use a separate playthrough with no support to verify independent completion.
