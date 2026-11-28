export const mapSpec = {
  viewBox: [0, 0, 1648, 928],
  stops: [
    {"id": "start", "label": "Empty Nest", "x": 230, "y": 758, "characterAsset": null},
    {"id": "1", "label": "Berry Grove", "x": 444, "y": 641, "characterAsset": "brachiosaurus.png"},
    {"id": "2", "label": "Raptor Trail", "x": 660, "y": 789, "characterAsset": "velociraptor.png"},
    {"id": "3", "label": "Triceratops Bridge", "x": 1000, "y": 625, "characterAsset": "triceratops.png"},
    {"id": "break", "label": "Wiggle Meadow", "x": 1200, "y": 465, "characterAsset": "stegosaurus.png"},
    {"id": "4", "label": "Crystal Lagoon", "x": 868, "y": 329, "characterAsset": "mosasaurus-map.png"},
    {"id": "5", "label": "Crystal Cave", "x": 1330, "y": 291, "characterAsset": "ankylosaurus.png"},
  ],
  segments: [
    {"from": "start", "to": "1", "points": [[230, 758], [287, 740], [321, 691], [360, 665], [444, 641]]},
    {"from": "1", "to": "2", "points": [[444, 641], [465, 681], [478, 725], [505, 766], [557, 785], [660, 789]]},
    {"from": "2", "to": "3", "points": [[660, 789], [732, 783], [799, 759], [854, 720], [915, 680], [962, 646], [1000, 625]]},
    {"from": "3", "to": "break", "points": [[1000, 625], [1101, 635], [1168, 612], [1184, 570], [1152, 530], [1174, 492], [1200, 465]]},
    {"from": "break", "to": "4", "points": [[1200, 465], [1180, 441], [1122, 420], [1060, 406], [1040, 380], [1035, 345], [1010, 315], [948, 326], [868, 329]]},
    {"from": "4", "to": "5", "points": [[868, 329], [940, 327], [1000, 313], [1058, 294], [1130, 292], [1215, 301], [1288, 305], [1330, 291]]},
  ],
  connectorSegments: [
    {"from": "1", "to": "2", "points": [[444, 641], [465, 681], [478, 725], [505, 766]]},
    {"from": "break", "to": "4", "points": [[1122, 420], [1060, 406], [1040, 380], [1035, 345], [1010, 315]]},
  ],
  dialogue: {
    "intro": "Look, Harrison! Here's our island. Let's follow the trail and ask our dinosaur friends for help!",
    "start": "Let's visit Brachiosaurus and gather some supplies!",
    "1": "Our supplies are ready! Let's find Velociraptor.",
    "2": "We're on the right trail! Let's visit Triceratops.",
    "3": "Before we visit the lagoon, let's stretch with Stegosaurus!",
    "break": "Let's head to the lagoon and meet Mosasaurus!",
    "4": "We're getting close! Ankylosaurus can help us open the cave.",
    "5": "The cave is open! Come on, Harrison. Let's find that egg!"
  },
};
