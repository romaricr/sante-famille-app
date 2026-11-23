const siteName = 'Santé Famille';
const siteDescription = 'Le carnet privé pour noter les dépenses de santé de votre famille, ranger les justificatifs et retrouver votre historique.';

const shapes = {
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  eyeOff: '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.2 6.5C10.1 6.2 11 6 12 6c6.4 0 10 6 10 6a13 13 0 0 1-3 3.3M6.1 7.9A16 16 0 0 0 2 12s3.6 6 10 6c1.1 0 2.1-.2 3.1-.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18m-13 5h2m4 0h2"/>',
  receipt: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-4 2-4-2-3 2V4a1 1 0 0 1 1-1Zm3 5h6m-6 4h6m-6 4h2"/>',
  shield: '<path d="M12 22s7-3.2 7-9.1V5l-7-3-7 3v7.9C5 18.8 12 22 12 22Z"/><path d="m9 12 2 2 4-4"/>',
  family: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M17 4a3 3 0 0 1 0 6m5 10v-2a4 4 0 0 0-3-3.9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4 4"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  logout: '<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m5-4 4-4-4-4m-8 4h12"/>',
  wallet: '<path d="M4 7V6a3 3 0 0 1 3-3h11v4M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm16 5h-5a2 2 0 0 0 0 4h5"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3h.01"/>',
  menu: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};

export const icon = (name, className = '') => `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;

const wordmark = '<a class="brand" href="/" aria-label="Santé Famille, accueil"><img src="/mark.svg" alt="" width="38" height="38"><span>Santé<span class="brand-accent">Famille</span><small>Le carnet familial</small></span></a>';
const privacy = `<dialog id="privacy" class="modal compact" aria-labelledby="privacy-title"><div class="modal-inner"><button class="icon-button modal-close" data-close="privacy" aria-label="Fermer">${icon('close')}</button><span class="feature-icon">${icon('shield')}</span><h2 id="privacy-title">Un carnet privé</h2><p>Seuls les comptes familiaux invités et les administrateurs autorisés peuvent consulter les dépenses et les justificatifs. Les photos sont conservées sans leurs métadonnées, dans un espace privé sur Netlify.</p><p>Le bouton « Analyser la photo » transmet l’image à un modèle d’IA (Claude, d’Anthropic) par l’intermédiaire de Netlify, uniquement pour lire le montant, la date et le libellé. Rien n’est enregistré dans le carnet tant que vous ne validez pas la dépense.</p><p>Les exports contiennent les informations de santé saisies. Conservez-les dans un endroit sûr.</p><button class="button primary" data-close="privacy">Compris</button></div></dialog>`;
const invitation = `<dialog id="invite" class="modal compact" aria-labelledby="invite-title"><div class="modal-inner"><span class="feature-icon">${icon('lock')}</span><h2 id="invite-title">Accepter l’invitation</h2><p>Créez le mot de passe de votre compte avec au moins 12 caractères.</p><form id="invite-form" class="auth-form" method="post"><label for="invite-password">Nouveau mot de passe</label><input id="invite-password" name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="256"><p class="error" role="alert" hidden></p><button class="button primary" type="submit">Activer mon compte ${icon('arrow')}</button><button class="quiet" type="button" data-close="invite">Annuler</button></form></div></dialog>`;

function loginPanel(admin) {
  return `<main id="main" class="welcome">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><span class="eyebrow light"><span></span> VOTRE CARNET DE SANTÉ FAMILIAL</span>
      <h1 id="hero-title">Prenez soin<br>des <em>vôtres.</em></h1>
      <p>Gardez les dépenses de santé et les justificatifs de toute la famille au même endroit, en toute simplicité.</p></div>
      <div class="hero-art" aria-hidden="true">
        <svg class="orbit" viewBox="0 0 575 275" fill="none"><g stroke="currentColor"><ellipse cx="302" cy="168" rx="267" ry="75" transform="rotate(-19 302 168)"/><ellipse cx="302" cy="168" rx="295" ry="102" transform="rotate(-19 302 168)"/><ellipse cx="302" cy="168" rx="326" ry="128" transform="rotate(-19 302 168)"/></g><circle cx="85" cy="180" r="4" fill="currentColor"/><circle cx="497" cy="84" r="6" fill="currentColor"/><path d="M124 83v23m-11-11h22m368 91v29m-14-14h28" stroke="currentColor"/></svg>
        <div class="mini paper-back"><span class="mini-symbol">${icon('receipt')}</span><span class="mini-lines"><i></i><i></i><i></i></span></div>
        <div class="mini paper-front"><div class="mini-top"><span class="mini-symbol">${icon('wallet')}</span><span class="mini-label">APERÇU DU CARNET</span><span class="mini-dot"></span></div><div class="mini-caption">Dépenses du mois</div><div class="mini-bottom"><span>124,50 <small>€</small></span><div class="mini-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>
        <span class="seal">${icon('check')}</span>
      </div>
      <ul class="hero-notes"><li>${icon('receipt')} Vos justificatifs</li><li>${icon('family')} Toute la famille</li><li>${icon('calendar')} Un historique clair</li></ul>
    </section>
    <section class="login-panel" aria-labelledby="login-title"><div class="login-content">
      ${admin ? `<a class="quiet back" href="/">${icon('back')} Retour au carnet</a>` : ''}
      <div class="welcome-icon">${icon(admin ? 'shield' : 'lock')}</div>
      <span class="eyebrow">${admin ? 'ACCÈS ADMINISTRATEUR' : 'ESPACE FAMILLE'}</span>
      <h2 id="login-title">${admin ? 'Administration' : 'Bienvenue !'}</h2>
      <p class="login-description">${admin ? 'Connectez-vous avec votre compte administrateur distinct pour consulter l’historique.' : 'Connectez-vous pour retrouver le carnet de santé de votre famille.'}</p>
      <form id="login-form" class="auth-form" method="post">
        <div class="field"><label for="email">Adresse e-mail</label><input id="email" name="email" type="email" autocomplete="username" autocapitalize="none" placeholder="vous@exemple.fr" maxlength="254" required></div>
        <div class="field"><label for="password">Mot de passe</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Votre mot de passe" required maxlength="256"><button type="button" class="icon-button password-toggle" aria-label="Afficher le mot de passe" aria-pressed="false"><span>${icon('eye')}</span><span hidden>${icon('eyeOff')}</span></button></div></div>
        <p class="error" role="alert" hidden></p><button type="submit" class="button primary login-submit">${admin ? 'Déverrouiller' : 'Se connecter'} ${icon('arrow')}</button>
      </form>
      <p class="login-help">${icon('shield')} ${admin ? 'Votre session familiale reste active.' : 'Réservé aux membres de la famille invités.'}</p>
    </div></section></main>`;
}

const stat = (symbol, label, id, subtitle) => `<article class="stat"><div class="stat-heading"><span class="feature-icon">${icon(symbol)}</span><span>${label}</span></div><strong id="${id}">—</strong><small>${subtitle}</small></article>`;

function dashboard(admin) {
  return `<main id="main" class="dashboard"><div class="dashboard-intro"><div><span class="eyebrow"><span></span> ${admin ? 'ADMINISTRATION' : 'VOTRE CARNET FAMILIAL'}</span><h1>${admin ? 'Historique familial' : 'Votre carnet de santé.'}</h1><p>${admin ? 'Consultez et exportez les dépenses de toute la famille.' : 'Retrouvez les dépenses et les justificatifs de votre famille en un coup d’œil.'}</p></div>${admin ? '' : `<button class="button primary" data-open="add-expense">${icon('plus')} Nouvelle dépense</button>`}</div>
  <section class="stats" aria-label="Indicateurs pour toute la famille">${stat('calendar', 'Ce mois-ci', 'stat-month', 'D’après la date des soins')}${stat('wallet', 'Total cumulé', 'stat-total', 'Toutes les dépenses')}${stat('receipt', 'Dépenses enregistrées', 'stat-count', 'Depuis le début')}</section>
  <section class="history" aria-labelledby="history-title"><div class="history-heading"><div><span class="eyebrow">JOURNAL FAMILIAL</span><h2 id="history-title">Historique des dépenses</h2></div><details class="export-menu"><summary class="button secondary">${icon('download')} Exporter ${icon('down')}</summary><div class="export-options"><small>Les filtres sont appliqués</small><button type="button" data-format="csv">CSV <span>.csv</span></button><button type="button" data-format="xlsx">Classeur Excel <span>.xlsx</span></button><button type="button" data-format="json">Données JSON <span>.json</span></button></div></details></div>
  <div class="filters"><div class="search-field">${icon('search')}<input type="search" id="search" aria-label="Rechercher dans les dépenses" placeholder="Rechercher une dépense…" maxlength="140"></div><select id="filter-person" aria-label="Filtrer par personne"><option value="">Toute la famille</option></select><button type="button" class="quiet" id="clear-filters" hidden>Effacer les filtres</button></div>
  <p id="history-error" class="error" role="alert" hidden></p><div id="history-body" aria-busy="true"><div class="skeleton"><i></i><i></i><i></i></div></div><div id="pagination" class="pagination" hidden><button class="button secondary" id="previous" type="button" aria-label="Page précédente">${icon('back')}</button><span id="page-number"></span><button class="button secondary" id="next" type="button" aria-label="Page suivante">${icon('arrow')}</button></div></section>
  <template id="empty-state"><div class="empty"><span class="feature-icon">${icon('receipt')}</span><h3>Aucune dépense enregistrée</h3><p>Les dépenses de votre famille apparaîtront ici.</p>${admin ? '' : `<button class="button secondary" type="button" data-open="add-expense">${icon('plus')} Ajouter une dépense</button>`}</div></template>
  ${admin ? '' : expenseDialog()}</main>`;
}

function expenseDialog() {
  return `<dialog id="add-expense" class="modal" aria-labelledby="expense-title"><div class="modal-inner"><button class="icon-button modal-close" data-close="add-expense" aria-label="Fermer">${icon('close')}</button><span class="feature-icon">${icon('plus')}</span><h2 id="expense-title">Nouvelle dépense</h2><p>Ajoutez des frais de santé au carnet familial.</p><form id="expense-form" method="post"><div class="form-grid"><div class="field"><label for="person">Personne</label><select id="person" name="person" required><option value="">Choisir</option></select></div><div class="field"><label for="care-date">Date des soins</label><input id="care-date" name="careDate" type="date" required min="1900-01-01" max="2100-12-31"></div><div class="field"><label for="category">Catégorie</label><select id="category" name="category" required><option value="">Choisir</option></select></div><div class="field"><label for="amount">Montant en euros</label><div class="amount-field"><input id="amount" name="amount" inputmode="decimal" placeholder="0,00" maxlength="10" required><span>€</span></div></div><div class="field wide"><label for="provider">Professionnel ou établissement</label><input id="provider" name="provider" placeholder="Ex. : Pharmacie du Centre" maxlength="140" required></div><div class="field wide"><label for="note">Commentaire <small>facultatif</small></label><textarea id="note" name="note" rows="2" maxlength="1500" placeholder="Précisions utiles…"></textarea></div></div>
    <fieldset class="receipt-field"><legend>Justificatif <small>facultatif</small></legend><div class="upload-note"><span class="feature-icon">${icon('receipt')}</span><div><strong>Joindre une photo</strong><small>JPG, PNG, WebP ou HEIC · 8 Mo maximum · le montant peut être lu sur la photo</small></div></div><div class="receipt-actions"><label class="button secondary file-button">${icon('camera')} Prendre une photo<input id="camera" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" capture="environment" aria-label="Prendre une photo"></label><label class="button secondary file-button">${icon('upload')} Choisir un fichier<input id="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" aria-label="Choisir un fichier"></label></div><div id="file-status" class="file-status" hidden><span id="file-name"></span><span class="file-tools"><button type="button" class="button secondary analyze" id="analyze">${icon('sparkle')} Analyser la photo</button><button type="button" class="quiet" id="remove-file">Retirer</button></span></div><p id="analysis-status" class="analysis-status" role="status" hidden></p></fieldset><p class="error" role="alert" hidden></p><div class="modal-actions"><button class="button secondary" data-close="add-expense" type="button">Annuler</button><button class="button primary" type="submit">Enregistrer la dépense ${icon('check')}</button></div></form></div></dialog>
    <dialog id="delete-expense" class="modal compact" aria-labelledby="delete-title"><div class="modal-inner"><span class="feature-icon danger">${icon('trash')}</span><h2 id="delete-title">Supprimer cette dépense ?</h2><p>La dépense et son justificatif seront supprimés. Cette action est définitive.</p><form id="delete-form" method="post"><p class="error" role="alert" hidden></p><div class="modal-actions"><button class="button secondary" type="button" data-close="delete-expense">Annuler</button><button class="button destructive" type="submit">Supprimer</button></div></form></div></dialog>`;
}

export function render(view) {
  const admin = view === 'admin' || view === 'locked';
  const signedIn = view !== 'login';
  const isDashboard = view === 'family' || view === 'admin';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f7f7ef"><meta name="description" content="${siteDescription}"><meta property="og:type" content="website"><meta property="og:site_name" content="${siteName}"><meta property="og:title" content="${siteName}"><meta property="og:description" content="${siteDescription}"><title>${admin ? 'Administration · ' : ''}${siteName}</title><link rel="icon" type="image/svg+xml" href="/mark.svg"><link rel="stylesheet" href="/style.css"><script src="/app.js" type="module"></script></head>
  <body data-view="${view}"><a class="skip-link" href="#main">Aller au contenu</a><header class="site-header"><div class="shell header-inner">${wordmark}<nav aria-label="Session" class="header-actions">${signedIn ? `${admin ? '<a class="quiet nav-link" href="/">Carnet familial</a>' : `<a class="quiet nav-link" href="/admin-locations.html">${icon('shield')} <span>Administration</span></a>`}<button class="button secondary logout" type="button" id="logout" aria-label="${view === 'admin' ? 'Quitter l’administration' : 'Se déconnecter'}">${icon('logout')} <span>${view === 'admin' ? 'Quitter l’admin' : 'Déconnexion'}</span></button>` : `<span class="private-badge">${icon('lock')} Espace privé</span>`}</nav></div></header>
  <div class="shell content">${isDashboard ? dashboard(admin) : loginPanel(admin)}<noscript><p class="error">Activez JavaScript pour vous connecter et gérer vos dépenses.</p></noscript></div>
  <footer class="shell footer"><span><span class="footer-dot"></span> Santé Famille <span class="version">V2.3</span></span><button class="quiet" data-open="privacy">${icon('shield')} Confidentialité</button></footer><div id="toast" role="status" class="toast" hidden></div>${privacy}${invitation}</body></html>`;
}
