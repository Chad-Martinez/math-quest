export const berryChallenge = {
  "id": "gather-supplies",
  "firstPlay": {
    "red": 5,
    "blue": 7,
    "target": 16
  },
  "replayVariants": [
    {
      "red": 4,
      "blue": 6,
      "target": 13
    },
    {
      "red": 3,
      "blue": 8,
      "target": 16
    },
    {
      "red": 6,
      "blue": 4,
      "target": 12
    },
    {
      "red": 7,
      "blue": 6,
      "target": 14
    }
  ],
  "rules": {
    "red": "positive integer",
    "blue": "positive integer",
    "target": "integer <= 20",
    "total": "red + blue",
    "missing": "target - total",
    "valid": "1 <= missing <= 5"
  },
  "problem": "We need {target} berries for our journey. We have {red} red berries and {blue} blue berries. How many more berries do we need?",
  "steps": [
    {
      "id": "combine",
      "question": "How many berries do we have altogether?",
      "equation": "{red} + {blue} = □",
      "expected": "total",
      "hints": [
        "First, we need to find out how many berries we have altogether.",
        "Put the red berries and blue berries together. Count both groups.",
        "Start at {blue}. Count on {red} more."
      ],
      "feedback": {
        "group": "That’s one group of berries. What about the other group?",
        "default": "Let’s count both groups together."
      },
      "correctDialogue": "correct1"
    },
    {
      "id": "missing",
      "question": "Now, how many more berries do we need?",
      "equation": "{total} + □ = {target}",
      "expected": "missing",
      "hints": [
        "We have {total} berries, but we need {target}.",
        "Add berries until we have enough to fill our basket.",
        "Start at {total}. Count forward until you reach {target}."
      ],
      "feedback": {
        "total": "{total} is how many we already have. How many more do we need?",
        "target": "That’s how many we need altogether. How many more do we need?",
        "default": "Let’s check how many more berries will fill our basket."
      },
      "correctDialogue": "correct2"
    }
  ],
  "workedExample": {
    "red": 2,
    "blue": 3,
    "target": 7,
    "total": 5,
    "missing": 2,
    "steps": [
      "2 + 3 = 5",
      "5 + 2 = 7"
    ]
  },
  "transfer": {
    "red": 4,
    "blue": 5,
    "target": 12,
    "total": 9,
    "missing": 3
  },
  "finalEquations": [
    "{red} + {blue} = {total}",
    "{total} + {missing} = {target}"
  ]
};

export const berryDialogue = {
  "lines": {
    "arrival1": {
      "speaker": "T-Rex",
      "text": "Look, Harrison! It’s Brachiosaurus!"
    },
    "arrival2": {
      "speaker": "Brachiosaurus",
      "text": "Hello, Harrison! You’ll need some food for your adventure. Let’s collect some berries!"
    },
    "intro1": {
      "speaker": "Brachiosaurus",
      "text": "We need {target} berries for your journey. I’ve already collected {red} red berries and {blue} blue berries."
    },
    "intro2": {
      "speaker": "T-Rex",
      "text": "How many more berries do we need, Harrison?"
    },
    "step1": {
      "speaker": "T-Rex",
      "text": "First, let’s find out how many berries we already have."
    },
    "step2": {
      "speaker": "T-Rex",
      "text": "Now, how many more berries do we need?"
    },
    "correct1": {
      "speaker": "Brachiosaurus",
      "text": "That’s right! {red} plus {blue} makes {total} berries."
    },
    "correct2": {
      "speaker": "T-Rex",
      "text": "Great work, Harrison! We need {missing} more berries!"
    },
    "success1": {
      "speaker": "Brachiosaurus",
      "text": "Wonderful! Our basket has {target} berries. We’re ready for the journey!"
    },
    "success2": {
      "speaker": "T-Rex",
      "text": "We did it, Harrison!"
    },
    "clue1": {
      "speaker": "Brachiosaurus",
      "text": "Velociraptor was looking for footprints nearby. Maybe he can help you find the missing egg!"
    },
    "clue2": {
      "speaker": "T-Rex",
      "text": "Come on, Harrison! Let’s find Velociraptor!"
    }
  },
  "advance": "player-controlled",
  "narration": "optional Listen, exact displayed text"
};

export const berryScene = {
  "sceneId": "04",
  "title": "Brachiosaurus Berry Grove",
  "challengeNumber": 1,
  "chapter": 1,
  "entry": "Scene 03 Stop 1",
  "exit": "Scene 03 Stop 2",
  "beats": [
    {
      "id": "arrival",
      "dialogueIds": [
        "arrival1",
        "arrival2"
      ],
      "brachioPose": "brachio-greeting",
      "primaryAction": "Let’s Collect Berries!"
    },
    {
      "id": "intro",
      "dialogueIds": [
        "intro1",
        "intro2"
      ],
      "brachioPose": "brachio-neutral",
      "primaryAction": "Continue"
    },
    {
      "id": "combine",
      "dialogueIds": [
        "step1"
      ],
      "brachioPose": "brachio-neutral",
      "primaryAction": "Check Answer"
    },
    {
      "id": "missing",
      "dialogueIds": [
        "step2"
      ],
      "brachioPose": "brachio-looking-down",
      "primaryAction": "Check Answer"
    },
    {
      "id": "success",
      "dialogueIds": [
        "correct2",
        "success1",
        "success2"
      ],
      "brachioPose": "brachio-reaching",
      "primaryAction": "Continue"
    },
    {
      "id": "clue",
      "dialogueIds": [
        "clue1",
        "clue2"
      ],
      "brachioPose": "brachio-gesture-right",
      "primaryAction": "Follow the Trail"
    }
  ],
  "contentFiles": [
    "dialogue.json",
    "challenges.json",
    "teaching-guides.json",
    "animation-sequences.json",
    "asset-manifest.json"
  ],
  "layout": {
    "landscape": {
      "trex": {
        "footAnchor": [
          0.2,
          0.86
        ],
        "widthFraction": 0.25
      },
      "brachio": {
        "footAnchor": [
          0.73,
          0.78
        ],
        "widthFraction": 0.39
      },
      "dialogueZone": [
        0.25,
        0.08,
        0.67,
        0.32
      ],
      "primaryZone": [
        0.58,
        0.86,
        0.96,
        0.97
      ]
    },
    "portrait": {
      "trex": {
        "footAnchor": [
          0.23,
          0.79
        ],
        "widthFraction": 0.37
      },
      "brachio": {
        "footAnchor": [
          0.73,
          0.79
        ],
        "widthFraction": 0.48
      },
      "dialogueZone": [
        0.08,
        0.12,
        0.92,
        0.39
      ],
      "primaryZone": [
        0.08,
        0.87,
        0.92,
        0.97
      ]
    }
  },
  "notes": "Normalized viewport design targets, adjust for safe areas and actual ground; one bubble at a time."
};

export const berryGuide = {
  "objective": "Recognize that a word problem can require two calculations; find the missing amount after combining groups.",
  "comprehension": "What are we trying to find out? Point to “how many more do we need?”",
  "physicalDemo": [
    "Place {red} red objects and {blue} blue objects on a table.",
    "Ask Harrison to combine and count both groups. Leave all {total} objects visible.",
    "Ask him to add objects until there are {target}. Count only the added objects."
  ],
  "equations": [
    "{red} + {blue} = {total}",
    "{target} − {total} = {missing}"
  ],
  "alternative": "Count forward from {total} to {target}; count the jumps, not the starting number.",
  "misunderstandings": {
    "total": "May have completed only step one.",
    "group": "May have counted only one group.",
    "target": "May have identified the goal rather than the gap."
  },
  "transfer": {
    "question": "You need 15 LEGO bricks to build a tower. You have 4 red bricks and 6 blue bricks. How many more bricks do you need?",
    "answer": 5,
    "explanation": "4 + 6 = 10; 15 − 10 = 5."
  },
  "note": "Do not infer ADHD symptoms or a learning disability from mistakes."
};

export const berryAnimations = {
  "sequences": [
    {
      "trigger": "arrival",
      "action": "T-Rex walks in using approved four frames",
      "durationMs": 1200
    },
    {
      "trigger": "arrival greeting",
      "action": "Swap Brachiosaurus neutral to lowered-neck greeting, feet fixed",
      "durationMs": 700
    },
    {
      "trigger": "intro complete",
      "action": "Settle into calm learning workspace",
      "durationMs": 350
    },
    {
      "trigger": "combine tool",
      "action": "Move berries from both groups into shared grid, retain each identity",
      "durationMs": 500
    },
    {
      "trigger": "step1 correct",
      "action": "Brief emphasis on verified total",
      "durationMs": 300
    },
    {
      "trigger": "step2 correct",
      "action": "Swap to reaching pose, anchor feet",
      "durationMs": 700
    },
    {
      "trigger": "collection",
      "action": "Move exactly missing individual berries toward basket, stagger 150 ms",
      "durationMs": 500
    },
    {
      "trigger": "collection complete",
      "action": "T-Rex celebration bounce once",
      "durationMs": 400
    },
    {
      "trigger": "clue",
      "action": "Swap Brachiosaurus to gesture-right",
      "durationMs": 600
    },
    {
      "trigger": "follow trail",
      "action": "Return to map",
      "durationMs": 350
    }
  ],
  "rules": [
    "No continuous motion during learning.",
    "Skip nonessential animation for reduced motion; apply final state immediately.",
    "Animations cancellable; navigation and reward issuance idempotent.",
    "Collection duration 500 + 150*(missing-1) ms; visual-only, never changes answer or reward."
  ]
};
