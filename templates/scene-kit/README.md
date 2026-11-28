# Scene kit starter

Use this folder as a blueprint for a future approved kit. The JSON examples illustrate the information to exchange. The deployed game does not load them. Existing approved kits can retain their format.

| File or folder | Owns |
| --- | --- |
| `README.md` | Scene purpose, kit revision and approval references, entry and exit behavior, which parts remain out of scope, interaction and state preservation, responsive composition and acceptance criteria. |
| `scene-manifest.json` | Stable beat IDs, exact dialogue, speakers, controls, transitions, drawing order and anchors, and animation timings. Keep dialogue and animation inline unless separate files make a large sequence easier to maintain. If split, reference IDs. |
| `asset-manifest.json` | Asset paths and approved reuse, dimensions, format, usage, orientation, optional anchors, frame order and limitations. |
| `learning.json` | Learning scenes only. The mathematical relationship, parameter bounds, intermediate steps, answer rule, model interactions, hints, feedback and contextual Parent Teaching Tips. Keep each guide with its challenge or link by stable ID. |
| `references/` and `assets/` | Approved storyboard, composition and character references in the first folder and individual runtime layers in the second. |

Identify one authoritative location for each detail. Link to it wherever another file needs it. Put worked and transfer examples in the learning document as labeled examples. Keep answer and generation rules declarative. Scene 02 uses ordered dialogue beats. Scene 03 groups route points, labels and dialogue together. Future scene data can be mapped into current code after review without a universal runtime schema.

## Acceptance criteria to adapt

- Confirm exact approved dialogue, story consequences and composition. Validate asset paths, layer placement, focus order and plain-text access to spoken content.
- Confirm portrait and landscape on iPad and phone plus desktop. Check touch and keyboard interaction, zoom, reduced motion, rapid taps, narration interruption, animation cancellation and save/resume.
- For math, use representative and boundary seeds. Check stories, objects, answers, intermediate values, hints, feedback, solutions and Parent Teaching Tips against the same generated parameters. Verify returning from optional support and movement preserves the workspace and outcomes.
- Define the screenshots, motion samples and physical iPad checks the owner should review. Follow the [production standard](../../docs/scene-production.md) and log decisions in the [approval register](../../docs/approval-register.md).

## Example implementation prompt

> Implement only Scene NN from the attached approved kit, revision X. The kit defines the creative and educational requirements. Follow the repository’s AGENTS.md files and preserve the published chapter and saves. Flag material conflicts or missing approved assets. Prepare a development branch with tests, visual evidence and an iPad checklist. Hold merge and deployment for my approval.
