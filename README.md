# Math Quest

Math Quest is a touch-friendly math adventure for early elementary learners. Choose one of seven worlds, work through short challenges, and earn stars for solving them.

## Run locally

From the repository root, run `python3 -m http.server 8000` and open http://localhost:8000/. An HTTP server is required to load JavaScript modules. To check the project-site path, serve the parent directory and open http://localhost:8000/math-quest/.

Run `npm test` with Node.js 20 or newer. The game and tests have no package dependencies.

## Publish on GitHub Pages

In the repository, open **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, select **main** and **/ (root)**, and click **Save**. Once GitHub reports a successful deployment, open https://chad-martinez.github.io/math-quest/.

## Play on iPad

Open the Pages URL in Safari. Tap a world, then use **Read aloud**, **Hint**, or **Draw** as needed. **Teaching tips** opens the [Parent Coach](docs/parent-coach.md) for the current challenge. **Grown-ups** lets you change the number of challenges and reset progress for one adventure or the whole game. Stars and completions from older versions are included in the overall totals and can be cleared with a whole-game reset. See [the iPad test checklist](docs/testing.md) for the full first run.

Settings, stars, and adventure counts are stored per browser and origin. Private browsing, clearing website data, disabled storage, or changing devices can affect access to saved progress. In-progress adventures are kept in memory. Phase 1 requires a connection to load the hosted game. Speech availability and voice selection depend on the browser and device.

See [architecture](docs/architecture.md), [curriculum](docs/curriculum.md), [game design](docs/game-design.md), and [roadmap](docs/roadmap.md).
