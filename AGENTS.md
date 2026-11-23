# Santé Famille

## Architecture

- `netlify/server/index.mjs` route les pages et les API avec le handler Fetch de Netlify Server. `views.mjs` génère les pages françaises. Ne placez pas d’`index.html` statique dans `public/`, car il masquerait l’entrée vérifiée par le serveur.
- `netlify/server/auth.mjs` vérifie les rôles Netlify Identity, applique une limitation persistante des tentatives et lie la session administrateur à la session familiale. La couche HTTP utilise le contrôle d’origine de `@netlify/identity` et l’API Identity pour ne pas exposer les jetons à JavaScript ; seuls les condensats des cookies sont enregistrés dans la base.
- `db/schema.ts` contient le schéma Drizzle. Générer une migration dans `netlify/database/migrations/` à chaque changement de schéma. Netlify applique les migrations au déploiement. Utiliser la variante de Drizzle équipée de l’adaptateur `drizzle-orm/netlify-db`.
- `netlify/server/expenses.mjs` gère les dépenses, les indicateurs et les exports ; `receipts.mjs` valide, réencode et stocke les photos privées dans Netlify Blobs. Le périmètre du déploiement est présent dans les requêtes et les clés des justificatifs pour éviter de mélanger les données d’aperçu et de production.
- `netlify/server/analysis.mjs` lit une photo de justificatif avec Claude via Netlify AI Gateway (SDK Anthropic sans clé ni URL explicites) et renvoie des suggestions validées côté serveur ; la réponse est diffusée en flux pour respecter le délai d’envoi des en-têtes. Aucune donnée n’est enregistrée par l’analyse.
- `public/` contient uniquement les ressources publiques. `app.js` utilise les API de même origine et insère les données utilisateur avec les propriétés et méthodes sûres du DOM. `style.css` utilise les polices locales avec leurs licences.

## Conventions

- Garder le code serveur en modules ESM, les montants en centimes entiers, les dates de soins en dates calendaires ISO, et le rendu en français.
- Les justificatifs et les exports sont privés, sans cache. Les opérations d’écriture vérifient la session et l’origine côté serveur. La page d’administration ne donne aucun droit de modification. La suppression est limitée au compte ayant créé la dépense.
- Les personnes et les catégories sont configurables côté serveur ; les valeurs historiques ne sont pas réécrites lorsqu’un paramètre change. Ne commiter ni identifiants de connexion, ni justificatifs, ni données réelles.
