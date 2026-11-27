// Keep drag optional. The source remains an ordinary button for tap and keyboard.
export function dragTo(source, targetFor, onDrop, canDrag = () => true) {
  let gesture;
  let suppressClick = false;
  source.classList.add('drag-source');

  function clear() {
    gesture?.ghost?.remove();
    gesture?.target?.classList.remove('drop-ready');
    gesture = undefined;
  }

  source.addEventListener('pointerdown', event => {
    if (gesture || !event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    if (!canDrag()) return;
    const target = targetFor();
    if (!target) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, target };
    source.setPointerCapture(event.pointerId);
  });

  function overTarget(event) {
    const rect = gesture.target.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  source.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    if (!gesture.ghost) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 9) return;
      const ghost = document.createElement('span');
      ghost.className = 'drag-ghost';
      const artwork = source.querySelector('img');
      if (artwork) ghost.append(artwork.cloneNode());
      else ghost.textContent = source.dataset.dragIcon || source.textContent;
      ghost.setAttribute('aria-hidden', 'true');
      document.body.append(ghost);
      gesture.ghost = ghost;
      suppressClick = true;
    }
    gesture.ghost.style.left = `${event.clientX}px`;
    gesture.ghost.style.top = `${event.clientY}px`;
    gesture.target.classList.toggle('drop-ready', overTarget(event));
  });

  source.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    const dropped = Boolean(gesture.ghost) && overTarget(event);
    clear();
    if (dropped && canDrag()) onDrop();
  });
  for (const name of ['pointercancel', 'lostpointercapture']) {
    source.addEventListener(name, event => {
      if (gesture?.id === event.pointerId) clear();
    });
  }
  source.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
