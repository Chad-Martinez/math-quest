# Architecture

The repository root is the deployable site. Static HTML, CSS, and JavaScript modules run directly in the browser. This keeps deployment simple and leaves room to change the visual experience without changing the learning engine.

- `js/curriculum.js` contains the world catalog and relationship-driven question templates.
- `js/story-structures.js` defines the added word-problem relationships and their model data.
- `js/engine.js` rotates template variations, prevents duplicate prompts with identical visuals, validates responses, and generates seeded lesson and review sequences.
- `js/coach.js` builds pure guides from the active question. `js/coach-panel.js` binds the dialog without rebuilding the learner view.
- `js/app.js` handles rendering, support tools, intermediate prompts, and navigation.
- `js/manipulatives.js` renders optional, stage-specific models from curriculum data. Counter positions and model interactions live in memory for the active step. The same chart renderer draws the original chart and the optional model, which uses a copy of the original counts.
- `js/workspace-state.js` derives bead and balance counts from the immutable question and a bounded movement count. The rendered model owns that count for the active step.
- `js/drag.js` provides pointer input for models that accept a drop. Buttons also support tap and keyboard activation.
- `js/storage.js` loads and writes the versioned local progress record. It can migrate prototype stars when the legacy key exists on the same origin.
- `assets/trail.svg` is original local artwork. No external assets are fetched by the game.

Question records include category, subskill, template identity, difficulty, answer format, hints, explanation, and optional visuals and intermediate steps. Each session uses an explicit seed. Local progress stores rewards and completed runs by the world selected at the start, including mixed challenges under Treasure Island. The version 4 schema carries forward unattributed totals and existing per-adventure totals. It stores bounded [Parent Coach evidence](parent-coach.md) with the rewards so scoped resets apply to both. Adaptive rules and dashboard summaries belong in a future phase.

Pending review queues store only stable template IDs and seeds. This reconstructs a fresh fourth item without saving the story text or the learner’s response. Scoped resets remove that adventure’s pending reviews and evidence.

The learning layout mounts the prompt and answer separately from the workspace. The controller switches between chart, model, number line, and drawing without recreating the current view state. The missing-part and balance models track stable piece IDs and share movement, focus, and animation handling across tap, drag, and keyboard input. The demonstrations reveal equations only after the model reaches the target relationship and the learner chooses to see the math.

## Chapter 1 playtest

`js/release.js` selects the Chapter 1 entry point. The legacy entry point remains available by setting `legacyAdventures` to `true` for local development. The release decision is centralized so no other adventures or lessons enter Chapter 1 navigation.

`js/chapter.js` owns the ordered scenes, seeded math relationships and chapter progress. `js/chapter-ui.js` renders scene and checkpoint state. `js/chapter-models.js` renders one SVG per unit and shares the existing drag, number-line and balance components. The generated numbers drive questions, visuals, feedback, teaching tips and worked solutions. Checking an answer uses the stored mathematical relationship independently of whether the learner uses the model.

Chapter progress lives under `math-quest.lost-egg-1` with its own version. Earlier Math Quest storage can be read to display the existing stars. Chapter play writes the checkpoint, draft answer, hint and assistance state, outcomes, settings and badge to the chapter key. Model arrangements and drawings are kept in memory while an activity stays open.

See the [Scene 01–03 architecture review](architecture-review.md) for how the current scene layers, map checkpoints and shared learning tools fit together and where future changes could consolidate demonstrated duplication.
