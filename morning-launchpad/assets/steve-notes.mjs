// Additive Steve Notes integration. This module never reads or writes saved work.
export const NOTES_ORIGIN = 'https://steve-notes.steven-cowell.chatgpt.site';
export const NOTES_URL = `${NOTES_ORIGIN}/`;

export function mountNotesTrial(board, {document: doc = document, window: win = window} = {}) {
  if (!board || board.dataset.notesTrialMounted === 'true') return null;
  board.dataset.notesTrialMounted = 'true';
  const el = (tag, text, attributes = {}) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const button = (text, action) => {
    const node = el('button', text, {type: 'button'});
    node.addEventListener('click', action);
    return node;
  };
  const panel = el('section', undefined, {class: 'notes-trial', 'aria-labelledby': 'notes-trial-title'});
  const heading = el('div', undefined, {class: 'notes-trial-heading'});
  const title = el('div');
  title.append(el('p', 'PRIVATE NOTES', {class: 'eyebrow'}),
    el('h2', 'Steve Notes', {id: 'notes-trial-title'}),
    el('p', 'Your private notes and tasks, one click away.', {class: 'notes-trial-intro'}));
  const open = el('a', 'Open Steve Notes ↗', {href: NOTES_URL, target: '_blank', rel: 'noopener noreferrer', class: 'notes-trial-open'});
  heading.append(title, open);
  const help = el('p', 'Open Steve Notes in its own tab to view and edit your notes. The embedded view has been removed because it did not work reliably.', {class: 'notes-trial-help'});
  const controls = el('div', undefined, {class: 'notes-trial-controls', 'aria-label': 'Choose notes view'});
  const legacyHelp = el('p', 'Your original Launchpad panel is shown below. Its notes, calendar, backups and settings are unchanged. No content has been migrated to Steve Notes.', {class: 'notes-trial-help'});
  legacyHelp.hidden = true;
  const showEmbed = () => {
    board.dataset.notesTrialHidden = 'true';
    help.hidden = false; legacyHelp.hidden = true;
    notesButton.setAttribute('aria-pressed', 'true'); legacyButton.setAttribute('aria-pressed', 'false');
  };
  const showLegacy = () => {
    delete board.dataset.notesTrialHidden;
    help.hidden = true; legacyHelp.hidden = false;
    notesButton.setAttribute('aria-pressed', 'false'); legacyButton.setAttribute('aria-pressed', 'true');
  };
  const notesButton = button('Steve Notes view', showEmbed);
  const legacyButton = button('Show saved Launchpad panel', showLegacy);
  controls.append(notesButton, legacyButton);
  const preservation = el('p', 'Use Show saved Launchpad panel to return to your original work. Its notes, calendar and settings stay in this browser; no content has been moved.', {class: 'notes-trial-preservation'});
  panel.append(heading, help, controls, legacyHelp, preservation);
  board.before(panel);
  showEmbed();
  // Capture phase reveals the panel before existing calendar handlers scroll it.
  const revealLegacy = () => showLegacy();
  win.addEventListener('launchpad:open-calendar', revealLegacy, true);
  win.addEventListener('launchpad:open-today', revealLegacy, true);
  win.addEventListener('launchpad:choose-calendar', revealLegacy, true);
  if (win.location?.hash === '#calendar') showLegacy();
  return {panel, showEmbed, showLegacy, destroy() {
    win.removeEventListener('launchpad:open-calendar', revealLegacy, true);
    win.removeEventListener('launchpad:open-today', revealLegacy, true);
    win.removeEventListener('launchpad:choose-calendar', revealLegacy, true);
    delete board.dataset.notesTrialMounted; delete board.dataset.notesTrialHidden; panel.remove();
  }};
}

export function bootNotesTrial(doc = document, win = window) {
  if (doc.documentElement.dataset.notesTrial !== 'true') return;
  const attach = () => {
    const board = doc.querySelector('summary-import');
    return board ? mountNotesTrial(board, {document: doc, window: win}) : null;
  };
  if (attach()) return;
  const observer = new win.MutationObserver(() => { if (attach()) observer.disconnect(); });
  observer.observe(doc.getElementById('root'), {childList: true, subtree: true});
}

if (typeof document !== 'undefined') bootNotesTrial();
