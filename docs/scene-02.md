# Scene 02 review

The Missing Egg replaces the chapter’s mission introduction. The four story beats live within the existing mission checkpoint. Opening the map saves the same map checkpoint as before. A reload during the introduction resumes at Arrival, and a saved stop resumes at that stop.

The scene uses the supplied nest and trail art for each orientation. The SVG clue outlines share the same cover crop as the background, so the rings track the nest and footprints when the viewport changes. T-Rex’s two arrival states and celebration reuse the established walking, greeting, and celebration sprites.

## Manual iPad check

1. Open the review build in Safari and start a fresh test adventure. See T-Rex enter from the left. Check that **Continue** and **Grown-ups** work during the entrance.
2. Tap **Listen** on Arrival. Replay the line, then tap **Continue** while it is speaking. Confirm that speech stops and the Discovery line can be read aloud on its own.
3. Verify the empty nest pulses briefly. Advance and verify the three footprint outlines appear in near-to-far order. Rotate between landscape and portrait on both scenes. Check that the outlines stay on the artwork and the Continue buttons stay within the viewport.
4. On Mission, tap **Let’s Find It!** twice quickly. Check that the celebration leads to the existing map once. Return home from **Grown-ups** during a test run and check that the narration stops.
5. Repeat with **Reduce Motion** enabled. The final poses and static clue outlines should appear immediately. Save at a later stop, reload, and use **Continue Adventure** to confirm that it bypasses the introduction.

To preview on a physical iPad before release, serve a checkout from a computer on the same Wi-Fi using `python3 -m http.server 8421`, then navigate to the computer’s address with port 8421 in Safari.

## Automated checks

Run `npm test`. Serve the project under `/math-quest/` and point Playwright at that URL.

```sh
CHAPTER_URL=http://127.0.0.1:8421/math-quest/ CHAPTER_SCREENSHOTS=/tmp/scene-02 node tests/missing-egg-browser.mjs
```

The browser script verifies the four lines, artwork and clues, speech calls and cancellation, rapid taps, reduced motion, and checkpoint transitions. Actual iPad speech, touch and browser toolbar behavior remain part of the physical check.

The backgrounds are the kit’s cropped composites. They soften when enlarged, and wider or narrower screens trim some edge foliage. The new character sprites retain the small cutout edges present in the supplied art.
