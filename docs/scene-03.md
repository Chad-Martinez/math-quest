# Scene 03 · The Adventure Map

The illustrated board uses the approved 1648 × 928 coordinates for pins, friend sprites, connecting trails, and travel. The map fits its available space without clipping destinations. The fixed landscape artwork stays intact in portrait, where the active destination also appears below the map. A portrait-specific illustration could show larger landmarks and labels on narrow phones. It would need its own approved route coordinates.

The chapter run remains the source of progress and rewards. Its optional `mapFrom` value records the start of a pending trip in the existing checkpoint. It clears on arrival. Reloading a pending trip restores the map and destination. An unresolved break offer remains available, and a skipped or finished break goes straight to the lagoon on reload. The on-demand map keeps the current workspace mounted and can also open completed-stop practice. Upcoming stops stay locked.

The friend cutouts are from the supplied kit and can show soft edges at larger sizes. The Mosasaurus, T-Rex poses, four walking frames, and logo reuse the identical approved artwork from earlier scenes. Two short trail overlays match the kit’s route preview. The HUD occupies its own space so it leaves every destination visible. The final map action retains the existing Mosasaurus clue and egg discovery sequence.

## Test locally

Serve the repository at `/math-quest/` with a static server and set `CHAPTER_URL` to that URL. Run `npm test` and these browser suites with Playwright available.

```sh
node tests/welcome-browser.mjs
node tests/missing-egg-browser.mjs
node tests/chapter-browser.mjs
node tests/adventure-map-browser.mjs
```

Set `CHAPTER_BROWSER=webkit` to use WebKit. Set `CHAPTER_SCREENSHOTS` to a directory to capture the map states and a sequence of travel frames.

## Manual iPad acceptance checklist

1. Open the review build in Safari. Finish Scene 02 and check that the entire island, Empty Nest, five numbered stops, and unnumbered Wiggle Meadow are visible. Rotate to portrait and back. Check that the primary action, Grown-ups, and the progress count remain readable with browser controls visible.
2. Tap **Listen**, then **Let's Go!** while speech plays. Verify it stops and the next line appears. Tap **Visit Berry Grove** and confirm the T-Rex faces the direction of travel and follows the trail. Try **Skip travel** and a quick double tap. Check that only one challenge opens.
3. Move a berry and type a draft without submitting. Tap **Trail map**, then **Continue Stop**. Verify the same berry placement and draft are still there. After completing Stop 1, try a locked marker and confirm it cannot open a future challenge. Revisit the completed Stop 1 for practice and confirm the main run still resumes where it left off.
4. Complete Stop 3 and try **Skip for now**. Reload and resume to confirm **Visit Crystal Lagoon** is still next and the counter stays at three. In a separate playthrough, try the break and finish it. Verify it leads to the same lagoon. Disable the offer in Grown-ups and check that the break no longer interrupts the route.
5. Complete Crystal Cave. Check for five completed pins, then choose **Find the Egg!**. Follow the existing clue to the egg and confirm one chapter completion is recorded after the celebration, even after a reload.
6. Enable **Reduce Motion** in iPad Accessibility settings. Verify that travel goes straight to the destination. With VoiceOver, check that current, completed, and locked stops are distinguishable and **Continue Stop** returns focus to **Trail map**.
