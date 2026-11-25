export function moveOne(moved, action, limit) {
  if (action === 'move') return Math.min(limit, moved + 1);
  if (action === 'return') return Math.max(0, moved - 1);
  if (action === 'reset') return 0;
  return moved;
}

export function partWholeState({ total, known }, moved) {
  const relation = Math.sign(moved - known);
  return { red: moved, remaining: total - moved, relation };
}

export function balanceState({ left, rightParts, action }, moved) {
  const leftCount = action === 'remove-left' ? left - moved : left;
  const fixedRight = rightParts.reduce((total, count) => total + count, 0);
  const rightCount = action === 'add-right' ? fixedRight + moved : fixedRight;
  return { leftCount, rightCount, relation: Math.sign(leftCount - rightCount) };
}
