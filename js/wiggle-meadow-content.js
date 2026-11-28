export const meadowScene = {
  "scene": 7,
  "title": "Stegosaurus Wiggle Meadow",
  "kind": "optional-movement-break",
  "afterStop": 3,
  "beforeStop": 4,
  "beats": [
    "welcome",
    "stretch",
    "stomp",
    "march",
    "wiggle",
    "cooldown",
    "departure"
  ],
  "countsAsChallenge": false,
  "reward": false,
  "backgrounds": {
    "landscape": "assets/meadow-landscape.webp",
    "portrait": "assets/meadow-portrait.webp"
  },
  "layout": {
    "landscape": {
      "characterGroundY": 0.78,
      "characterCenterX": 0.46
    },
    "portrait": {
      "characterGroundY": 0.76,
      "characterCenterX": 0.5
    }
  },
  "skipDestination": "existing-map-next-stop-4"
};

export const meadowDialogue = [
  {
    "id": "welcome",
    "dialogue": [
      [
        "T-Rex",
        "We've been working hard, Harrison! Let's take a little dinosaur break!"
      ],
      [
        "Stegosaurus",
        "Hi, Harrison! Come move like a dinosaur with me!"
      ]
    ],
    "primary": "Let's Wiggle!"
  },
  {
    "id": "stretch",
    "speaker": "Brachiosaurus",
    "dialogue": "Stretch up tall, Harrison! Reach toward the sky like me!",
    "instruction": "Reach upward gently, then lower your arms. Repeat three times.",
    "repetitions": 3,
    "primary": "I Did It!",
    "seated": "Reach up comfortably while seated."
  },
  {
    "id": "stomp",
    "speaker": "Triceratops",
    "dialogue": "Let's stomp our feet like a Triceratops, Harrison!",
    "instruction": "Make five gentle stomps in place.",
    "repetitions": 5,
    "primary": "I Did It!",
    "seated": "Gently tap your feet while seated."
  },
  {
    "id": "march",
    "speaker": "Velociraptor",
    "dialogue": "Lift your knees and march with me, Harrison!",
    "instruction": "March in place for six comfortable steps.",
    "repetitions": 6,
    "primary": "I Did It!",
    "seated": "Alternate lifting your feet while seated."
  },
  {
    "id": "wiggle",
    "speaker": "Stegosaurus",
    "dialogue": "Imagine you have a big dinosaur tail. Wiggle it from side to side!",
    "instruction": "Gently sway from left to right four times.",
    "repetitions": 4,
    "primary": "I Did It!",
    "seated": "Gently sway your shoulders while seated."
  },
  {
    "id": "cooldown",
    "dialogue": [
      [
        "T-Rex",
        "Great moving, Harrison! Let's slow down and take two nice, easy breaths."
      ],
      [
        "T-Rex",
        "Ready for our next adventure?"
      ]
    ],
    "repetitions": 2,
    "primary": "I'm Ready!"
  },
  {
    "id": "departure",
    "dialogue": [
      [
        "Stegosaurus",
        "Mosasaurus is just ahead, Harrison! I think he can help you find the missing egg."
      ],
      [
        "T-Rex",
        "Come on, Harrison! Let's go meet Mosasaurus!"
      ]
    ],
    "primary": "Visit Mosasaurus"
  }
];

export const meadowAnimations = {
  "stretch": {
    "frames": [
      "brachio-looking-down",
      "brachio-reaching",
      "brachio-neutral"
    ],
    "repetitions": 3,
    "cycleMs": 1800
  },
  "stomp": {
    "frames": [
      "triceratops-idle",
      "triceratops-stomp",
      "triceratops-idle"
    ],
    "repetitions": 5,
    "cycleMs": 850
  },
  "march": {
    "frames": [
      "raptor-neutral",
      "raptor-side"
    ],
    "repetitions": 6,
    "cycleMs": 650,
    "method": "provisional gentle step-in-place pose swap with small vertical motion; do not claim true alternating-leg animation"
  },
  "wiggle": {
    "frames": [
      "stego-wiggle-1",
      "stego-wiggle-2",
      "stego-wiggle-3",
      "stego-wiggle-4",
      "stego-wiggle-5",
      "stego-wiggle-6",
      "stego-wiggle-7",
      "stego-wiggle-8"
    ],
    "repetitions": 4,
    "cycleMs": 2000,
    "fallback": "stego-idle with small grounded sway"
  },
  "cooldown": {
    "asset": "breathing-flower.svg",
    "scale": [
      1,
      1.12,
      1
    ],
    "cycleMs": 4000,
    "repetitions": 2
  },
  "reducedMotion": "static pose, no scaling or automatic motion",
  "interruptible": true
};

export const meadowGuide = {
  "purpose": "Optional movement and attention reset, not a math lesson or a measure of ADHD.",
  "parentTips": [
    "Clear a comfortable space. Encourage gentle movement, not perfection.",
    "Offer seated alternatives or skip any activity.",
    "Let Harrison decide when ready. Never enforce repetitions or breathing pace.",
    "Automatic break can be disabled while preserving on-demand breaks.",
    "Observe whether the break helps engagement; responses vary."
  ]
};
