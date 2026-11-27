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

export function togglePiece(moved, piece, total) {
  if (!Number.isInteger(piece) || piece < 0 || piece >= total) return moved;
  const next = new Set(moved);
  if (next.has(piece)) next.delete(piece);
  else next.add(piece);
  return next;
}
