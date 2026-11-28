export const bridgeChallenge = {
  "id": "make-equal",
  "problem": "The first row of the bridge has {target} wooden planks. The second row has {initial} wooden planks. How many more planks does the second row need to have the same number as the first row?",
  "firstPlaythrough": 0,
  "variants": [
    {
      "target": 11,
      "initial": 7,
      "missing": 4,
      "supply": 6
    },
    {
      "target": 9,
      "initial": 6,
      "missing": 3,
      "supply": 5
    },
    {
      "target": 12,
      "initial": 8,
      "missing": 4,
      "supply": 6
    },
    {
      "target": 10,
      "initial": 5,
      "missing": 5,
      "supply": 7
    },
    {
      "target": 8,
      "initial": 6,
      "missing": 2,
      "supply": 4
    },
    {
      "target": 14,
      "initial": 9,
      "missing": 5,
      "supply": 7
    }
  ],
  "rules": {
    "missing": "target - initial",
    "supply": "missing + 2",
    "targetUnchanged": true,
    "validShared": "integer in [0,supply]",
    "current": "initial + shared",
    "remainingSupply": "supply - shared",
    "answer": "missing (total shared, not remaining to move)"
  },
  "hints": [
    [
      "T-Rex",
      "Both rows need the same number of planks."
    ],
    [
      "Triceratops",
      "Add spare planks to the second row until the rows match."
    ],
    [
      "T-Rex",
      "Start at {initial} and count forward until you reach {target}."
    ]
  ],
  "feedback": [
    {
      "when": "answer == initial",
      "speaker": "Triceratops",
      "text": "{initial} is how many planks the second row already has. How many more does it need?"
    },
    {
      "when": "answer == target",
      "speaker": "T-Rex",
      "text": "{target} is how many planks each row needs altogether. How many extra planks do we need?"
    },
    {
      "when": "answer == missing + 1",
      "speaker": "Triceratops",
      "text": "That would give the second row more planks. We want the same number."
    },
    {
      "when": "answer == target + initial",
      "speaker": "T-Rex",
      "text": "That's how many planks we started with altogether. We're trying to make the rows equal."
    },
    {
      "when": "otherwise",
      "speaker": "T-Rex",
      "text": "Let's add spare planks and check whether the rows match."
    }
  ],
  "feedbackPriority": "correct first, then listed order",
  "guidedExample": {
    "target": 6,
    "initial": 4,
    "missing": 2,
    "supply": 4,
    "equation": "4 + 2 = 6"
  }
};

export const bridgeDialogue = {
  "arrival": [
    [
      "T-Rex",
      "Look, Harrison! The bridge is broken!"
    ],
    [
      "Triceratops",
      "I saw something shiny near the lagoon, but we can’t cross yet!"
    ]
  ],
  "introduction": [
    [
      "Triceratops",
      "One row of the bridge has {target} planks, but the other row only has {initial}."
    ],
    [
      "T-Rex",
      "Can you help us make both rows have the same number, Harrison?"
    ]
  ],
  "success": [
    [
      "Triceratops",
      "Great work, Harrison! {initial} plus {missing} makes {target}. Both rows have the same number of planks!"
    ]
  ],
  "crossing": [
    [
      "T-Rex",
      "It’s fixed! Let’s cross the bridge!"
    ]
  ],
  "clue": [
    [
      "Triceratops",
      "We’re one step closer to the lagoon! My friend Stegosaurus is just ahead in the meadow!"
    ],
    [
      "T-Rex",
      "Let’s stretch our legs before we visit the lagoon, Harrison!"
    ]
  ]
};

export const bridgeScene = {
  "id": "scene-06",
  "stop": 3,
  "title": "Triceratops Bridge",
  "challenge": "make-equal",
  "beats": [
    {
      "id": "arrival",
      "background": "broken-{orientation}",
      "triceratops": "triceratops-greeting",
      "primaryAction": "Let’s Fix It!",
      "dialogueKey": "arrival"
    },
    {
      "id": "introduction",
      "background": "broken-{orientation}",
      "triceratops": "triceratops-idle",
      "primaryAction": "Continue",
      "dialogueKey": "introduction"
    },
    {
      "id": "construction",
      "background": "river-{orientation}",
      "triceratops": "triceratops-thinking",
      "primaryAction": "Check Answer",
      "dialogueKey": null
    },
    {
      "id": "equality",
      "background": "river-{orientation}",
      "triceratops": "triceratops-stomp",
      "primaryAction": "Continue",
      "dialogueKey": "success"
    },
    {
      "id": "crossing",
      "background": "repaired-{orientation}",
      "triceratops": "triceratops-celebrate",
      "primaryAction": "Continue",
      "dialogueKey": "crossing"
    },
    {
      "id": "clue",
      "background": "repaired-{orientation}",
      "triceratops": "triceratops-pointing",
      "primaryAction": "Continue the Adventure",
      "dialogueKey": "clue"
    }
  ],
  "next": "existing adventure map; optional Stegosaurus Wiggle Meadow then Stop 4",
  "layoutTargets": {
    "landscape": {
      "trexFeet": [
        0.18,
        0.86
      ],
      "triceratopsFeet": [
        0.72,
        0.86
      ],
      "dialogueRegion": "upper middle, clear of faces",
      "primaryAction": "lower safe area"
    },
    "portrait": {
      "trexFeet": [
        0.25,
        0.79
      ],
      "triceratopsFeet": [
        0.74,
        0.79
      ],
      "dialogueRegion": "upper middle",
      "primaryAction": "lower safe area"
    }
  },
  "layoutNote": "Place characters on dry banks before repair; during crossing align feet to visible deck, never water. Fit background to composition without cropping bridge ends. Layout targets are starting points only.",
  "version": "2.0",
  "mapMigration": {
    "oldLabel": "Triceratops Picnic Clearing",
    "newLabel": "Triceratops Bridge",
    "stop": 3,
    "preserveExistingId": true,
    "preserveProgress": true
  }
};

export const bridgeGuide = {
  "objective": "Make two quantities equal by adding to the smaller group from a separate supply.",
  "questions": [
    "Which row has more planks?",
    "Which row has fewer?",
    "What does the same number mean?",
    "Which row needs to change?"
  ],
  "physicalDemo": "Make aligned rows of {target} and {initial} LEGO bricks or craft sticks. Keep extra pieces separate. Add to the shorter row until they match. Count the added pieces: {missing}.",
  "equations": [
    "{initial} + {missing} = {target}",
    "{target} − {initial} = {missing}"
  ],
  "misconceptions": [
    "Starting count is not the missing amount.",
    "Target count is not the amount added.",
    "Adding one beyond the difference makes the row larger, not equal.",
    "Taking from the longer row changes both groups."
  ],
  "boundary": "Ask what happens if one more piece is added after equality.",
  "transfer": {
    "question": "One path has 10 stepping stones. Another has 6. How many more stones does the second need to have the same number?",
    "answer": 4,
    "explanation": "Add four to six to make ten."
  }
};

export const bridgeAnimations = {
  "events": [
    {
      "event": "arrival",
      "durationMs": 1200,
      "action": "T-Rex walks on dry bank"
    },
    {
      "event": "greeting",
      "durationMs": 500,
      "action": "Triceratops greeting pose"
    },
    {
      "event": "learning",
      "durationMs": 350,
      "action": "Reveal calm workspace"
    },
    {
      "event": "place",
      "durationMs": 250,
      "action": "Move one spare plank into shorter row"
    },
    {
      "event": "undo",
      "durationMs": 250,
      "action": "Return one plank to supply"
    },
    {
      "event": "equal",
      "durationMs": 350,
      "action": "Brief matching outlines; no automatic completion"
    },
    {
      "event": "success-reconcile",
      "durationMs": 250,
      "action": "Per plank: move only missing remainder or return surplus"
    },
    {
      "event": "celebrate",
      "durationMs": 700,
      "action": "Two gentle stomps on dry bank"
    },
    {
      "event": "repair-transition",
      "durationMs": 350,
      "action": "Switch to repaired narrative environment only after validated answer"
    },
    {
      "event": "crossing",
      "durationMs": 1600,
      "action": "Walk both characters along deck from near bank to far bank, stagger 250 ms; use existing T-Rex walk and alternate Triceratops idle/step with gentle translation"
    },
    {
      "event": "clue",
      "durationMs": 600,
      "action": "Point toward trail"
    },
    {
      "event": "continue",
      "durationMs": 350,
      "action": "Return to existing map"
    }
  ],
  "constraints": [
    "No crossing before correct submission",
    "Reduced motion: immediate final state",
    "Cancel on navigation; no mandatory waits",
    "No duplicate rewards or repairs on resume"
  ]
};
