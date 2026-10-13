// Additive Steve Notes integration. This module never reads or writes saved work.
export const NOTES_ORIGIN = 'https://steve-notes.steven-cowell.chatgpt.site';
export const NOTES_URL = `${NOTES_ORIGIN}/`;

export function isNotesLoginMessage(event, frame) {
  return Boolean(frame && event.origin === NOTES_ORIGIN &&
    event.source === frame.contentWindow &&
    event.data?.type === 'openai-sites-login-required');
}

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
    el('p', 'Your notes and tasks, together in your Launchpad.', {class: 'notes-trial-intro'}));
  const open = el('a', 'Open Steve Notes ↗', {href: NOTES_URL, target: '_blank', rel: 'noopener noreferrer', class: 'notes-trial-open'});
  heading.append(title, open);
  const help = el('p', 'Steve Notes keeps its own private sign-in. If it asks you to log in or does not display below, use Open Steve Notes.', {class: 'notes-trial-help'});
  const controls = el('div', undefined, {class: 'notes-trial-controls', 'aria-label': 'Choose notes view'});
  const embedBody = el('div', undefined, {class: 'notes-trial-body'});
  const status = el('p', 'The embedded view has not been loaded.', {role: 'status', 'aria-live': 'polite', class: 'notes-trial-status'});
  const placeholder = el('div', undefined, {class: 'notes-trial-placeholder'});
  placeholder.append(el('h3', 'Try Steve Notes here'), el('p', 'This opens your existing private app. No Launchpad notes are copied or imported.'));
  const frameHost = el('div', undefined, {class: 'notes-trial-frame-host'});
  let frame = null;
  const load = () => {
    if (frame) return;
    frame = el('iframe', undefined, {
      src: NOTES_URL, title: 'Private Steve Notes', referrerpolicy: 'no-referrer',
      sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads',
      class: 'notes-trial-frame'
    });
    // A load event cannot establish whether cross-origin sign-in succeeded.
    frame.addEventListener('load', () => {
      if (status.dataset.loginRequired !== 'true') status.textContent = 'Embedded page loaded. If your notes are not visible, use Open Steve Notes.';
    });
    frame.addEventListener('error', () => { status.textContent = 'The embedded view could not load. Use Open Steve Notes.'; });
    status.textContent = 'Opening the private embedded view. The direct link stays available.';
    placeholder.hidden = true;
    frameHost.append(frame);
  };
  placeholder.append(button('Load Steve Notes here', load));
  embedBody.append(status, placeholder, frameHost);
  const legacyHelp = el('p', 'Your original Launchpad panel is shown below. Its notes, calendar, backups and settings are unchanged. No content has been migrated to Steve Notes.', {class: 'notes-trial-help'});
  legacyHelp.hidden = true;
  const showEmbed = () => {
    board.dataset.notesTrialHidden = 'true';
    embedBody.hidden = false; legacyHelp.hidden = true;
    notesButton.setAttribute('aria-pressed', 'true'); legacyButton.setAttribute('aria-pressed', 'false');
  };
  const showLegacy = () => {
    delete board.dataset.notesTrialHidden;
    embedBody.hidden = true; legacyHelp.hidden = false;
    notesButton.setAttribute('aria-pressed', 'false'); legacyButton.setAttribute('aria-pressed', 'true');
  };
  const notesButton = button('Steve Notes view', showEmbed);
  const legacyButton = button('Show saved Launchpad panel', showLegacy);
  controls.append(notesButton, legacyButton);
  const preservation = el('p', 'Use Show saved Launchpad panel to return to your original work. Its notes, calendar and settings stay in this browser; no content has been moved.', {class: 'notes-trial-preservation'});
  panel.append(heading, help, controls, embedBody, legacyHelp, preservation);
  board.before(panel);
  showEmbed();
  // Capture phase reveals the panel before existing calendar handlers scroll it.
  const revealLegacy = () => showLegacy();
  win.addEventListener('launchpad:open-calendar', revealLegacy, true);
  win.addEventListener('launchpad:open-today', revealLegacy, true);
  win.addEventListener('launchpad:choose-calendar', revealLegacy, true);
  const message = event => {
    if (!isNotesLoginMessage(event, frame)) return;
    status.dataset.loginRequired = 'true';
    status.textContent = 'Sign-in is required in this embedded view. Open Steve Notes in its own tab. Your notes remain private.';
  };
  win.addEventListener('message', message);
  if (win.location?.hash === '#calendar') showLegacy();
  return {panel, load, showEmbed, showLegacy, get frame() { return frame; }, destroy() {
    win.removeEventListener('message', message);
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
