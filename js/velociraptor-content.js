export const trailChallenge = {
  "variants": [
    {
      "first": 12,
      "second": 8,
      "subject": "first",
      "relation": "more",
      "answer": 4,
      "question": "How many more footprints does the first trail have than the second trail",
      "statement": "The first trail has 4 more footprints than the second trail"
    },
    {
      "first": 10,
      "second": 6,
      "subject": "second",
      "relation": "fewer",
      "answer": 4,
      "question": "How many fewer footprints does the second trail have than the first trail",
      "statement": "The second trail has 4 fewer footprints than the first trail"
    },
    {
      "first": 7,
      "second": 11,
      "subject": "second",
      "relation": "more",
      "answer": 4,
      "question": "How many more footprints does the second trail have than the first trail",
      "statement": "The second trail has 4 more footprints than the first trail"
    },
    {
      "first": 14,
      "second": 9,
      "subject": "second",
      "relation": "fewer",
      "answer": 5,
      "question": "How many fewer footprints does the second trail have than the first trail",
      "statement": "The second trail has 5 fewer footprints than the first trail"
    },
    {
      "first": 8,
      "second": 10,
      "subject": "first",
      "relation": "fewer",
      "answer": 2,
      "question": "How many fewer footprints does the first trail have than the second trail",
      "statement": "The first trail has 2 fewer footprints than the second trail"
    },
    {
      "first": 13,
      "second": 7,
      "subject": "first",
      "relation": "more",
      "answer": 6,
      "question": "How many more footprints does the first trail have than the second trail",
      "statement": "The first trail has 6 more footprints than the second trail"
    }
  ],
  "firstPlaythrough": 0,
  "problemTemplate": "The first trail has {first} footprints. The second trail has {second} footprints. {question}?",
  "hints": [
    "Let’s match one footprint from each trail.",
    "Keep matching until the shorter trail runs out of footprints.",
    "Count the footprints that don’t have a partner."
  ],
  "feedback": {
    "group": "That’s how many footprints are in one trail. We’re looking for the difference.",
    "total": "That’s how many there are altogether. This time, we’re comparing the trails.",
    "other": "Let’s match the footprints and check how many are left over."
  },
  "guidedExample": {
    "first": 5,
    "second": 3,
    "answer": 2,
    "equation": "5 − 3 = 2"
  },
  "offerGuidanceAfterIncorrectAttempts": 2,
  "validation": "integer answer equals abs(first-second); verify direction semantics; correct takes precedence over misconception matches"
};

export const trailDialogue = {
  "arrival1": {
    "speaker": "T-Rex",
    "text": "Look, Harrison! Velociraptor is searching for clues!"
  },
  "arrival2": {
    "speaker": "Velociraptor",
    "text": "Hi, Harrison! I’ve found two trails of footprints. Will you help me investigate?"
  },
  "intro1": {
    "speaker": "Velociraptor",
    "text": "One trail has {first} footprints. The other trail has {second} footprints."
  },
  "intro2": {
    "speaker": "T-Rex",
    "text": "{question}, Harrison?"
  },
  "correct": {
    "speaker": "T-Rex",
    "text": "Great detective work, Harrison! {statement}!"
  },
  "clue1": {
    "speaker": "Velociraptor",
    "text": "Look, Harrison! A little piece of eggshell! We’re getting closer!"
  },
  "clue2": {
    "speaker": "T-Rex",
    "text": "That looks like the missing egg!"
  },
  "clue3": {
    "speaker": "Velociraptor",
    "text": "My friend Triceratops is just ahead. Maybe he saw something!"
  },
  "clue4": {
    "speaker": "T-Rex",
    "text": "Let’s go ask him, Harrison!"
  }
};

export const trailScene = {
  "sceneId": "05",
  "chapter": 1,
  "challengeNumber": 2,
  "title": "Velociraptor Trail",
  "entry": "Scene 03 Stop 2",
  "exit": "Scene 03 Stop 3",
  "beats": [
    {
      "id": "arrival",
      "dialogueIds": [
        "arrival1",
        "arrival2"
      ],
      "pose": "raptor-investigate",
      "action": "Let’s Investigate!"
    },
    {
      "id": "intro",
      "dialogueIds": [
        "intro1",
        "intro2"
      ],
      "pose": "raptor-gesture",
      "action": "Continue"
    },
    {
      "id": "compare",
      "optional": true,
      "pose": "raptor-neutral",
      "action": "Match a Pair"
    },
    {
      "id": "solve",
      "action": "Check Answer",
      "pose": "raptor-neutral"
    },
    {
      "id": "success",
      "dialogueIds": [
        "correct"
      ],
      "pose": "raptor-celebrate",
      "action": "Continue"
    },
    {
      "id": "clue",
      "dialogueIds": [
        "clue1",
        "clue2",
        "clue3",
        "clue4"
      ],
      "pose": "raptor-gesture",
      "action": "Visit Triceratops"
    }
  ],
  "layout": {
    "landscape": {
      "trexFoot": [
        0.18,
        0.9
      ],
      "raptorFoot": [
        0.65,
        0.85
      ],
      "workspace": "center-right"
    },
    "portrait": {
      "trexFoot": [
        0.24,
        0.82
      ],
      "raptorFoot": [
        0.72,
        0.82
      ],
      "workspace": "center; compact character portraits above"
    }
  },
  "contentFiles": [
    "dialogue.json",
    "challenges.json",
    "teaching-guides.json",
    "animation-sequences.json",
    "asset-manifest.json"
  ]
};

export const trailGuide = {
  "objective": "Understand the difference between two quantities, including reverse comparison.",
  "questions": [
    "Which trail has more footprints?",
    "Which trail has fewer?",
    "What are we trying to find out?",
    "Are we counting all the footprints or comparing the two groups?"
  ],
  "physicalDemo": "Align {first} and {second} LEGO bricks in two rows. Match pairs; count unmatched bricks.",
  "equations": [
    "{larger} − {smaller} = {difference}",
    "{smaller} + {difference} = {larger}"
  ],
  "reverse": "If the larger trail has {difference} more, the smaller trail has {difference} fewer.",
  "transfer": {
    "question": "T-Rex has 9 toy dinosaurs. Velociraptor has 6. How many fewer toy dinosaurs does Velociraptor have?",
    "answer": 3
  },
  "misconceptions": "A group total or sum may indicate the learner interpreted the question differently; ask them to explain, not diagnose."
};

export const trailAnimations = {
  "sequences": [
    {
      "event": "arrival",
      "action": "T-Rex walks into clearing",
      "durationMs": 1200
    },
    {
      "event": "greeting",
      "action": "Raptor changes from investigating to neutral",
      "durationMs": 500
    },
    {
      "event": "intro",
      "action": "Raptor gestures",
      "durationMs": 600
    },
    {
      "event": "learning",
      "action": "Workspace settles",
      "durationMs": 350
    },
    {
      "event": "match",
      "action": "Draw connector between matched pair",
      "durationMs": 200
    },
    {
      "event": "correct",
      "action": "Highlight unmatched prints",
      "durationMs": 500
    },
    {
      "event": "celebrate",
      "action": "Raptor hops once",
      "durationMs": 400
    },
    {
      "event": "clue",
      "action": "Transition to clue background and emphasize shell",
      "durationMs": 800
    },
    {
      "event": "next",
      "action": "Raptor gestures toward trail",
      "durationMs": 600
    },
    {
      "event": "exit",
      "action": "Return to map",
      "durationMs": 350
    }
  ],
  "rules": "One-shot, interruptible, reduced motion skips motion, cancel on navigation. No idle animation during math."
};
