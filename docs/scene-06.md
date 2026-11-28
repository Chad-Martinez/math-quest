# Scene 06 · Triceratops Bridge v2.0

Stop 3 keeps the existing `share` checkpoint and map waypoint. New runs start with 11 planks in the first row, 7 in the second, and 6 in the separate supply. Replays select approved variants. Saved runs already at Stop 3 keep their original seeded quantities and completion history. The new bridge art and narrative use those quantities. Saved runs approaching Stop 3 from the map start the first Bridge v2 problem.

The first row stays fixed. Placements and undo transfer individual spares between the supply and the second row. Two staging positions allow overshooting. The child can tap a spare, drag it to the underlined slot, or use **Add a Plank** with touch or a keyboard. Selecting the last placed plank returns it to the supply. A valid answer records the total needed from the original starting row. It atomically reconciles any outstanding difference or surplus and records completion through the existing chapter state. Motion illustrates that result. The repaired background appears when the player continues to the crossing. A reload on that beat shows the characters on the far side.

Matching the rows through the optional tools leaves the answer field and progression under the child’s control. The saved checkpoint stores how many planks were moved, the open tool, number-line position, hints, draft and help used. The example uses 6 and 4, and Parent Teaching Tips use the active values with a distinct stepping-stone transfer. Correct answers distinguish independent and assisted play, and reviewed stops run in practice. The scripted clue returns to the existing optional Wiggle Meadow offer or directly to the lagoon when the break is disabled.

## Art and layout

The narrative panels frame the supplied images at their native aspect ratios so both ends of the bridge stay visible. The landscape sources are approximately 460 × 398 pixels. The broken and repaired portrait sources are approximately 190 × 329. Expect softness when they are enlarged on an iPad or desktop, especially along the foreground rails and plank edges. The landscape and portrait pairs have different bank and deck positions. The crossing uses coordinates calibrated to each crop and a brief fade into the repaired image. The baked railing does not occlude sprites, which keeps their feet visible. Standalone art with consistent framing, more dry-bank space and a separate transparent foreground rail would allow a more immersive full-width crossing.

The board uses the approved individual plank and a decorative crate. The optional cropped supports, posts, rail and angle-plank stay in the kit. Character poses are the supplied individual sprites. The map keeps its existing Triceratops sprite and waypoint. The marker does not depict a picnic prop. See the [asset inventory](scene-06-assets.json).

## Verification

Serve the repository under `/math-quest/` and run the following with Playwright installed. Set `CHAPTER_SCREENSHOTS` to capture the six beats, model states, responsive layouts and crossing frames. The browser suite stubs speech synthesis to verify exact text and cancellation calls.

```sh
npm test
CHAPTER_URL=http://127.0.0.1:8430/math-quest/ node tests/triceratops-bridge-browser.mjs
CHAPTER_BROWSER=webkit CHAPTER_URL=http://127.0.0.1:8430/math-quest/ node tests/triceratops-bridge-browser.mjs
```

## Physical iPad acceptance checklist

1. From the development preview, enter **Triceratops Bridge** from the map. Play the arrival and introduction in Safari landscape and portrait with the toolbar visible. Check that you can see both ends of the bridge and reach the controls. Repeat in Chrome if that is the playtest browser.
2. Tap **Listen** and advance mid-sentence. Confirm the voice stops. Test VoiceOver reading the question, row labels, button states, feedback and the next-action focus.
3. On first play count 11 in the first row, 7 in the second and 6 in the spare crate area. Drag one plank to the underlined slot, tap another, and use **Add a Plank** with an external keyboard. Try a drop over the fixed row, undo, reset and add two past equality. Check that the fixed row stays at 11 and that reaching equality does not complete the stop.
4. Open the number line, take a movement break, visit the map, rotate, and reload with a draft and a partially repaired bridge. Check that the same question, draft, placements and number-line position survive.
5. Try 7, 11, 5 and 18. Check their distinct feedback. Try progressive hints, the separate 6-and-4 example, and the Grown-ups teaching guide. Return to the original question and verify the draft and workspace are intact.
6. Submit 4 with too few or too many planks placed. Confirm both rows end at 11 and two planks are left. Continue to the repaired bridge, watch both dinosaurs follow the deck, and try **Skip crossing**, rapid taps, opening the map mid-crossing, and **Reduce Motion**.
7. Continue from the clue to the map. Check the completion mark and optional Wiggle Meadow offer. Try skipping it and turning the scheduled break off in Grown-ups. Confirm both paths lead toward Crystal Lagoon.
