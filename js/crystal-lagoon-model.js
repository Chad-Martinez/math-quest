import { createAlignedTransferModel } from './triceratops-model.js';

export const lagoonArt = './assets/scene-08/';
const gems = './assets/objects/';
const appearance = {
  name: 'Crystal comparison workspace', rows: 'Aligned green and blue crystals', first: 'Green holder', second: 'Blue holder',
  fixedAsset: gems + 'green-gem.png', movingAsset: gems + 'blue-gem.png', supplyAsset: lagoonArt + 'empty-holder.svg',
  item: 'crystal', addLabel: 'Add a Crystal',
  status: {
    shorter: 'Blue has fewer crystals. Try adding a spare blue crystal.',
    equal: 'The holders have the same number. Blue needs more.',
    greater: 'Blue has more. Could you use fewer added crystals?',
  },
  minimum: 'Blue has just one more crystal than green.',
};

export function createLagoonModel({ values, read, update, ...options }) {
  const model = createAlignedTransferModel({ ...options,
    values: { target: values.green, initial: values.blue, missing: values.answer, supply: values.supply },
    read: () => ({ shared: read().added }),
    update: ({ shared }, support) => update({ added: shared }, support),
  }, appearance);
  model.board.classList.add('lagoon-model');
  return model;
}
