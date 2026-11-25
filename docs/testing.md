# Testing

Run `npm test` from the repository root. Tests sample 24,500 generated questions across 500 seeds and exercise number bounds, session variation, arithmetic, chart relationships, answer formats, hints, rewards, and storage recovery. Difficulty progression is deferred until adaptive difficulty is implemented.

## Manual iPad acceptance checklist

1. In Safari, open https://chad-martinez.github.io/math-quest/ and verify the map shows seven worlds. Rotate between portrait and landscape and check that controls remain visible and readable.
2. Open Story Forest. Try an incorrect answer and confirm you can retry. Use Hint twice and check that the clues progress. Enter a correct answer and confirm a single star appears.
3. Tap Read aloud, stop it, then replay it. Try changing questions while speech is active.
4. Open Draw, sketch with a finger or Apple Pencil if available, and clear the pad. Check that drawing does not scroll the page.
5. Try Dinosaur Island and complete the intermediate step before entering the final answer. Try a picture graph and tally chart and check the labels and countable marks.
6. Finish a five-challenge adventure. Return to the map and reload Safari. Check that stars persist. In Grown-ups, change the session length and verify it applies to the next adventure.

## Math tools on iPad

1. In Racing Valley, open **Math tools**. Pair rows or add one counter at a time. Check that the labels distinguish fewer, equal, and more, then try Undo.
2. In Story Forest, combine two groups into ten frames or tap objects to take them away. Tap a crossed-out object again to restore it.
3. In Dinosaur Island, open the model, complete the first step, and check that the next model uses the intermediate total. Tap Hint to work through the new step.
4. Continue to a worked example and verify that the next challenge has a new problem on the same skill. An adventure can add one such challenge.

## Drag and chart practice on iPad

1. In Racing Valley, drag **Match a pair** to the named row. Drop it outside the row first and verify that the count stays the same. A valid drop should add one match. Try the same control with a tap.
2. On a subtraction question, drag one object into the taken-away tray. The page should stay still during the gesture. Tap the crossed-out object to restore it.
3. In Sports Arena, look for a question about tying or taking the lead. Open **Math tools** and add votes until a row has five. Verify the fifth mark crosses the first four. Keep adding until the totals tie, then add one more and try Undo.
4. Try the same model in Animal Kingdom with picture votes. Close **Math tools** to see the original graph. Reopen it to continue the model.

## Parent Coach release checks

The Coach suite tests 2,000 seeded items per template with independent math checks, all active guide IDs, 14 handoff examples, transfer freshness, support classification, and storage migrations and resets.

1. In iPad Safari, open **Teaching tips** in portrait and landscape with a draft answer, an existing drawing, and an active Math tools model. Close and reopen the panel. Verify the draft and tool state are still present.
2. Test tab order, Escape, Close, VoiceOver announcements, and text zoom. Check that the panel scrolls, touch controls are reachable, and focus returns to Teaching tips.
3. With a number, choice, and chart statement question, verify that pre-reveal content stays in the panel and gives a strategy. Use **Reveal worked solution**, close the panel, then move to a different question. Its answer should require a new reveal.
4. Mark parent help, solve, and verify the correct star is still earned. Queue extra practice and verify the current item stays active until Next. Ask a learner to solve the follow-up using the same strategy.
5. Test spoken prompts in Safari with actual audio, including opening and closing the Coach while narration is active. Test the existing scoped and whole reset controls with disposable progress.

## Structured teaching release checks

1. From the map, open **Learn a skill** and choose **Find a missing part**. Verify the example is worked out, the guided problem shows a starting cue, and the independent problem uses fresh values and offers tools. Check portrait and landscape layout.
2. Complete the lesson and reload. Open Story Forest and check that **Review** appears on the first challenge and counts toward the chosen session length. Leave before answering, re-enter, and check that the same review remains available.
3. Finish the review, leave, then start another Story Forest adventure. Verify the completed review does not reappear. A scoped reset should erase pending reviews for that world.
4. With VoiceOver and the on-screen keyboard, check that the lesson picker, stage changes, and response controls are usable. Ask the learner which quantity the question asks for, then observe whether they can apply the relationship to a fresh problem.

## Math Workspace release checks

1. On iPad, open **Learn a skill → Find a missing part**. In Math tools, tap **Move one to red**, then drag the same control into the red group. Move the required number of beads and count the blue beads. Try moving one back and resetting. Drops outside the target should leave the counts alone.
2. Open **Learn a skill → Balance by taking away**. Drag **Take one from left** to the tray and watch which side has more. Check that the beam levels when both sides contain the same number of blocks. Put one back. In a missing-addend challenge in Equation Space, try adding a block to the right.
3. In both models, open and close **Teaching tips** and **Math tools**. Check that the counters and answer draft stay in place. Rotate the iPad and verify that the controls and drop zones are still reachable.
4. Try the movement controls with Tab and Space or Enter. With VoiceOver, listen for the side relationship and group counts. The answer field should stay blank until the learner enters a value.
