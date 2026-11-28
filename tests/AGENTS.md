# Testing and QA

- Preserve existing tests. Run `npm test` and add focused regressions for changed behavior. Use stable seeds and independent math invariants across parameters, intermediate steps, visuals, answers, feedback and teaching guides.
- Use the relevant existing Playwright suites at `/math-quest/`. Exercise Chromium and WebKit when available, with representative phone and iPad orientations and desktop. Verify assets, console errors, focus, rapid input, interrupted motion and narration, reduced motion, save/resume, rewards and release visibility where affected.
- Compare meaningful screen states with approved references. Capture motion separately when relevant. Report commands, actual results, device or emulation, artifacts and remaining checks. Label physical iPad touch, Safari audio, VoiceOver and Apple Pencil checks accurately. See [testing](../docs/testing.md) and the [Chapter 1 checklist](../docs/chapter-1.md).
