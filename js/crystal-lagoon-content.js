export const lagoonScene = {
  "id": "scene-08",
  "title": "Mosasaurus Crystal Lagoon",
  "stop": 4,
  "challenge": "minimum-more",
  "beats": [
    {
      "id": "arrival",
      "backgrounds": {
        "landscape": "assets/shore-landscape.webp",
        "portrait": "assets/shore-portrait.webp"
      },
      "mosasaurus": "assets/mosa-leap.png",
      "primaryAction": "Explore the Lagoon!",
      "dialogueKey": "arrival"
    },
    {
      "id": "marker",
      "backgrounds": {
        "landscape": "assets/shore-landscape.webp",
        "portrait": "assets/shore-portrait.webp"
      },
      "mosasaurus": "assets/mosa-neutral.png",
      "primaryAction": "Continue",
      "dialogueKey": "marker"
    },
    {
      "id": "compare",
      "backgrounds": {
        "landscape": "assets/shore-landscape.webp",
        "portrait": "assets/shore-portrait.webp"
      },
      "mosasaurus": "assets/mosa-neutral.png",
      "primaryAction": "Check answer",
      "dialogueKey": null
    },
    {
      "id": "activate",
      "backgrounds": {
        "landscape": "assets/shore-landscape.webp",
        "portrait": "assets/shore-portrait.webp"
      },
      "mosasaurus": "assets/mosa-neutral.png",
      "primaryAction": "Continue",
      "dialogueKey": "activate"
    },
    {
      "id": "explore",
      "backgrounds": {
        "landscape": "assets/underwater-landscape.webp",
        "portrait": "assets/underwater-portrait.webp"
      },
      "mosasaurus": "assets/mosa-swim.png",
      "primaryAction": "Continue",
      "dialogueKey": "explore"
    },
    {
      "id": "reveal",
      "backgrounds": {
        "landscape": "assets/passage-landscape.webp",
        "portrait": "assets/passage-portrait.webp"
      },
      "mosasaurus": "assets/mosa-swim.png",
      "primaryAction": "Explore the Crystal Cave",
      "dialogueKey": "reveal"
    }
  ],
  "next": "existing adventure map; unlock Stop 5 Ankylosaurus Crystal Cave",
  "layoutTargets": {
    "landscape": {
      "trexFeet": [
        0.2,
        0.86
      ],
      "mosaWaterline": [
        0.63,
        0.6
      ]
    },
    "portrait": {
      "trexFeet": [
        0.3,
        0.83
      ],
      "mosaWaterline": [
        0.62,
        0.59
      ]
    }
  },
  "layoutNote": "Anchors are starting targets; fit to actual shoreline; hide T-Rex underwater. Reveal beat shows passage then returns to shore for dialogue. Never display passage before correct submission."
};

export const lagoonDialogue = {
  "arrival": [
    [
      "T-Rex",
      "Look, Harrison! It's Mosasaurus!"
    ],
    [
      "Mosasaurus",
      "Hi, Harrison! I've been exploring the lagoon. I think I know where your missing egg might be!"
    ]
  ],
  "marker": [
    [
      "Mosasaurus",
      "This crystal marker reveals the hidden path to the cave."
    ],
    [
      "Mosasaurus",
      "But there's a secret. The blue holder needs to have more crystals than the green holder."
    ],
    [
      "T-Rex",
      "Can you figure out how many more blue crystals we need, Harrison?"
    ]
  ],
  "activate": [
    [
      "Mosasaurus",
      "Fantastic, Harrison! {answerWords} more crystals gives us {finalWords}. That’s one more than {greenWords}!"
    ],
    [
      "Mosasaurus",
      "You did it, Harrison! The crystal marker is glowing!"
    ],
    [
      "T-Rex",
      "What can you see, Mosasaurus?"
    ]
  ],
  "explore": [],
  "reveal": [
    [
      "Mosasaurus",
      "I found a hidden passage! It leads to Ankylosaurus Crystal Cave."
    ],
    [
      "T-Rex",
      "We're getting closer to the missing egg, Harrison!"
    ]
  ]
};

export const lagoonChallenge = {
  "id": "minimum-more",
  "firstPlaythrough": 0,
  "problem": "The green holder has {green} crystals. The blue holder has {blue} crystals. What is the smallest number of crystals we need to add to the blue holder so it has more crystals than the green holder?",
  "variants": [
    {
      "green": 9,
      "blue": 6,
      "supply": 6,
      "answer": 4,
      "finalBlue": 10
    },
    {
      "green": 8,
      "blue": 5,
      "supply": 6,
      "answer": 4,
      "finalBlue": 9
    },
    {
      "green": 7,
      "blue": 5,
      "supply": 5,
      "answer": 3,
      "finalBlue": 8
    },
    {
      "green": 12,
      "blue": 8,
      "supply": 7,
      "answer": 5,
      "finalBlue": 13
    },
    {
      "green": 10,
      "blue": 9,
      "supply": 4,
      "answer": 2,
      "finalBlue": 11
    },
    {
      "green": 11,
      "blue": 6,
      "supply": 8,
      "answer": 6,
      "finalBlue": 12
    }
  ],
  "rules": {
    "answer": "green-blue+1",
    "supply": "answer+2",
    "greenUnchanged": true,
    "added": "integer 0..supply",
    "currentBlue": "blue+added",
    "remainingSupply": "supply-added",
    "submission": "integer equal to original answer, not remaining moves",
    "successReconcile": "set added to answer; animate signed difference only"
  },
  "hints": [
    [
      "Mosasaurus",
      "The blue holder needs more crystals, not just the same number."
    ],
    [
      "T-Rex",
      "First, let's make both groups equal."
    ],
    [
      "Mosasaurus",
      "Now add just one more blue crystal."
    ]
  ],
  "feedback": [
    {
      "when": "answer == answerKey",
      "text": "Correct; use activate dialogue."
    },
    {
      "when": "answer == green-blue",
      "speaker": "T-Rex",
      "text": "That makes {greenWords} blue crystals. Both groups are equal, but we need blue to have more!"
    },
    {
      "when": "answer == green",
      "speaker": "T-Rex",
      "text": "{green} is how many green crystals there are. How many extra blue crystals do we need?"
    },
    {
      "when": "answer == green+1",
      "speaker": "Mosasaurus",
      "text": "{finalBlue} is how many blue crystals we want altogether. How many should we add?"
    },
    {
      "when": "answer > answerKey",
      "speaker": "Mosasaurus",
      "text": "That works, but can you use fewer crystals and still have more than green?"
    },
    {
      "when": "otherwise",
      "speaker": "T-Rex",
      "text": "Let's compare the two holders and see how many extra crystals we need."
    }
  ],
  "guidedExample": {
    "green": 5,
    "blue": 3,
    "equalAdded": 2,
    "answer": 3,
    "finalBlue": 6,
    "steps": [
      "Add two to match five.",
      "Add one more to make six.",
      "Count all three added crystals."
    ]
  },
  "transfer": {
    "green": 8,
    "blue": 5,
    "answer": 4
  }
};

export const lagoonAnimations = {
  "sequences": [
    {
      "event": "arrival",
      "durationMs": 1200,
      "action": "reuse T-Rex walk frames"
    },
    {
      "event": "surface",
      "durationMs": 800,
      "action": "translate original mosa-leap behind waterline mask; ripple overlay"
    },
    {
      "event": "marker",
      "durationMs": 900,
      "action": "translate original mosa-neutral toward marker"
    },
    {
      "event": "learning",
      "durationMs": 350,
      "action": "focus workspace"
    },
    {
      "event": "add",
      "durationMs": 250,
      "action": "move one crystal; update state once"
    },
    {
      "event": "equal",
      "durationMs": 350,
      "action": "matching outlines"
    },
    {
      "event": "greater",
      "durationMs": 400,
      "action": "subtle emphasis; no automatic success"
    },
    {
      "event": "activate",
      "durationMs": 700,
      "action": "marker glow only after correct submission"
    },
    {
      "event": "dive",
      "durationMs": 600,
      "action": "translate swim sprite beneath waterline"
    },
    {
      "event": "exploration",
      "durationMs": 2000,
      "action": "translate and gently rotate original swim sprite; no invented frame sequence"
    },
    {
      "event": "reveal",
      "durationMs": 800,
      "action": "crossfade to passage art"
    },
    {
      "event": "return",
      "durationMs": 700,
      "action": "return to shore with surface sprite"
    },
    {
      "event": "departure",
      "durationMs": 350,
      "action": "return to map"
    }
  ],
  "policy": "Finite, interruptible, no decorative loops; reduced motion shows final static state. Cancel narration and animation on navigation; no required waiting; cinematic skip preserves success and shows reveal dialogue."
};

export const lagoonGuide = {
  "objective": "Distinguish equal from more and find the minimum additional quantity.",
  "materials": "Use {green} green and {blue} blue LEGO bricks; keep {supply} spare blue bricks.",
  "prompts": [
    "Do both groups have the same number now?",
    "Does blue have more than green yet?",
    "What happens if you add one more blue brick?",
    "Could you use fewer bricks and still have more?"
  ],
  "equations": [
    "{green} − {blue} = {difference}",
    "{difference} + 1 = {answer}",
    "{blue} + {answer} = {finalBlue}"
  ],
  "misconceptions": "Equal is a useful partial result; acknowledge larger valid quantities and ask for the smallest.",
  "transfer": {
    "question": "One dinosaur has eight toy cars. Another has five. What is the smallest number of additional toy cars the second dinosaur needs to have more than the first?",
    "answer": 4,
    "explanation": "Add three to match eight; one more makes nine."
  }
};
