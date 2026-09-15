import {INBOX_KEY, LIMIT, linksIn, parseSummary, validateInbox, mergeInbox, safeUrl} from './summary-core.mjs';

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}
function button(text, action, className = '') {
  const node = element('button', text, {type: 'button', class: className});
  node.addEventListener('click', action);
  return node;
}

// An inert template retains links from Evernote HTML without executing scripts,
// rendering imported markup, or inserting its images into the live document.
export function textFromHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  fragment.querySelectorAll('script,style,iframe,object,embed,noscript,svg,form,template').forEach(node => node.remove());
  fragment.querySelectorAll('a[href]').forEach(node => {
    const url = safeUrl(node.getAttribute('href'));
    if (url && node.textContent.trim() !== url) node.append(document.createTextNode(` ${url}`));
  });
  fragment.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode('\n')));
  fragment.querySelectorAll('p,div,h1,h2,h3,h4,section,article,li,tr,table').forEach(node => {
    node.prepend(document.createTextNode('\n')); node.append(document.createTextNode('\n'));
  });
  return fragment.textContent;
}

class SummaryImport extends HTMLElement {
  connectedCallback() {
    if (this.started) return;
    this.started = true;
    this.inbox = {version: 1, items: [], importedAt: null};
    this.selected = new Set(); this.planState = {ready: false, count: 0, capacity: 'normal', closed: false};
    this.blocked = false; this.raw = null;
    try { this.raw = localStorage.getItem(INBOX_KEY); this.inbox = validateInbox(this.raw); }
    catch { this.blocked = true; }
    this.build();
    this.onPlan = event => { this.planState = event.detail; this.updateCount(); };
    this.onStorage = event => {
      if (event.key === INBOX_KEY || event.key === null) {
        this.blocked = true; this.updateCount();
        this.say('This review list changed in another tab. Reload before making changes.', true);
      }
    };
    window.addEventListener('launchpad:plan-updated', this.onPlan);
    window.addEventListener('storage', this.onStorage);
    const request = {};
    window.dispatchEvent(new CustomEvent('launchpad:plan-state', {detail: request}));
    if (request.state) this.planState = request.state;
    this.renderItems();
    if (this.blocked) this.say('The saved review list could not be read. It has been left untouched. Export a copy before recovering it.', true);
  }
  disconnectedCallback() {
    window.removeEventListener('launchpad:plan-updated', this.onPlan);
    window.removeEventListener('storage', this.onStorage);
    this.started = false;
  }
  say(message, error = false) {
    this.message.textContent = message;
    this.message.classList.toggle('import-error', error);
  }
  persist(next) {
    try {
      if (this.blocked || localStorage.getItem(INBOX_KEY) !== this.raw) throw new Error('The review list changed in another tab. Reload before saving.');
      const raw = JSON.stringify(next); validateInbox(raw);
      localStorage.setItem(INBOX_KEY, raw);
      this.raw = raw; this.inbox = next;
      return true;
    } catch (error) {
      this.say(`Could not save the review list. ${error.message} Your previous saved list is unchanged.`, true);
      return false;
    }
  }
  build() {
    this.replaceChildren();
    this.setAttribute('aria-label', 'Import and review your email summary');
    const heading = element('div', undefined, {class: 'import-heading'});
    const copy = element('div');
    copy.append(element('p', 'FROM YOUR NOTES TO TODAY', {class: 'eyebrow'}), element('h2', 'Bring your work into focus.'), element('p', 'Import your Evernote summary. Review the actions, then choose up to three for today.', {class: 'import-intro'}));
    heading.append(copy);
    const open = button('Import email summary', () => { this.inputDetails.open = true; this.paste.focus(); }, 'import-primary');
    heading.append(open); this.append(heading);
    this.message = element('p', '', {role: 'status', 'aria-live': 'polite', class: 'import-message'});
    this.append(this.message);

    this.inputDetails = element('details', undefined, {class: 'import-input'});
    this.inputDetails.append(element('summary', 'Paste a summary or open a notes file'));
    const label = element('label', 'Email summary or exported notes', {for: 'summary-paste'});
    this.paste = element('textarea', '', {id: 'summary-paste', rows: '7', maxlength: String(LIMIT), placeholder: 'Paste your summary here. Keep the exact note titles and any links.\n\n1. [Note : Example] — Confirm the next step'});
    const actions = element('div', undefined, {class: 'import-actions'});
    this.importButton = button('Review actions', () => this.importText(this.paste.value), 'import-primary');
    const fileLabel = element('label', 'Or choose a file', {for: 'summary-file'});
    this.file = element('input', undefined, {id: 'summary-file', type: 'file', accept: '.txt,.md,.html,.htm,.json,text/plain,text/html,application/json'});
    this.file.addEventListener('change', async () => {
      const file = this.file.files[0]; if (!file) return;
      try {
        if (file.size > LIMIT) throw new Error('Choose a file smaller than 1 MB.');
        const text = await file.text();
        if (/\.json$/i.test(file.name)) {
          const backup = validateInbox(text);
          this.importItems(backup.items, true);
        } else this.importText(/\.html?$/i.test(file.name) ? textFromHtml(text) : text);
      } catch (error) { this.say(error.message, true); }
      finally { this.file.value = ''; }
    });
    actions.append(this.importButton, fileLabel, this.file);
    this.inputDetails.append(label, this.paste, actions, element('p', 'Works with summaries, plain text and Evernote HTML exports. Titles and links stay attached to each action.', {class: 'import-help'}));
    this.append(this.inputDetails);

    this.toolbar = element('div', undefined, {class: 'import-toolbar'});
    this.counter = element('p');
    this.addButton = button('Add selected to today', () => this.addToPlan(), 'import-primary');
    this.toolbar.append(this.counter, this.addButton); this.append(this.toolbar);
    this.list = element('div', undefined, {class: 'import-list'}); this.append(this.list);
    this.other = element('details', undefined, {class: 'import-other'});
    this.otherHeading = element('summary', 'Waiting and later'); this.other.append(this.otherHeading);
    this.otherList = element('div', undefined, {class: 'import-list'}); this.other.append(this.otherList); this.append(this.other);
    this.resolved = element('details', undefined, {class: 'import-other'});
    this.resolvedHeading = element('summary', 'Already added or put aside'); this.resolved.append(this.resolvedHeading);
    this.resolvedList = element('div', undefined, {class: 'import-list'}); this.resolved.append(this.resolvedList); this.append(this.resolved);

    const footer = element('div', undefined, {class: 'import-footer'});
    this.explanation = element('p', 'Saved in this browser. Nothing is sent to Evernote. Suggestions use the wording of your notes; review dates and completion status.', {class: 'import-help'});
    footer.append(this.explanation, button('Export review list', () => {
      const raw = this.blocked ? this.raw : JSON.stringify(this.inbox, null, 2);
      if (raw === null) { this.say('There is no saved review list to export.'); return; }
      const url = URL.createObjectURL(new Blob([raw], {type: 'application/json'}));
      const link = element('a', 'Download', {href: url, download: 'launchpad-review-list.json'});
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }));
    this.append(footer);
  }
  importText(text) {
    try { this.importItems(parseSummary(text)); }
    catch (error) { this.say(error.message, true); }
  }
  importItems(incoming, backup = false) {
    const merged = mergeInbox(this.inbox.items, incoming);
    if (!this.persist({...this.inbox, items: merged.items, importedAt: new Date().toISOString()})) return;
    this.selected.clear(); this.paste.value = ''; this.inputDetails.open = false;
    this.renderItems();
    this.say(`${merged.added} ${backup ? 'review items restored' : 'actions imported'}. ${incoming.length - merged.added} already present. Review the suggestions and choose what belongs in today’s plan.`);
    this.toolbar.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  updateItem(id, changes, rerender = false) {
    if (this.persist({...this.inbox, items: this.inbox.items.map(item => item.id === id ? {...item, ...changes} : item)})) {
      if (rerender) this.renderItems();
      this.updateCount();
    }
  }
  card(item) {
    const article = element('article', undefined, {class: 'import-card'});
    const head = element('div', undefined, {class: 'import-card-top'});
    const pick = element('input', undefined, {type: 'checkbox', 'aria-label': `Choose ${item.title} for today`});
    pick.checked = this.selected.has(item.id); pick.disabled = this.blocked || item.status !== 'review';
    pick.addEventListener('change', () => {
      if (pick.checked) this.selected.add(item.id); else this.selected.delete(item.id);
      this.updateCount();
    });
    head.append(pick, element('strong', item.title));
    article.append(head, element('p', item.status === 'added' ? 'Added to a daily plan' : item.status === 'dismissed' ? 'Put aside' : item.reason, {class: 'import-reason'}));
    const action = element('textarea', item.action, {rows: '2', maxlength: '800', 'aria-label': `Action for ${item.title}`});
    action.disabled = this.blocked || item.status !== 'review';
    action.addEventListener('change', () => {
      if (!action.value.trim()) { action.value = item.action; this.say('Keep a short action, or put this item aside.', true); return; }
      this.updateItem(item.id, {action: action.value.trim()});
    });
    article.append(action);
    const details = element('details'); details.append(element('summary', 'Source and links'));
    details.append(element('p', 'Exact note title for Evernote search:'), element('p', item.title, {class: 'import-source-title'}));
    if (item.source) details.append(element('pre', item.source, {class: 'import-source'}));
    for (const url of item.links) details.append(element('a', url, {href: url, target: '_blank', rel: 'noopener noreferrer', class: 'import-source-link'}));
    const linkLabel = element('label', 'Link to use in today’s plan');
    const urlInput = element('input', undefined, {type: 'url', value: item.url, 'aria-label': `Work link for ${item.title}`, placeholder: 'https://… (optional)', maxlength: '2048'});
    urlInput.disabled = this.blocked || item.status !== 'review';
    urlInput.addEventListener('change', () => {
      const value = urlInput.value.trim();
      if (value && !safeUrl(value)) { urlInput.value = item.url; this.say('Use a full https:// link.', true); return; }
      this.updateItem(item.id, {url: value});
    });
    linkLabel.append(urlInput); details.append(linkLabel); article.append(details);
    const controls = element('div', undefined, {class: 'import-card-controls'});
    if (item.status === 'review') {
      const group = element('select', undefined, {'aria-label': `Review group for ${item.title}`});
      for (const [value, label] of [['ready', 'Consider for today'], ['later', 'Later'], ['waiting', 'Waiting on someone']]) {
        const option = element('option', label, {value}); group.append(option);
      }
      group.value = item.group; group.disabled = this.blocked;
      group.addEventListener('change', () => { this.selected.delete(item.id); this.updateItem(item.id, {group: group.value}, true); });
      const dismiss = button('Put aside', () => { this.selected.delete(item.id); this.updateItem(item.id, {status: 'dismissed'}, true); }); dismiss.disabled = this.blocked;
      controls.append(group, dismiss);
    } else {
      const restore = button('Review again', () => this.updateItem(item.id, {status: 'review'}, true)); restore.disabled = this.blocked;
      controls.append(restore);
    }
    article.append(controls); return article;
  }
  renderItems() {
    this.list.replaceChildren(); this.otherList.replaceChildren(); this.resolvedList.replaceChildren();
    const ready = this.inbox.items.filter(item => item.status === 'review' && item.group === 'ready').sort((a, b) => b.score - a.score);
    const other = this.inbox.items.filter(item => item.status === 'review' && item.group !== 'ready');
    const resolved = this.inbox.items.filter(item => item.status !== 'review');
    if (!this.inbox.items.length) this.list.append(element('p', 'Start with an email summary you already have. You won’t need to type the tasks again.', {class: 'import-empty'}));
    if (ready.length) this.list.append(element('h3', 'Consider for today'));
    ready.slice(0, 5).forEach(item => this.list.append(this.card(item)));
    const remainder = [...ready.slice(5), ...other];
    remainder.forEach(item => this.otherList.append(this.card(item)));
    resolved.forEach(item => this.resolvedList.append(this.card(item)));
    this.otherHeading.textContent = `More to review, waiting and later (${remainder.length})`;
    this.resolvedHeading.textContent = `Already added or put aside (${resolved.length})`;
    this.other.hidden = !remainder.length; this.resolved.hidden = !resolved.length;
    this.updateCount();
  }
  updateCount() {
    const capacity = this.planState.capacity === 'small' ? 1 : 3;
    const room = Math.max(0, capacity - this.planState.count);
    this.counter.textContent = this.planState.closed ? 'Today’s plan is wrapped up. Reopen it below to add priorities.' : `${this.selected.size} selected · Room for ${room} more today`;
    this.addButton.disabled = this.blocked || !this.planState.ready || this.planState.closed || !this.selected.size || this.selected.size > room;
    this.importButton.disabled = this.blocked; this.file.disabled = this.blocked;
    this.toolbar.hidden = !this.inbox.items.length;
  }
  addToPlan() {
    const items = this.inbox.items.filter(item => this.selected.has(item.id));
    const request = {items};
    window.dispatchEvent(new CustomEvent('launchpad:add-reviewed', {detail: request}));
    if (!request.result?.ok) { this.say(request.result?.message || 'Today’s plan is still loading. Try again in a moment.', true); return; }
    const count = request.result.count;
    if (this.persist({...this.inbox, items: this.inbox.items.map(item => this.selected.has(item.id) ? {...item, status: 'added'} : item)})) {
      this.selected.clear(); this.renderItems(); this.say(`${count} ${count === 1 ? 'priority added' : 'priorities added'} to today’s plan. The other actions are still here for later.`);
    } else this.say('Your priorities were saved to today’s plan, but the review list could not be updated. Reimporting will not duplicate them in today’s plan.', true);
    document.getElementById('daily-plan')?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
}
customElements.define('summary-import', SummaryImport);
