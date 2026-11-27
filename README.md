# Math Quest

Math Quest is a touch-friendly math adventure for early elementary learners. The Chapter 1 playtest, **Dinosaur Island — The Lost Egg**, follows T-Rex through five math challenges to find a missing egg.

## Run locally

From the repository root, run `python3 -m http.server 8000` and open http://localhost:8000/. Use an HTTP server to load the JavaScript modules. To check GitHub Pages project paths, serve the parent of the checkout and open `/math-quest/` from a checkout named `math-quest`.

Run `npm test` with Node.js 20 or newer. The game and its unit tests have no package dependencies. [Chapter 1 review](docs/chapter-1.md) describes the optional Playwright run, iPad checklist, and release criteria.

## Play on iPad

Open the hosted build in Safari. Tap **Start adventure** and follow the trail. **Listen** reads the story and current question where speech is available. **Hint** offers step-by-step help. **Math tools** and **Draw** switch the workspace. **Grown-ups → Teaching tips for this problem** opens instructions for the current challenge. The grown-ups panel also controls the optional offer of a wiggle break after the third challenge.

The browser saves chapter checkpoints, badges and break preferences on that device. Chapter data and earlier Math Quest progress use separate local records. Clearing site data, private browsing, or changing browsers or devices can affect access to saved progress. Load the game over a connection for this release.

## Publish on GitHub Pages

Review the development branch before merging to `main`. GitHub Pages uses **Settings → Pages → Deploy from a branch → main → / (root)**. After approval and merge, confirm the deployment succeeded and the site loads the correct version. [Math Quest production](https://chad-martinez.github.io/math-quest/)

See [architecture](docs/architecture.md), [curriculum](docs/curriculum.md), [game design](docs/game-design.md), and [roadmap](docs/roadmap.md).
