# Approval register

Creative design, assets, implementation and deployment are separate decisions. “Pending” means there is no recorded approval for the dedicated scene revision. The First Playable can already contain a corresponding activity. Tests and merges are deployment or verification evidence and do not establish creative or user acceptance on their own.

## Verified baseline

Scene 01’s art and implementation were approved in the welcome review, including the portrait revision and overlapping-pose fix. The owner approved the Scene 02 kit and initial release, then explicitly requested publication of the bubble-placement revision and confirmed the result with “Looks good.” Scene 03 was authorized from the approved map kit, and the owner explicitly approved publishing after reviewing its development branch. Physical iPad acceptance of Scene 03 remains unrecorded.

| Scene | Creative design | Graphical assets | Implementation | Deployment and evidence |
| --- | --- | --- | --- | --- |
| 01 Welcome | Approved welcome composition and personalized copy | Approved Scene 01 assets and dedicated portrait background | Owner accepted final single-pose revision | Live via [welcome](https://github.com/Chad-Martinez/math-quest/pull/5), [refinement](https://github.com/Chad-Martinez/math-quest/pull/6) and [pose fix](https://github.com/Chad-Martinez/math-quest/pull/7) |
| 02 The Missing Egg | Approved four-beat storyboard and copy | Approved Scene 02 kit | Owner accepted the published bubble-placement revision | Live via [scene implementation](https://github.com/Chad-Martinez/math-quest/pull/8) and [bubble placement](https://github.com/Chad-Martinez/math-quest/pull/9) |
| 03 Adventure Map | Approved island kit and corrected route | Approved Scene 03 kit for map use | Owner approved publication after branch review | Live via [PR 10](https://github.com/Chad-Martinez/math-quest/pull/10). Pages built [the merge commit](https://github.com/Chad-Martinez/math-quest/commit/98c2e598b547b711f25a2f5573c115c7d2c0e041) on 2026-11-28 UTC. Browser smoke test reached Berry Grove and verified resume through the map. |
| 04 Berry Grove | Pending | Pending | Pending | First Playable activity live. Dedicated revision pending. |
| 05 Velociraptor Trail | Approved six-beat Scene 05 storyboard and written specifications | Approved Scene 05 kit artwork | Owner approved publication on 2026-11-28 UTC, after reviewing the development branch. Physical iPad acceptance is unrecorded. | Publication authorized through [PR 14](https://github.com/Chad-Martinez/math-quest/pull/14). Build and deployment evidence is tracked in the [GitHub Pages environment](https://github.com/Chad-Martinez/math-quest/deployments/github-pages). |
| 06 Triceratops Bridge | Approved Bridge v2.0 storyboard and specifications | Approved individual characters and provisional bridge crops | Owner approved publication on 2026-11-28 UTC after development branch review. Physical iPad acceptance is unrecorded. | Publication authorized through [PR 15](https://github.com/Chad-Martinez/math-quest/pull/15). Build and deployment evidence is tracked in the [GitHub Pages environment](https://github.com/Chad-Martinez/math-quest/deployments/github-pages). |
| 07 Stegosaurus Wiggle Meadow | Pending | Pending | Pending | First Playable break live. Dedicated revision pending. |
| 08 Mosasaurus Crystal Lagoon | Pending | Pending | Pending | First Playable activity live. Dedicated revision pending. |
| 09 Ankylosaurus Crystal Cave | Pending | Pending | Pending | First Playable activity live. Dedicated revision pending. |
| 10 Egg Discovery | Pending | Pending | Pending | First Playable discovery live. Dedicated revision pending. |
| 11 Chapter Celebration | Pending | Pending | Pending | First Playable finale live. Dedicated revision pending. |

The pending design and asset fields refer to full-scene revisions, including where an approved Scene 03 map sprite exists. The [First Playable release](https://github.com/Chad-Martinez/math-quest/pull/1) supplies the existing baseline. Earlier rows cite the owner decisions and public PRs. The exact dates of those owner decisions are unrecorded.

## Record a decision

For each change record the scene and kit/version, decision type, owner decision and date when known, reference or PR, what remains open, and any verified deployment commit, date and checks. Keep owner acceptance, device verification and Pages publication distinguishable. Preserve prior approvals when reviewing a narrow follow-up. Use “unrecorded” when evidence is missing. Keep private learner details out of the record.
