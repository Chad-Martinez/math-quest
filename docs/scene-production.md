# Scene production standard

## Before implementation

1. Read the applicable agent instructions and [approval register](approval-register.md). Identify the authorized scene, approved kit revision, exact content and the existing entry, exit and resume behavior.
2. Inventory artwork and dependencies. Review the preceding and following scene, shared components, tests and [release scope](release-scope.md). Use the approved written behavior and mathematical requirements if a composition reference differs. Bring material creative or behavior conflicts to the owner.
3. Use the [scene-kit starter](../templates/scene-kit/README.md) to keep a single source for each detail. An existing approved kit can organize the same information differently.

## Composition and interaction

Layer approved environment, sprites, props and semantic controls. Use actual HTML for dialogue and actions. Preserve character proportions and feet or waterline. Use supplied orientation variants and keep focal landmarks, controls and safe areas visible. Highlight a baked-in prop in place. Report differences from approved art, including crops, overlaps and visual compromises.

Show one approved dialogue segment at a time. **Listen** speaks that segment on request and can stop or replay it. Keep the text usable when speech is unavailable. Cancel obsolete narration on advance, exit or reset. Maintain predictable focus and provide alternatives to drag. Follow the [educational requirements](educational-requirements.md) for interactive math and parent guidance.

Give each mathematical challenge distinctive objects and interactions. Consecutive challenges may repeat a mechanic when the sequence serves an explicit instructional purpose.

Make each solution advance the central mission by removing an obstacle, discovering a clue, or changing the game world. A celebration can accompany that consequence.

## Animation and state

Record each sequence’s trigger, target, frames or start and end pose, anchors, delay, duration, easing, completion, cancellation and reduced-motion outcome. Use the kit’s timing. For example, Scene 03 uses four walk frames at roughly 8–10 fps and path travel at roughly 1.2–1.6 seconds. Those choices belong to that scene.

Use CSS, SVG or the Web Animations API where they fit the existing implementation. Use finite movement to direct attention or show a mathematical change. Avoid flashing, perpetual decoration and looping calls to action. Keep reasoning screens calm. Make controls available and offer a skip for nonessential waits. Prevent rapid input from causing duplicate navigation or rewards. Tear down timers, frame callbacks, listeners and speech when their scene or activity ends. Reduced motion reaches the same settled pose, focus and logical destination. Renders and previews leave learning outcomes and rewards alone.

## Handoff

Run the suites applicable to the change. Capture meaningful settled states and dynamic sequences separately, compare the composition with the approved references, and report actual results, changed files, limitations and physical iPad checks. Include what the owner should review. Record decisions in the [approval register](approval-register.md). An approved development preview and a verified Pages deployment are separate records.
