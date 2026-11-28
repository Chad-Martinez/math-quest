# Scene 07 · Stegosaurus Wiggle Meadow

The existing optional pause after Triceratops Bridge now opens a seven-beat meadow scene. The scene retains its existing checkpoint and stores the current beat and line while the scheduled break is open. Skipping the map offer, skipping from the welcome, ending from any activity, and finishing the break all lead to the existing route to Crystal Lagoon. Turning the scheduled break off leaves **Take a break** available during a problem. Motion and player choices never add a math outcome or award a reward.

An on-demand break uses the same meadow activities over the current workspace. It returns directly to the problem, so the scheduled lagoon departure dialogue only appears in the scheduled break. Closing the overlay restores the actual workspace and returns focus to **Take a break**. Reloading while the overlay is open resumes the adventure from the welcome and restores the workspace using a one-use local tab checkpoint. It carries the scratch drawing, selected drawing view, draft and the positions of pieces that the older math panels keep in memory. If tab storage is unavailable, the on-demand break still preserves the live workspace until reload.

## Demonstrations and artwork

The supplied landscape and portrait illustrations frame the corresponding view. All lead dinosaurs use the approved individual character artwork. In reduced-motion mode activities show a still pose. With motion enabled, advancing or replaying cancels obsolete motion and speech. Each sequence settles in place when it ends. The child chooses when to continue. The on-screen repetition counts illustrate the movements and give children a pattern to follow at their own pace.

| Activity | Demonstration |
| --- | --- |
| Brachiosaurus Stretch | Three 1.8-second cycles through the looking-down, reaching and neutral poses |
| Triceratops Stomp | Five 0.85-second cycles through idle, stomp and idle poses |
| Velociraptor March | Six 0.65-second cycles using the orange-and-rust neutral and side poses with a small lift |
| Stegosaurus Wiggle | Four 2-second cycles of side-to-side sway using the approved full-size idle sprite |
| T-Rex Cooldown | Two 4-second cycles of the supplied SVG flower expanding and settling |

The tiny wiggle frames have inconsistent edges and pale matte remnants. The kit’s approved fallback uses a full-size pose and a subtle grounded sway. The march uses two poses and illustrates rhythm rather than alternating legs. The pointing crop is 218 × 158 pixels and looks softer in the departure view. Full-resolution transparent PNGs with a consistent baseline and matched feet would improve the pointing pose, the tail movement, and independent leg motion. The flower is the simplified SVG supplied in the kit. See the [asset inventory](scene-07-assets.json).

## Verification

Serve the checkout under `/math-quest/` with Playwright installed. The browser suite uses a speech stub to verify the words sent to speech synthesis and the cancellation calls. Set `CHAPTER_SCREENSHOTS` to capture the seven beats, movement midpoints and resumed workspaces. Set `CHAPTER_BROWSER=webkit` to use WebKit.

```sh
npm test
CHAPTER_URL=http://127.0.0.1:8431/math-quest/ node tests/wiggle-meadow-browser.mjs
CHAPTER_BROWSER=webkit CHAPTER_URL=http://127.0.0.1:8431/math-quest/ node tests/wiggle-meadow-browser.mjs
```

## Physical iPad acceptance checklist

1. After Triceratops Bridge, open **Take a Wiggle Break** from the map. Check portrait and landscape in Safari with the browser toolbar shown. Read each dialogue line, tap **Listen**, and advance mid-speech. Check the first and last primary actions, focus and VoiceOver announcements.
2. Play the stretch, stomp, march, wiggle and flower demonstrations. Try **Show again**, **Skip this activity**, and **End break** during playback. Tap rapidly on one control. Confirm that the next activity needs its own action, that each demonstration settles, and that audio stops on replay or exit.
3. Open **Seated option** and **Grown-ups**. Review the movement tips and check that the automatic-break preference remains available. Enable **Reduce Motion** and confirm that the pictures stay still while the instructions and navigation remain usable.
4. During a problem, place or move pieces, type a draft, make a scratch drawing, and open **Take a break**. End the break and check the same work and focus. Reopen it, reload the tab, select **Continue Adventure**, and check that the same workspace returns.
5. Try skipping at the map, skipping from the meadow welcome, and completing the full break. Each should make Crystal Lagoon available with the three completed stops and the same stored rewards. Turn off the scheduled offer and replay the route from Triceratops Bridge. Confirm that the map proceeds to the lagoon and the on-demand break remains available.
