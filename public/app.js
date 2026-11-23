const find = (selector, parent = document) => parent.querySelector(selector);
const view = document.body.dataset.view;
const isAdmin = view === 'admin';
const hasDashboard = isAdmin || view === 'family';
const prefix = isAdmin ? '/api/admin' : '/api';
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const frenchDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const state = { page: 1, count: 0, size: 12, file: null, toDelete: null, config: null, analysis: null };
const fragment = new URLSearchParams(location.hash.slice(1));
const inviteToken = fragment.get('invite_token');
if (inviteToken) history.replaceState(null, '', `${location.pathname}${location.search}`);

let toastTimer;
function notify(message) {
  const toast = find('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { ...options, mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'same-origin' });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Connexion interrompue. Vérifiez votre accès Internet puis réessayez.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || 'Le carnet est momentanément indisponible. Réessayez dans quelques instants.');
    error.status = response.status;
    throw error;
  }
  return response;
}

const postJSON = (path, data) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

function showError(element, message) {
  if (!element) return;
  element.textContent = message || '';
  element.hidden = !message;
}

function expired(error) {
  if (error.status === 401 && view !== 'login') {
    location.replace('/');
    return true;
  }
  if (error.status === 403 && isAdmin) {
    location.reload();
    return true;
  }
  return false;
}

function formSubmit(id, pending, onSubmit) {
  const form = document.getElementById(id);
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = find('button[type="submit"]', form);
    if (submit.disabled) return;
    const errorBox = find('.error', form);
    const content = [...submit.childNodes];
    showError(errorBox);
    submit.disabled = true;
    submit.textContent = pending;
    try {
      await onSubmit(form);
    } catch (error) {
      showError(errorBox, error.message);
    } finally {
      submit.disabled = false;
      submit.replaceChildren(...content);
    }
  });
}

function today() {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

async function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.open) return;
  if (id === 'add-expense') {
    if (!state.config) await updateOverview();
    if (!state.config || dialog.open) return;
    const date = find('#care-date');
    if (!date.value) date.value = today();
  }
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

document.querySelectorAll('.modal').forEach((dialog) => {
  dialog.addEventListener('close', () => {
    if (!find('dialog[open]')) document.body.classList.remove('dialog-open');
  });
  dialog.addEventListener('cancel', (event) => {
    if (find('button[type="submit"]:disabled', dialog)) event.preventDefault();
  });
});

document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-open]');
  if (opener) openDialog(opener.dataset.open);
  const closer = event.target.closest('[data-close]');
  if (closer) {
    const dialog = document.getElementById(closer.dataset.close);
    if (dialog && !find('button[type="submit"]:disabled', dialog)) dialog.close();
  }
  const exportMenu = find('.export-menu[open]');
  if (exportMenu && !exportMenu.contains(event.target)) exportMenu.open = false;
});

find('.password-toggle')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const input = find('#password');
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute('aria-label', visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  const [eye, hiddenEye] = button.children;
  eye.hidden = visible;
  hiddenEye.hidden = !visible;
});

formSubmit('login-form', 'Connexion…', async (form) => {
  const data = Object.fromEntries(new FormData(form));
  const { next } = await (await postJSON(view === 'locked' ? '/api/admin/session' : '/api/session', data)).json();
  form.reset();
  location.replace(next);
});

if (inviteToken) openDialog('invite');
formSubmit('invite-form', 'Activation…', async (form) => {
  if (!inviteToken) throw new Error('Ce lien d’invitation est introuvable.');
  const password = new FormData(form).get('password');
  const status = await (await postJSON('/api/session', { inviteToken, password })).json();
  form.reset();
  if (status.next) location.replace(status.next);
  else {
    find('#invite').close();
    notify('Mot de passe créé. Utilisez l’adresse e-mail qui a reçu l’invitation.');
  }
});

find('#logout')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await postJSON(`${prefix}/logout`, {});
    location.replace('/');
  } catch (error) {
    if (!expired(error)) notify(error.message);
  } finally {
    button.disabled = false;
  }
});

window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });

function addOptions(select, labels, preferred = '') {
  if (!select) return;
  const current = select.value || preferred;
  select.replaceChildren(select.options[0], ...labels.map((label) => new Option(label, label)));
  if (labels.includes(current)) select.value = current;
}

async function loadOverview() {
  const { config, overview } = await (await request(`${prefix}/bootstrap`)).json();
  state.config = config;
  find('#stat-month').textContent = euro.format(overview.month / 100);
  find('#stat-total').textContent = euro.format(overview.total / 100);
  find('#stat-count').textContent = overview.count.toLocaleString('fr-FR');
  addOptions(find('#filter-person'), [...new Set([...config.people, ...overview.people])]);
  addOptions(find('#person'), config.people, config.people.length === 1 ? config.people[0] : config.name);
  addOptions(find('#category'), config.categories);
}

function filters(includePage = false) {
  const query = new URLSearchParams();
  const term = find('#search').value.trim();
  const person = find('#filter-person').value;
  if (term) query.set('q', term);
  if (person) query.set('person', person);
  if (includePage) query.set('page', state.page);
  return query;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function rowIcon(kind) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  const path = document.createElementNS(namespace, 'path');
  const pathData = {
    receipt: 'M6 3h12a1 1 0 0 1 1 1v17l-3-2-4 2-4-2-3 2V4a1 1 0 0 1 1-1Zm3 5h6m-6 4h6m-6 4h2',
    trash: 'M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5',
  };
  for (const [key, value] of Object.entries({ width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
  path.setAttribute('d', pathData[kind]);
  svg.append(path);
  return svg;
}

function expenseRows(rows) {
  const table = node('table', 'table');
  const head = table.createTHead().insertRow();
  for (const label of ['Date des soins', 'Professionnel / établissement', 'Personne', 'Catégorie', 'Montant', 'Actions']) {
    const cell = node('th', label === 'Montant' ? 'money' : '', label);
    cell.scope = 'col';
    head.append(cell);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const line = body.insertRow();
    const date = node('time', '', frenchDate.format(new Date(`${row.careDate}T00:00:00Z`)));
    date.dateTime = row.careDate;
    const dateCell = node('td', 'td-date');
    dateCell.append(date);
    const provider = node('td', 'td-provider');
    provider.append(node('strong', 'provider', row.provider));
    if (row.note) provider.append(node('span', 'note', row.note));
    const person = node('td', 'td-person', row.person);
    const category = node('td', 'td-category');
    category.append(node('span', 'tag', row.category));
    const amount = node('td', 'money td-amount', euro.format(row.cents / 100));
    const actions = node('td', 'actions-cell');
    const actionList = node('div', 'row-actions');
    if (row.receipt) {
      const receipt = node('a', 'icon-button');
      receipt.href = `${prefix}/expenses/${row.id}/receipt`;
      receipt.target = '_blank';
      receipt.rel = 'noopener noreferrer';
      receipt.title = row.receipt;
      receipt.setAttribute('aria-label', `Ouvrir le justificatif : ${row.receipt} (nouvel onglet)`);
      receipt.append(rowIcon('receipt'));
      actionList.append(receipt);
    }
    if (row.canDelete) {
      const remove = node('button', 'icon-button danger');
      remove.type = 'button';
      remove.title = 'Supprimer la dépense';
      remove.setAttribute('aria-label', `Supprimer la dépense : ${row.provider}`);
      remove.append(rowIcon('trash'));
      remove.addEventListener('click', () => {
        state.toDelete = row.id;
        showError(find('#delete-form .error'));
        openDialog('delete-expense');
      });
      actionList.append(remove);
    }
    actions.append(actionList);
    line.append(dateCell, provider, person, category, amount, actions);
  }
  const frame = node('div', 'table-frame');
  frame.append(table);
  return frame;
}

let activeHistory;
let searchTimer;
async function loadHistory() {
  activeHistory?.abort();
  const controller = new AbortController();
  activeHistory = controller;
  const target = find('#history-body');
  const errorBox = find('#history-error');
  const filtered = Boolean(filters().toString());
  find('#clear-filters').hidden = !filtered;
  target.setAttribute('aria-busy', 'true');
  showError(errorBox);
  try {
    const data = await (await request(`${prefix}/expenses?${filters(true)}`, { signal: controller.signal })).json();
    if (controller.signal.aborted) return;
    Object.assign(state, { page: data.page, count: data.count, size: data.size });
    const pages = Math.max(1, Math.ceil(state.count / state.size));
    if (state.page > pages) {
      state.page = pages;
      return loadHistory();
    }
    find('#pagination').hidden = pages < 2;
    find('#previous').disabled = state.page <= 1;
    find('#next').disabled = state.page >= pages;
    find('#page-number').textContent = `Page ${state.page} sur ${pages}`;
    if (data.rows.length) target.replaceChildren(expenseRows(data.rows));
    else {
      const content = find('#empty-state').content.cloneNode(true);
      if (filtered) {
        find('h3', content).textContent = 'Aucun résultat';
        find('p', content).textContent = 'Essayez un autre mot-clé ou retirez les filtres.';
        find('[data-open]', content)?.remove();
      }
      target.replaceChildren(content);
    }
  } catch (error) {
    if (error.name === 'AbortError' || controller.signal.aborted || expired(error)) return;
    const retry = node('button', 'button secondary', 'Réessayer');
    retry.addEventListener('click', loadHistory);
    target.replaceChildren(retry);
    find('#pagination').hidden = true;
    showError(errorBox, error.message);
  } finally {
    if (!controller.signal.aborted) target.setAttribute('aria-busy', 'false');
  }
}

function updateOverview() {
  return loadOverview().catch((error) => { if (!expired(error)) notify(error.message); });
}

function resetFilters() {
  clearTimeout(searchTimer);
  find('#search').value = '';
  find('#filter-person').value = '';
  state.page = 1;
  return loadHistory();
}

const suggestedFields = ['#amount', '#care-date', '#provider', '#category', '#note'];
const analyzeContent = [...(find('#analyze')?.childNodes ?? [])];

function analysisMessage(message = '', tone = '') {
  const status = find('#analysis-status');
  status.textContent = message;
  status.className = `analysis-status ${tone}`.trim();
  status.hidden = !message;
}

function stopAnalysis() {
  state.analysis?.abort();
  state.analysis = null;
  const button = find('#analyze');
  button.disabled = false;
  button.removeAttribute('aria-busy');
  button.replaceChildren(...analyzeContent);
  analysisMessage();
}

function clearSuggestions() {
  for (const selector of suggestedFields) {
    const field = find(selector);
    field.classList.remove('suggested');
    delete field.dataset.edited;
  }
}

function suggest(selector, value) {
  const field = find(selector);
  if (!value) return 'missing';
  if (field.dataset.edited && field.value.trim()) return field.value.trim() === value ? 'same' : 'kept';
  if (field.tagName === 'SELECT' && ![...field.options].some((option) => option.value === value)) return 'missing';
  field.value = value;
  field.classList.add('suggested');
  return 'filled';
}

const enumerate = (items) => items.length > 1 ? `${items.slice(0, -1).join(', ')} et ${items.at(-1)}` : items[0];

function applySuggestion(suggestion) {
  if (!suggestion?.readable) {
    analysisMessage('Aucune dépense lisible n’a été trouvée sur cette photo. Complétez le formulaire manuellement.', 'warning');
    return;
  }
  const amount = suggestion.cents ? (suggestion.cents / 100).toFixed(2).replace('.', ',') : null;
  const results = [
    ['le montant', suggest('#amount', amount)],
    ['la date', suggest('#care-date', suggestion.careDate)],
    ['le professionnel', suggest('#provider', suggestion.provider)],
    ['la catégorie', suggest('#category', suggestion.category)],
    ['le libellé', suggest('#note', suggestion.label)],
  ];
  const filled = results.filter(([, result]) => result === 'filled').map(([label]) => label);
  const kept = results.filter(([, result]) => result === 'kept').map(([label]) => label);
  if (!filled.length && !kept.length) {
    analysisMessage(results.some(([, result]) => result === 'same') ? 'Les informations de la photo correspondent à votre saisie.' : 'Aucune information exploitable n’a été trouvée sur cette photo. Complétez le formulaire manuellement.', results.some(([, result]) => result === 'same') ? 'success' : 'warning');
    return;
  }
  const parts = [];
  if (filled.length) parts.push(`Complété à partir de la photo : ${enumerate(filled)}. Vérifiez ces valeurs avant d’enregistrer.`);
  if (kept.length) parts.push(`Vos saisies pour ${enumerate(kept)} ont été conservées.`);
  if (kept.includes('le montant')) parts.push(`Montant lu sur la photo : ${euro.format(suggestion.cents / 100)}.`);
  if (!amount) parts.push('Le montant n’a pas pu être lu : saisissez-le manuellement.');
  analysisMessage(parts.join(' '), amount ? 'success' : 'warning');
  if (filled.length && !kept.length && amount) find('#amount').focus();
}

async function analyzePhoto() {
  const file = state.file;
  const button = find('#analyze');
  if (!file || state.analysis) return;
  const controller = new AbortController();
  state.analysis = controller;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.textContent = 'Analyse…';
  analysisMessage('Lecture de la photo en cours. Cela peut prendre quelques secondes.');
  try {
    const data = new FormData();
    data.set('receipt', file);
    const response = await request('/api/receipts/analyze', { method: 'POST', body: data, signal: controller.signal });
    const line = (await response.text()).split('\n').filter((entry) => entry.trim()).at(-1);
    let result = null;
    try {
      result = JSON.parse(line);
    } catch {}
    if (controller.signal.aborted || state.file !== file) return;
    if (!result?.suggestion) throw new Error(result?.error || 'L’analyse automatique est momentanément indisponible. Saisissez les informations manuellement.');
    analysisMessage();
    applySuggestion(result.suggestion);
  } catch (error) {
    if (error.name === 'AbortError' || controller.signal.aborted || expired(error)) return;
    analysisMessage(error.message, 'warning');
  } finally {
    if (state.analysis === controller) {
      state.analysis = null;
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.replaceChildren(...analyzeContent);
    }
  }
}

function removeFile() {
  stopAnalysis();
  state.file = null;
  find('#camera').value = '';
  find('#file').value = '';
  find('#file-status').hidden = true;
  find('#file-name').textContent = '';
}

if (hasDashboard) {
  updateOverview();
  loadHistory();
  find('#search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    state.page = 1;
    searchTimer = setTimeout(loadHistory, 220);
  });
  find('#filter-person').addEventListener('change', () => {
    clearTimeout(searchTimer);
    state.page = 1;
    loadHistory();
  });
  find('#clear-filters').addEventListener('click', resetFilters);
  find('#previous').addEventListener('click', () => { state.page -= 1; loadHistory(); });
  find('#next').addEventListener('click', () => { state.page += 1; loadHistory(); });
  document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', async () => {
    const format = button.dataset.format;
    find('.export-menu').open = false;
    button.disabled = true;
    try {
      const response = await request(`${prefix}/exports/${format}?${filters()}`);
      const href = URL.createObjectURL(await response.blob());
      const anchor = node('a');
      anchor.href = href;
      anchor.download = `sante-famille.${format}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      notify('Export prêt à télécharger.');
    } catch (error) {
      if (!expired(error)) notify(error.message);
    } finally {
      button.disabled = false;
    }
  }));
}

if (view === 'family') {
  for (const id of ['camera', 'file']) {
    document.getElementById(id).addEventListener('change', (event) => {
      const picked = event.currentTarget.files[0];
      const error = find('#expense-form .error');
      showError(error);
      if (!picked) return;
      if (!picked.size || picked.size > 8 * 1024 * 1024 || !/\.(?:jpe?g|png|webp|heic|heif)$/i.test(picked.name)) {
        removeFile();
        showError(error, 'Choisissez une photo JPG, PNG, WebP ou HEIC de 8 Mo maximum.');
        return;
      }
      stopAnalysis();
      state.file = picked;
      document.getElementById(id === 'camera' ? 'file' : 'camera').value = '';
      find('#file-name').textContent = picked.name;
      find('#file-status').hidden = false;
    });
  }
  find('#remove-file').addEventListener('click', removeFile);
  find('#analyze').addEventListener('click', analyzePhoto);
  for (const type of ['input', 'change']) {
    find('#expense-form').addEventListener(type, (event) => {
      if (!event.isTrusted || !suggestedFields.some((selector) => event.target.matches(selector))) return;
      event.target.dataset.edited = '1';
      event.target.classList.remove('suggested');
    });
  }
  formSubmit('expense-form', 'Enregistrement…', async (form) => {
    const data = new FormData(form);
    if (state.file) data.set('receipt', state.file);
    try {
      await request('/api/expenses', { method: 'POST', body: data });
    } catch (error) {
      if (expired(error)) return;
      throw error;
    }
    form.reset();
    removeFile();
    clearSuggestions();
    find('#add-expense').close();
    notify('Dépense enregistrée.');
    await Promise.all([resetFilters(), updateOverview()]);
  });
  formSubmit('delete-form', 'Suppression…', async () => {
    if (!state.toDelete) return;
    try {
      await request(`/api/expenses/${state.toDelete}`, { method: 'DELETE' });
    } catch (error) {
      if (expired(error)) return;
      throw error;
    }
    state.toDelete = null;
    find('#delete-expense').close();
    notify('Dépense supprimée.');
    await Promise.all([loadHistory(), updateOverview()]);
  });
}
