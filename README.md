# Santé Famille V2.3

Carnet familial privé en français pour saisir les frais de santé, joindre des photos, retrouver l’historique et exporter les dépenses. Le tableau de bord affiche le total du mois (selon la date des soins, dans le fuseau Europe/Paris), le total cumulé et le nombre de dépenses. L’administration dispose d’un historique en lecture seule.

Cette édition est adaptée à Netlify : Netlify Server exécute le backend sous Node.js 24, Drizzle et Netlify Database enregistrent les dépenses, Netlify Blobs stocke les justificatifs privés et Netlify Identity gère les comptes. Le frontend utilise HTML, CSS et JavaScript sans framework. Cette édition ne stocke pas les données sur un Raspberry Pi.

## Avant la première utilisation

Open Manage and search for 'Identity'. Le projet doit être configuré sur invitation uniquement. Les comptes qui accèdent au carnet doivent être invités avec le rôle `famille`. Après une connexion familiale, déverrouillez `/admin-locations.html` en saisissant les identifiants d’un compte ayant le rôle `admin`. Vous pouvez attribuer les deux rôles `famille` et `admin` au même compte dans Netlify Identity et réutiliser ses identifiants, ou utiliser un compte administrateur séparé. Les changements de rôle prennent effet à la prochaine connexion ou au renouvellement du jeton. Les rôles ne sont pas choisis par les utilisateurs.

La page de connexion et le service Identity du site de production doivent être joignables sans connexion à un compte d’équipe Netlify. Si Netlify intercepte ces requêtes avec sa propre page de connexion, l’invitation ne peut pas être vérifiée. La protection Netlify peut rester limitée aux aperçus ; en production, les dossiers restent protégés par la session et les rôles Identity.

Les paramètres suivants sont facultatifs et lus côté serveur. Les valeurs sont des listes séparées par des virgules, sans virgule dans un nom.

| Variable | Utilisation | Sans configuration |
| --- | --- | --- |
| `FAMILY_MEMBERS` | Personnes proposées lors de la saisie | Nom du compte connecté |
| `EXPENSE_CATEGORIES` | Catégories proposées lors de la saisie | Catégories de santé usuelles |

Les comptes autorisés voient l’historique commun. Seul le compte qui a saisi une dépense peut la supprimer. Les photos JPG/JPEG, PNG, WebP et HEIC/HEIF sont limitées à 8 Mio et 26 mégapixels, puis converties en WebP sans métadonnées avec un côté long de 2 400 px au maximum. Les exports CSV, XLSX et JSON suivent la recherche et le filtre en cours. Ils contiennent le nom des justificatifs, pas les photos elles-mêmes ; ils ne constituent pas une sauvegarde complète.

## Lecture automatique des justificatifs

Après avoir joint une photo dans « Nouvelle dépense », le bouton « Analyser la photo » propose le montant total payé, la date des soins, le professionnel ou l’établissement, la catégorie et un libellé court (placé dans le commentaire). L’analyse est faite côté serveur par Claude (Anthropic) au moyen de Netlify AI Gateway, sans clé à configurer ; la consommation est décomptée des crédits Netlify du compte. Seuls les champs vides ou pas encore modifiés à la main sont remplis, et les valeurs proposées sont mises en évidence pour être vérifiées avant l’enregistrement. Rien n’est enregistré tant que la dépense n’est pas validée. Chaque compte est limité à 20 analyses par quart d’heure.

## Développement local

Avec Node.js 24 et une version à jour de la CLI Netlify, dans le répertoire d’un projet lié à Netlify :

```sh
npm ci
netlify dev --port 8889
```

Ouvrez `localhost:8889` pour travailler sur l’interface. Pour vérifier les invitations, les cookies de session et le parcours complet, utilisez un déploiement HTTPS. N’utilisez que des dépenses fictives pendant la recette. La migration livrée est appliquée par Netlify au déploiement ; ne l’appliquez pas manuellement.

## Recette avant de saisir de vraies données

1. Vérifier l’invitation, la connexion et la déconnexion de deux comptes famille, puis vérifier qu’un compte avec les rôles `famille` et `admin` peut déverrouiller l’administration avec ses propres identifiants. Vérifier qu’un compte `famille` seul est refusé et qu’un compte `admin` distinct peut toujours déverrouiller l’administration.
2. Sur Safari iOS, prendre une photo, sélectionner un HEIC, enregistrer une dépense, rouvrir le justificatif et vérifier qu’un fichier invalide est refusé.
3. Analyser une facture fictive et un ticket de pharmacie fictif, vérifier les valeurs proposées, puis vérifier qu’une saisie manuelle préalable n’est pas remplacée.
4. Vérifier les trois indicateurs, les filtres, les trois exports et la suppression de sa propre dépense. Vérifier que l’autre compte ne peut pas la supprimer et qu’un justificatif ne s’ouvre pas sans session.
