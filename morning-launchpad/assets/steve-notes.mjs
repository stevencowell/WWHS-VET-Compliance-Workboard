// Additive Clevernote card. This module never reads or writes saved work.
export const NOTES_ORIGIN = 'https://steve-notes.steven-cowell.chatgpt.site';
export const NOTES_URL = `${NOTES_ORIGIN}/`;
export const NOTES_LOGO = new URL('./clevernote-rhino.png', import.meta.url).href;

export function mountNotesTrial(board, {document: doc = document, window: win = window} = {}) {
  if (!board || board.dataset.notesTrialMounted === 'true') return null;
  board.dataset.notesTrialMounted = 'true';
  const el = (tag, text, attributes = {}) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const panel = el('section', undefined, {class: 'notes-trial clevernote-card', 'aria-labelledby': 'notes-trial-title'});
  const heading = el('div', undefined, {class: 'clevernote-card-main'});
  const identity = el('div', undefined, {class: 'clevernote-card-identity'});
  const logo = el('div', undefined, {class: 'clevernote-card-mark'});
  logo.append(el('img', undefined, {src: NOTES_LOGO, alt: 'Clevernote rhino', width: '132', height: '88', decoding: 'async'}));
  const title = el('div', undefined, {class: 'clevernote-card-copy'});
  title.append(el('p', 'YOUR PRIVATE NOTEBOOK', {class: 'clevernote-card-eyebrow'}),
    el('h2', 'Clevernote', {id: 'notes-trial-title'}),
    el('p', 'A little space for your next big idea.', {class: 'clevernote-card-intro'}));
  identity.append(logo, title);
  const action = el('div', undefined, {class: 'clevernote-card-action'});
  const open = el('a', 'Open Clevernote', {href: NOTES_URL, target: '_blank', rel: 'noopener noreferrer', class: 'notes-trial-open', title: 'Opens in a new tab'});
  open.append(el('span', undefined, {class: 'clevernote-card-external', 'aria-hidden': 'true'}));
  action.append(open, el('p', 'Notes, ideas and things to do', {class: 'clevernote-card-caption'}));
  heading.append(identity, action);
  const footer = el('div', undefined, {class: 'clevernote-card-footer'});
  const hint = el('p', 'Your notes, one click away.', {class: 'clevernote-card-hint'});
  const legacyButton = el('button', 'Show saved Launchpad panel', {type: 'button', class: 'clevernote-card-legacy', 'aria-expanded': 'false'});
  const legacyHelp = el('p', 'Your saved notes, calendar and settings remain in this browser.', {class: 'clevernote-card-preservation'});
  legacyHelp.hidden = true;
  const showEmbed = () => {
    board.dataset.notesTrialHidden = 'true';
    legacyHelp.hidden = true;
    legacyButton.textContent = 'Show saved Launchpad panel';
    legacyButton.setAttribute('aria-expanded', 'false');
  };
  const showLegacy = () => {
    delete board.dataset.notesTrialHidden;
    legacyHelp.hidden = false;
    legacyButton.textContent = 'Hide saved Launchpad panel';
    legacyButton.setAttribute('aria-expanded', 'true');
  };
  legacyButton.addEventListener('click', () => board.dataset.notesTrialHidden === 'true' ? showLegacy() : showEmbed());
  footer.append(hint, legacyButton);
  panel.append(heading, footer, legacyHelp);
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
