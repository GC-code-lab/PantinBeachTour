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
- **GitHub** : là où le code du site est sauvegardé (comme une sauvegarde + un historique de toutes les versions). Le dépôt s'appelle `PantinBeachTour`, sous le compte `GC-code-lab`.

---

## 3. Les pages du site

### Partie publique (pas besoin de compte)

| Page | Fichier | Ce qu'on y voit |
|---|---|---|
| **Poules** (page d'accueil) | `index.html` | Les 4 poules (A/B/C/D) par catégorie, les équipes de chaque poule, et les matchs/scores de poule (repliés par défaut, dépliables) |
| **Phases finales** | `phases-finales.html` | Le tableau à élimination directe en dessin (barrages → quarts → demies → finale + petite finale), avec un podium en dessous une fois le tournoi terminé |

Ces deux pages ont un sélecteur **Hommes / Femmes** en haut, pour basculer entre les deux catégories.

### Partie admin (compte requis)

| Page | Fichier | Rôle |
|---|---|---|
| **Connexion** | `admin.html` | Se connecter, ou créer un nouveau compte (voir section 5) |
| **Gestion du tournoi** | `gestion.html` | Tout le pilotage du tournoi, organisé en 4 onglets (voir section 4) |

---

## 4. Les 4 onglets de "Gestion du tournoi"

### Onglet "Connexion"
Affiche ton compte connecté, un bouton pour te déconnecter, et (si tu es admin) une section **"Ajout de rôle"** pour donner les droits admin ou scorer à un compte existant.

### Onglet "Inscription des équipes"
Le formulaire pour inscrire une équipe : Nom/Prénom des deux joueurs (mis en forme automatiquement — Nom en MAJUSCULES, Prénom avec Majuscule initiale), et la catégorie (Hommes/Femmes). En dessous, la liste des équipes déjà inscrites, avec une case à cocher pour en supprimer plusieurs d'un coup.

⚠️ Le nom d'équipe (ex: "DUPONT/MARTIN") est calculé automatiquement à partir des noms de famille des deux joueurs — pas besoin de le taper.

### Onglet "Têtes de série & Poules"
1. Une liste des équipes de la catégorie sélectionnée, que tu classes en les faisant **glisser** (la position 1 = tête de série n°1). Ce classement est sauvegardé automatiquement à chaque glissement.
2. Un bouton **"Générer 4 poules de 3"** (pour 12 équipes) ou **"Générer 4 poules de 4"** (pour 16 équipes) — apparaît seulement si le nombre d'équipes correspond. Ce bouton fait tout d'un coup : il crée les 4 poules et répartit les équipes dedans en **méthode serpentin** (voir section 7), puis génère aussi les matchs de chaque poule.

### Onglet "Matchs & Résultats"
1. **Matchs de poule** : les matchs de chaque poule, repliés (clique pour dérouler). Pour chaque match, tu tapes le score et cliques "Enregistrer".
2. **Phases finales** : un bouton pour générer le tableau final (barrages, quarts, demies, petite finale, finale) — n'apparaît que quand tous les matchs de poule ont un score. Ensuite, mêmes rangées de saisie de score que pour les poules.

**Important** : dès qu'un score fait gagner un match du tableau final, l'équipe gagnante (et pour les demies, la perdante aussi) est **automatiquement placée** dans le match suivant — pas besoin de le faire à la main.

---

## 5. Les comptes et les droits (qui peut faire quoi)

Il y a 3 niveaux :

1. **Visiteur** (personne connectée) : peut seulement **regarder** les pages publiques (Poules, Phases finales). Ne peut rien modifier.
2. **Scorer** : en plus, peut **saisir les scores** des matchs (onglet "Matchs & Résultats" uniquement). Ne voit pas les onglets "Inscription" ni "Têtes de série & Poules".
3. **Admin** : accès à tout — inscriptions, poules, scores, et peut donner des rôles à d'autres comptes.

### Comment ajouter quelqu'un (scorer ou admin)

1. La personne va sur `admin.html`, clique **"Créer un compte"** (en dessous du formulaire de connexion), et crée son compte (email + mot de passe). À ce stade, elle n'a **aucun droit**, juste un compte qui existe.
2. Toi (admin), tu vas dans "Gestion du tournoi" → onglet "Connexion" → section **"Ajout de rôle"** → tu choisis son email dans la liste déroulante (ne montre que les comptes sans rôle) → tu choisis "Scorer" ou "Admin" → "Ajouter le rôle".
3. C'est fait, la personne peut se reconnecter et a maintenant les bons accès.

Tu peux voir tous les comptes ayant un rôle en dépliant **"Comptes avec un rôle"**, juste en dessous du formulaire.

### Pourquoi c'est sécurisé

Ce n'est pas juste une question d'affichage : la base de données elle-même vérifie le rôle avant d'autoriser une modification (via des "règles de sécurité" côté Supabase). Même si quelqu'un bidouillait le site, il ne pourrait pas écrire dans la base sans le bon rôle.

---

## 6. Où sont stockées les données (les tables Supabase)

Si tu vas dans Supabase → Table Editor, tu verras ces tables :

- **`teams`** : les équipes inscrites (noms des joueurs, catégorie, poule assignée, classement tête de série)
- **`pools`** : les 4 poules (A/B/C/D) par catégorie
- **`matches`** : tous les matchs — de poule, barrages, quarts, demies, petite finale, finale (une colonne `phase` dit lequel, une colonne `category` dit Hommes ou Femmes)
- **`sets`** : les scores de chaque set joué, liés à un match
- **`profiles`** : qui a quel rôle (admin/scorer) — lié aux comptes de connexion

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

⚠️ Le site n'est pour l'instant **pas encore mis en ligne publiquement** (pas de déploiement GitHub Pages fait) — il ne tourne qu'en local sur ta machine via `serve.py`. Pour le rendre accessible à tout le monde (joueurs, scorers) sans que chacun installe quoi que ce soit, il faudra activer GitHub Pages depuis les réglages du dépôt GitHub.

---

## 10. En cas de souci

- **"Une modification que Claude a faite ne s'affiche pas"** : recharge la page (le serveur local ne met rien en cache, donc un simple rechargement suffit).
- **Erreur du style "column does not exist" ou "Could not find the function"** : ça veut presque toujours dire qu'une requête SQL donnée par Claude n'a pas encore été lancée dans le SQL Editor de Supabase.
- **Un nouveau compte ne peut pas se connecter ("Email not confirmed")** : ça ne devrait plus arriver — un déclencheur automatique confirme chaque compte dès sa création. Si ça revient, redemande à Claude de vérifier le trigger `auto_confirm_email_trigger`.
- **Tu ne te souviens plus de rien** : montre ce fichier à Claude en début de conversation, ça remet tout en contexte instantanément.
