# Architecture

The repository root is the deployable site. Static HTML, CSS, and JavaScript modules run directly in the browser. This keeps deployment simple and leaves room to change the visual experience without changing the learning engine.

- `js/curriculum.js` contains the world catalog and relationship-driven question templates.
- `js/engine.js` rotates template variations, prevents duplicate prompts with identical visuals, validates responses, and handles session transitions.
- `js/app.js` handles rendering, support tools, intermediate prompts, and navigation.
- `js/storage.js` loads and writes the versioned local progress record. It can migrate prototype stars when the legacy key exists on the same origin.
- `assets/trail.svg` is original local artwork. No external assets are fetched by the game.

Question records include category, subskill, template identity, difficulty, answer format, hints, explanation, and optional visuals and intermediate steps. Each session uses an explicit seed. Local progress aggregates rewards and completed adventures. Per-question evidence and adaptive rules belong in a future phase.
