const dialog = document.getElementById('mail-chooser');

// Keep the card's DET URL as a fallback; the chooser never stores a preference.
document.addEventListener('click', event => {
  const card = event.target.closest?.('.destination-card[aria-controls="mail-chooser"]');
  if (!card || !dialog) return;
  event.preventDefault();
  if (!dialog.open) dialog.showModal();
});

dialog?.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = dialog.querySelectorAll('a[href], button:not([disabled])');
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

dialog?.addEventListener('click', event => {
  if (event.target.closest?.('[data-close-mail]')) {
    dialog.close();
    return;
  }
  // A click on the dialog's padding is inside; only its backdrop dismisses it.
  if (event.target !== dialog) return;
  const { left, right, top, bottom } = dialog.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
    dialog.close();
  }
});
