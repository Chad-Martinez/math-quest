# Scene 08 · Mosasaurus Crystal Lagoon

Stop 4 keeps the `gems` checkpoint and existing map waypoint. New first visits use 9 green crystals, 6 blue crystals and 6 spare blue crystals. Replays draw from the six approved variants. Prior visits already in progress keep their seeded quantities, draft and outcome. When a prior visit saved movable gems through a movement break, the transferred amount restores to the blue holder.

The optional board aligns green and blue crystals, leaves green fixed, and shows a labeled separate spare supply. Tap or drag a crystal to the next blue slot, or use **Add a Crystal** with touch or a keyboard. The last placed crystal can return to the supply. **Undo** and **Reset** preserve the total. The board permits overshooting and gives relationship feedback without submitting an answer. The number line and progressive hints are optional. The worked example first matches 5 with 3 + 2, then demonstrates the extra one as 3 + 3 = 6. Parent Teaching Tips use the active problem and keep the equations behind a deliberate reveal.

A correct answer records the outcome and sets the model to the minimum in the same checkpoint update. The first problem settles at 9 green, 10 blue and 2 spare. The transition moves only the deficit or surplus. Reopening from a save keeps the correct state and reward history. The story activates the marker, follows Mosasaurus underwater, shows the passage and returns to shore for the final conversation. **Skip cinematic** goes directly to the shore conversation with a still of the discovery. The full route returns to the map with Stop 5 available. The existing cave challenge handles opening the cave.

## Art and animation

The six supplied background files provide distinct landscape and portrait compositions. T-Rex stays on shore. The shoreline mask hides the lower part of the original Mosasaurus sprite and uses the supplied ripple to mark the surface. The swim scene translates and gently turns the approved single pose. It does not show a full cycle of fins or a newly drawn dive pose. The marker, holder, glow, ripple and bubble are the kit’s provisional SVGs. The simple silhouettes have less detail than the surrounding illustration. The success panel places the marker beside the equation so the glow remains visible on narrow phones. The foreground crystal clusters are scenery. The supplied gem sprites are used for every countable item at the same display size. See the [asset inventory](scene-08-assets.json).

The supplied timings cover the arrival walk and surfacing, marker approach, workspace reveal, crystal transfer, equal and greater states, activation, dive, underwater motion, discovery fade, surfacing and return to the map. Dialogue advances explicitly. The cinematic controls stay usable throughout. Reduced motion shows settled poses. Moving to another beat or opening the map cancels obsolete audio, asset-wait work and motion.

## Verification

Serve the checkout under `/math-quest/` with Playwright installed. Use `CHAPTER_SCREENSHOTS` to capture all beats, workspace states and sequential cinematic frames. The browser suite stubs speech synthesis to verify exact dialogue and cancellation calls.

```sh
npm test
CHAPTER_URL=http://127.0.0.1:8432/math-quest/ node tests/crystal-lagoon-browser.mjs
CHAPTER_BROWSER=webkit CHAPTER_URL=http://127.0.0.1:8432/math-quest/ node tests/crystal-lagoon-browser.mjs
```

## Physical iPad acceptance checklist

1. Enter **Visit Crystal Lagoon** from the map in Safari portrait and landscape. Keep the browser toolbar visible. Verify that the dialogue, buttons and Mosasaurus are visible, that T-Rex stands on the sand, and that the dark marker has no glow. Play **Listen** and advance mid-speech.
2. Before opening **Math tools**, verify that the answer and worked equations are absent. Open the model and count 9 green, 6 blue and 6 spare. Tap, drag and use keyboard controls. Try dropping over green, overshoot, undo and reset. Check VoiceOver labels and keyboard focus.
3. Submit 3, then 5 and 6. Check the distinct equality and minimum feedback. Try hints, the separate worked example and **Grown-ups → Teaching tips for this problem**. Return to the untouched original question and draft.
4. Move one or more crystals, type a draft, and draw a stroke. Take a movement break and return. Reload while the break is open, continue the adventure, and verify the restored work. Repeat with the number line selected.
5. Submit 4 from the untouched model, equality, the minimum, or an overshoot. Verify 9 green, 10 blue and 2 spare with no double transfer. Check that the marker glows only after submission.
6. Follow the dive, underwater exploration, passage and return to shore. Check for T-Rex only on shore. Try **Skip cinematic**, **Reduce Motion**, rapid taps, and leaving for the map while a demonstration is active. Verify the passage appears only after success and that the map offers **Visit Crystal Cave** with Stop 5 still unfinished.
