# Guide du site Pantin Beach Tour

Ce fichier explique comment fonctionne le site, du début à la fin, en français simple — pas besoin de savoir coder pour le comprendre. L'idée : si tu rouvres ce projet dans 2 ans et que tu as tout oublié, ce fichier te remet dans le bain.

---

## 1. C'est quoi, ce site ?

Un site pour organiser un tournoi de beach volley à Pantin, en deux catégories indépendantes (**Hommes** et **Femmes**). Il gère tout le cycle du tournoi :

1. Inscription des équipes
2. Classement des têtes de série (par glisser-déposer)
3. Génération automatique des poules
4. Génération automatique des matchs de poule
5. Saisie des scores
6. Génération automatique du tableau à élimination directe (barrages → quarts → demies → petite finale + finale)
7. Un podium à la fin

Le site a une partie **publique** (que n'importe quel visiteur peut consulter, sans se connecter) et une partie **admin** (protégée par un compte, pour gérer le tournoi).

---

## 2. Les briques du site (vue simple)

Pas de jargon inutile, juste les 3 briques à connaître :

- **Le site lui-même** : des pages web (HTML/CSS/JavaScript) qui s'affichent dans le navigateur. Pas de logiciel à installer, juste un navigateur.
- **La base de données (Supabase)** : un service en ligne qui stocke toutes les données (équipes, poules, matchs, scores, comptes). Le site va chercher/écrire les informations là-dedans à chaque action. Tu peux voir et modifier ces données directement depuis [supabase.com](https://supabase.com), dans le tableau de bord de ton projet, onglet **Table Editor** (pour voir les données) ou **SQL Editor** (pour lancer des requêtes).
- **GitHub** : là où le code du site est sauvegardé (comme une sauvegarde + un historique de toutes les versions). Le dépôt s'appelle `PantinBeachTour`, sous le compte `GC-code-lab`. C'est aussi GitHub qui héberge le site en ligne (via **GitHub Pages**) : dès que tu envoies (`git push`) une modification, le site public se met à jour tout seul en quelques minutes, à cette adresse : **https://gc-code-lab.github.io/PantinBeachTour/**

---

## 3. Les pages du site

### Partie publique (pas besoin de compte)

| Page | Fichier | Ce qu'on y voit |
|---|---|---|
| **Poules** (page d'accueil) | `index.html` | Les 4 poules (A/B/C/D) par catégorie, les équipes de chaque poule, et les matchs/scores de poule (repliés par défaut, dépliables) |
| **Phases finales** | `phases-finales.html` | Le tableau à élimination directe en dessin (barrages → quarts → demies → finale + petite finale), avec un podium en dessous une fois le tournoi terminé |

Ces deux pages ont un sélecteur **Hommes / Femmes** en haut, pour basculer entre les deux catégories.

**Avant même que les poules soient terminées**, le tableau des phases finales affiche déjà les croisements connus à l'avance (ex: "2e Poule C" contre "3e Poule B" pour un barrage, "1er Poule A" pour un quart) — ces croisements sont fixés par le format du tournoi, indépendamment des résultats. Le reste (ex: "vainqueur du quart 1") s'affiche juste comme "TBD" tant que ce n'est pas joué, pour ne pas surcharger l'affichage avec une évidence.

Le site est pensé pour être consulté sur téléphone. Seule exception : le tableau des phases finales est volontairement large et pixel-exact (pour bien tracer les lignes de connexion) — sur un petit écran, il faut le faire défiler horizontalement avec le doigt pour tout voir, il commence toujours affiché depuis la gauche (les barrages).

### Partie admin (compte requis)

| Page | Fichier | Rôle |
|---|---|---|
| **Connexion** | `admin.html` | Se connecter, ou créer un nouveau compte (voir section 5) |
| **Gestion du tournoi** | `gestion.html` | Tout le pilotage du tournoi, organisé en 4 onglets (voir section 4) |

---

## 4. Les 4 onglets de "Gestion du tournoi"

### Onglet "Connexion"
Affiche ton compte connecté, un bouton pour te déconnecter, et (si tu es admin) deux sections :
- **"Comptes"** : la liste de tous les comptes créés, avec leur rôle actuel et les boutons pour le changer (voir section 5).
- **"Codes d'inscription automatique"** : deux codes (un pour Admin, un pour Scorer) que tu définis et modifies quand tu veux — voir section 5.

### Onglet "Inscription des équipes"
Le formulaire pour inscrire une équipe : Nom/Prénom des deux joueurs (mis en forme automatiquement — Nom en MAJUSCULES, Prénom avec Majuscule initiale), et la catégorie (Hommes/Femmes). En dessous, la liste des équipes déjà inscrites, avec une case à cocher pour en supprimer plusieurs d'un coup.

⚠️ Le nom d'équipe (ex: "DUPONT/MARTIN") est calculé automatiquement à partir des noms de famille des deux joueurs — pas besoin de le taper.

### Onglet "Têtes de série & Poules"
1. Une liste des équipes de la catégorie sélectionnée, que tu classes en les faisant **glisser** (la position 1 = tête de série n°1), ou avec les boutons **▲/▼** à côté de chaque équipe (plus pratique sur téléphone, où le glisser-déposer ne fonctionne pas toujours). Ce classement est sauvegardé automatiquement à chaque changement. Tu peux réordonner à tout moment, même après avoir déjà généré les poules — reclique juste sur "Générer 4 poules" ensuite pour les recalculer avec le nouvel ordre (⚠️ ça réinitialise les matchs et scores déjà saisis pour cette catégorie).
2. Un bouton **"Générer 4 poules de 3"** (pour 12 équipes) ou **"Générer 4 poules de 4"** (pour 16 équipes) — apparaît seulement si le nombre d'équipes correspond. Ce bouton fait tout d'un coup : il crée les 4 poules et répartit les équipes dedans en **méthode serpentin** (voir section 7), puis génère aussi les matchs de chaque poule.

### Onglet "Matchs & Résultats"
1. **Matchs de poule** : les matchs de chaque poule, repliés (clique pour dérouler). Pour chaque match, tu tapes le score et cliques "Enregistrer".
2. **Phases finales** : un bouton pour générer le tableau final (barrages, quarts, demies, petite finale, finale) — n'apparaît que quand tous les matchs de poule ont un score. Ensuite, mêmes rangées de saisie de score que pour les poules.

**Important** : dès qu'un score fait gagner un match du tableau final, l'équipe gagnante (et pour les demies, la perdante aussi) est **automatiquement placée** dans le match suivant — pas besoin de le faire à la main.

---

## 5. Les comptes et les droits (qui peut faire quoi)

Il y a 3 niveaux :

1. **Visiteur** (personne connectée sans rôle, ou pas connectée du tout) : peut seulement **regarder** les pages publiques (Poules, Phases finales). Ne peut rien modifier. Un compte créé mais sans rôle voit exactement la même chose qu'un simple visiteur (juste l'onglet "Connexion" en plus, avec son email et un bouton pour se déconnecter).
2. **Scorer** : en plus, peut **saisir les scores** des matchs (onglet "Matchs & Résultats" uniquement). Ne voit pas les onglets "Inscription" ni "Têtes de série & Poules".
3. **Admin** : accès à tout — inscriptions, poules, scores, et peut gérer les rôles des autres comptes.

### La liste "Comptes" (onglet Connexion)

Tous les comptes créés apparaissent dans une seule liste, avec leur rôle actuel affiché directement ("Aucun rôle", "Scorer", ou "Admin") :

- Pour un compte **sans rôle** ou **Scorer** : deux boutons "Scorer" / "Admin" à côté de son email. Clique sur l'un pour le lui attribuer.
- Pour **retirer un rôle** à quelqu'un (le repasser à "sans rôle") : reclique sur le bouton de son rôle actuel (déjà en surbrillance) — un clic dessus l'enlève.
- Pour un compte déjà **Admin** : plus de bouton, juste un badge "Admin" fixe. **Un admin ne peut pas rétrograder un autre admin** — c'est une protection volontaire (voir plus bas), pour éviter qu'un admin en dégrade un autre par erreur ou par malveillance.

### Comment ajouter quelqu'un (scorer ou admin)

1. La personne va sur `admin.html`, clique **"Créer un compte"** (en dessous du formulaire de connexion), et crée son compte (email + mot de passe). Un champ **"Code (optionnel)"** est proposé (voir plus bas) — si elle le laisse vide, elle n'a **aucun droit** au départ, juste un compte qui existe.
2. Toi (admin), tu vas dans "Gestion du tournoi" → onglet "Connexion" → section **"Comptes"** → tu retrouves son email dans la liste → tu cliques "Scorer" ou "Admin".
3. C'est fait, la personne a maintenant les bons accès (pas besoin de se reconnecter, ça s'applique tout de suite).

### Les codes d'inscription automatique

Pour éviter d'avoir à ajouter le rôle manuellement à chaque fois, tu peux définir deux codes secrets (un pour Admin, un pour Scorer) dans l'onglet Connexion, section **"Codes d'inscription automatique"**. Modifiable à tout moment.

Une personne qui rentre le bon code dans le champ "Code" en créant son compte reçoit **automatiquement** le rôle correspondant, sans que tu aies besoin d'intervenir. Pratique pour donner le code "Scorer" aux personnes qui vont tenir les scores le jour J.

### Le compte principal (toi, Gabriel) — "Propriétaire"

Le compte `gabriel.cohen.1997@gmail.com` a un statut à part, codé en dur dans la base de données (pas un rôle comme les autres — voir `assign_role`/`remove_role`/`delete_account` dans le SQL Supabase si tu dois le retrouver un jour) :

- Il s'affiche en haut de la liste "Comptes", avec un badge **"Propriétaire"** au lieu de "Admin", et personne (même toi) ne peut lui retirer ses droits admin via l'interface.
- C'est le **seul** compte qui peut rétrograder un autre admin (les autres admins ne le peuvent pas entre eux).
- C'est le **seul** compte qui voit un bouton **"Supprimer"** à côté de chaque compte (sauf le sien) — supprime définitivement le compte (email + mot de passe + rôle). Irréversible, avec une confirmation avant.

Si un jour tu changes d'adresse email principale, il faut redemander à Claude de mettre à jour cette adresse dans les fonctions SQL correspondantes.

### Pourquoi c'est sécurisé

Ce n'est pas juste une question d'affichage : la base de données elle-même vérifie le rôle (et l'identité du compte principal) avant d'autoriser une modification, directement dans les fonctions SQL (`assign_role`, `remove_role`, `delete_account`). Même si quelqu'un bidouillait le site, il ne pourrait ni changer un rôle sans être admin, ni rétrograder un admin sans être le compte principal, ni supprimer un compte du tout sauf en étant le compte principal.

---

## 6. Où sont stockées les données (les tables Supabase)

Si tu vas dans Supabase → Table Editor, tu verras ces tables :

- **`teams`** : les équipes inscrites (noms des joueurs, catégorie, poule assignée, classement tête de série)
- **`pools`** : les 4 poules (A/B/C/D) par catégorie
- **`matches`** : tous les matchs — de poule, barrages, quarts, demies, petite finale, finale (une colonne `phase` dit lequel, une colonne `category` dit Hommes ou Femmes)
- **`sets`** : les scores de chaque set joué, liés à un match
- **`profiles`** : qui a quel rôle (admin/scorer) — lié aux comptes de connexion
- **`signup_codes`** : les deux codes d'inscription automatique (admin/scorer), modifiables depuis l'onglet Connexion

---

## 7. Quelques règles du tournoi (pour comprendre les résultats)

- **Formats de sets** :
  - Matchs de poule : 1 set à 21 points.
  - Barrages : 2 sets à 15 points, avec un 3ᵉ set (tie-break) à 11 points si 1 partout.
  - Quarts, demies, petite finale, finale : 2 sets à 21 points, tie-break à 15 points si 1 partout.
- **Répartition en poules (méthode serpentin)** : les têtes de série sont distribuées en zigzag entre les 4 poules pour équilibrer le niveau (ex: Poule A reçoit les têtes de série 1, 8, 9, 16 — jamais les meilleures d'un coup).
- **Barrages** : les 2èmes et 3èmes de poule s'affrontent (jamais deux équipes de la même poule), les vainqueurs rejoignent les 1ers de poule en quarts. Le tableau est conçu pour que, si les têtes de série se confirment, on ait tête de série 1 contre 4, et 2 contre 3 en demies.
- **Petite finale** : les deux équipes battues en demies s'affrontent pour la 3ᵉ place, en parallèle de la finale.

---

## 8. Faire tourner le site sur ton ordinateur

Depuis le dossier du projet, dans le Terminal :

```
python3 serve.py
```

Puis ouvrir `http://localhost:8000` dans le navigateur. (Ce script maison sert le site sans jamais mettre les fichiers en cache — utile pendant qu'on modifie le code, sinon le navigateur montre parfois une vieille version.)

---

## 9. Le code et sa sauvegarde

Le code est sur GitHub : `github.com/GC-code-lab/PantinBeachTour`. Pour sauvegarder tes modifications :

```
git add -A
git commit -m "Description de ce que tu as changé"
git push
```

✅ Le site est **en ligne** depuis GitHub Pages : **https://gc-code-lab.github.io/PantinBeachTour/**. Chaque `git push` sur la branche `main` republie automatiquement le site (compte quelques minutes de battement).

⚠️ **Piège du cache navigateur** : contrairement à `serve.py` en local (qui désactive volontairement le cache), GitHub Pages, lui, laisse les navigateurs mettre les fichiers en cache normalement. Du coup, chaque fichier CSS/JS est chargé avec un numéro de version dans son adresse (ex : `style.css?v=33`, `gestion.js?v=40`) — **à chaque modification d'un de ces fichiers, il faut augmenter ce numéro d'un cran dans le(s) fichier(s) HTML qui le chargent**, sinon les visiteurs continuent de voir l'ancienne version pendant un moment. Si tu demandes une modification à Claude, c'est normalement fait automatiquement à chaque fois — mais si un changement ne semble "pas s'appliquer" en ligne, c'est le premier réflexe à vérifier.

---

## 10. En cas de souci

- **"Une modification que Claude a faite ne s'affiche pas"** : recharge la page (le serveur local ne met rien en cache, donc un simple rechargement suffit).
- **Erreur du style "column does not exist" ou "Could not find the function"** : ça veut presque toujours dire qu'une requête SQL donnée par Claude n'a pas encore été lancée dans le SQL Editor de Supabase.
- **Un nouveau compte ne peut pas se connecter ("Email not confirmed")** : ça ne devrait plus arriver — un déclencheur automatique confirme chaque compte dès sa création. Si ça revient, redemande à Claude de vérifier le trigger `auto_confirm_email_trigger`.
- **Une modification faite sur le site en ligne (pas en local) ne s'affiche pas** : voir l'encadré sur le cache dans la section 9 — il manque probablement un incrément du `?v=N` sur le fichier concerné.
- **En lançant une requête SQL dans Supabase, erreur `unterminated dollar-quoted string`, avec des lignes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` qui apparaissent toutes seules au milieu du code** : c'est un souci connu de l'éditeur SQL de Supabase — un outil d'auto-complétion ("Assistant") essaie d'ajouter automatiquement des sécurités RLS et se trompe sur les fonctions qui contiennent un bloc `declare`, cassant la requête. Solution : utiliser **SQL Editor → New query** (l'éditeur classique) plutôt qu'un assistant/chat qui génère et exécute du SQL, et coller le bloc SQL donné tel quel.
- **Tu ne te souviens plus de rien** : montre ce fichier à Claude en début de conversation, ça remet tout en contexte instantanément.

---

## 11. Chantier en cours (pas encore fait)

**Import du classement PVS** : idée d'un bouton, au niveau des têtes de série, pour récupérer automatiquement le classement des équipes depuis PVS (`pvs.sandsystem.com`) au lieu de le retaper à la main. Exploré le 11/08/2026, pas encore codé.

- Un import 100% automatique n'est pas raisonnable : PVS n'a pas de mot de passe (connexion uniquement par Google ou lien magique par email), donc un serveur ne peut pas "se connecter à ta place" de façon fiable.
- Solution retenue : un **bookmarklet** (petit favori spécial, voir la conversation du 11/08/2026 si besoin de ré-expliquer le concept) que tu cliques une fois connecté sur la page PVS — il lit le tableau affiché et le copie dans ton presse-papier ; tu reviens sur notre site et tu colles dans une zone dédiée à créer, qui fera la correspondance avec les équipes inscrites.
- Bloqué en attendant une capture d'écran du tableau des têtes de série sur PVS (une fois connecté) pour écrire le code qui le lit correctement.
