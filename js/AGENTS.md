# JavaScript development

Scene controllers and learning modules share this directory. Apply both sets of rules to mixed modules such as `chapter-ui.js`.

## Story and scene code

Applies to `welcome.js`, `missing-egg.js`, `adventure-map*.js`, the scene and navigation portions of `chapter-ui.js`, and future scene code.

- Render the approved scene as separate environment, character, foreground and semantic HTML UI layers. Use the approved dialogue verbatim, one beat at a time with optional **Listen**. Advance by player action and stop obsolete speech on exit, restart or advance.
- Follow the kit’s choreography. Keep controls usable during nonessential motion, respect reduced motion, cancel obsolete timers and animations, and guard rapid input against duplicate actions. Follow the [scene production standard](../docs/scene-production.md).
- Return a scene with `sceneLifecycle()` for chapter views that own timers, animation frames or listeners. Use its abort signal to detach listeners and register cleanup for work the scene starts. Test leaving during pending navigation and verify that the checkpoint stays put.
- Derive navigation and markers from existing chapter state. Preserve the live workspace on temporary exits and use the existing checkpoint for reload. Award completion and rewards only on their established transitions.

## Learning, models and progress

Applies to `chapter*.js` when handling challenges, `engine.js`, `curriculum.js`, `story-structures.js`, `manipulatives.js`, `workspace-state.js`, `drag.js`, `app.js`, `coach*.js`, `storage.js` and related future code.

- Keep curriculum, seeded generation, answer validation and session transitions DOM-independent. Generate quantities, visuals, answers, intermediate steps, feedback and guides from the same validated question. Decorative art is never a source of math data.
- Use one primary task, short instructions, visible context, direct manipulation with tap and keyboard alternatives, progressive hints and misconception-specific feedback. Keep worked answers behind a deliberate reveal. Use explicit instruction, gradual release and fresh transfer when called for by the [educational requirements](../docs/educational-requirements.md).
- Cover every active template or chapter challenge with contextual Parent Teaching Tips. Keep optional narration and neutral tools separate from instructional assistance. Track independent, assisted and worked-example outcomes separately. Preserve the draft and workspace in Coach and movement breaks. Breaks stay optional and unscored.
- When changing local evidence, verify storage migration and whole-game and per-adventure resets in the relevant legacy flow. Preserve existing save keys and reward semantics.
