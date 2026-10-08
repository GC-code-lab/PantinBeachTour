# Guide du site Sand System Tournament

Ce fichier explique comment fonctionne le site, du début à la fin, en français simple — pas besoin de savoir coder pour le comprendre. L'idée : si tu rouvres ce projet dans 2 ans et que tu as tout oublié, ce fichier te remet dans le bain.

---

## 1. C'est quoi, ce site ?

Un site pour organiser un tournoi de beach volley à Pantin, en deux catégories indépendantes (**Hommes** et **Femmes**). Il gère tout le cycle du tournoi :

1. Choix de la **formule** du tournoi (voir section 4bis) — rien d'autre n'est accessible tant que ce choix n'est pas fait
2. Inscription des équipes
3. Classement des têtes de série (par glisser-déposer)
4. *(Formule "12 équipes, qualifs 16" uniquement)* Poules de qualification puis barrages de qualification, pour désigner les 4 équipes qui rejoignent le tournoi principal — voir section 4bis
5. Génération automatique des poules du tournoi principal (le "Maindraw")
6. Génération automatique des matchs de poule
7. Saisie des scores
8. Génération automatique du tableau à élimination directe (barrages → quarts → demies → petite finale + finale)
9. Un podium à la fin

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
| **Qualifs** | `qualifs.html` | *Visible uniquement si la formule active du tournoi comporte des qualifications (voir section 4bis)* — les 4 poules de qualification ("Poule Qualif A" à "D") et les 8 barrages de qualification, avec leurs scores. Apparaît dans le bandeau du haut, avant "Poules". |
| **Poules** (page d'accueil) | `index.html` | Les 4 poules (A/B/C/D) **du tournoi principal** par catégorie, les équipes de chaque poule, et les matchs/scores de poule (repliés par défaut, dépliables) |
| **Phases finales** | `phases-finales.html` | Le tableau à élimination directe en dessin (barrages → quarts → demies → finale + petite finale), avec un podium en dessous une fois le tournoi terminé — toujours le tableau du tournoi principal, identique quelle que soit la formule choisie |
| **Ordre des matchs** | `ordre-des-matchs.html` | L'ordre de passage des matchs **terrain par terrain** (voir section 9) — pratique à afficher/imprimer le jour J pour savoir qui joue où et dans quel ordre. Pour la formule "12 équipes, qualifs 16", deux onglets apparaissent en haut : **Qualif (Samedi)** et **Main-draw (Dimanche)**. |
| **Palmarès** | `palmares.html` | La liste des tournois passés, chacun dépliable pour revoir son tableau des phases finales avec tous les scores (voir section 5) |

Les pages **Poules**, **Phases finales** et **Qualifs** ont un sélecteur **Hommes / Femmes** en haut, pour basculer entre les deux catégories. La page **Ordre des matchs** n'a pas ce sélecteur : elle affiche les 4 terrains d'un coup, chacun dédié à une seule catégorie (voir section 9). La page **Palmarès** a un sélecteur Hommes/Femmes **par tournoi déplié** (pas un seul sélecteur global en haut de page), puisqu'elle peut afficher plusieurs tournois à la fois.

**Avant même que les poules soient terminées**, le tableau des phases finales affiche déjà les croisements connus à l'avance (ex: "2e Poule C" contre "3e Poule B" pour un barrage, "1er Poule A" pour un quart) — ces croisements sont fixés par le format du tournoi, indépendamment des résultats. Le reste (ex: "vainqueur du quart 1") s'affiche juste comme "TBD" tant que ce n'est pas joué, pour ne pas surcharger l'affichage avec une évidence. La page **Qualifs** fait pareil pour ses propres barrages, mais avec un libellé plus parlant : "Vainqueur du Barrage 2" plutôt qu'un "TBD" générique, pour que les joueurs sachent quel match suivre (voir section 4bis).

Le site est pensé pour être consulté sur téléphone. Seule exception : le tableau des phases finales est volontairement large et pixel-exact (pour bien tracer les lignes de connexion) — sur un petit écran, il faut le faire défiler horizontalement avec le doigt pour tout voir, il commence toujours affiché depuis la gauche (les barrages).

### Partie admin (compte requis)

| Page | Fichier | Rôle |
|---|---|---|
| **Connexion** | `admin.html` | Se connecter, ou créer un nouveau compte (voir section 6) |
| **Gestion du tournoi** | `gestion.html` | Tout le pilotage du tournoi (voir section 4 et 4bis) |

**Comment y accéder** : sur toutes les pages, une fois connecté avec un rôle (admin ou scorer), le lien texte "Gestion du tournoi" du bandeau du haut est remplacé par une icône **⚙**, tout en haut à droite à côté de "Palmarès". Passer la souris dessus déroule un petit menu avec deux destinations : **"Gestion du tournoi"** (ouvre `gestion.html`, sur la vue par défaut) et **"Connexion"** (ouvre `gestion.html#compte`, directement sur le compte/les rôles). Le menu se referme tout seul dès que la souris s'en va — pas besoin de cliquer ailleurs. Un visiteur non connecté (ou un compte sans rôle) voit juste "Connexion" en texte, comme avant, qui mène vers `admin.html`.

---

## 4. Les onglets de "Gestion du tournoi"

Une fois sur `gestion.html` (via l'icône ⚙ → "Gestion du tournoi"), 4 onglets apparaissent **seulement si une formule a déjà été choisie pour le tournoi** (voir section 4bis — tant que ce n'est pas fait, cette vue n'a rien à montrer) :

### Onglet "Formule"
Voir section 4bis — c'est le premier onglet, et le passage obligé avant tout le reste.

### Onglet "Inscription des équipes"
Le formulaire pour inscrire une équipe : Nom/Prénom des deux joueurs (Nom mis en MAJUSCULES, Prénom avec Majuscule initiale, automatiquement), la catégorie (Hommes/Femmes), et les **points de la paire** (un seul nombre pour l'équipe, pas par joueur — son classement de référence). En dessous, la liste des équipes déjà inscrites — **triée par points décroissants**, avec le nombre de points affiché à côté de chaque équipe — et une case à cocher pour en supprimer plusieurs d'un coup.

⚠️ Le nom d'équipe (ex: "DUPONT/MARTIN") est calculé automatiquement à partir des noms de famille des deux joueurs — pas besoin de le taper.

**Import en masse** : pour éviter de retaper les équipes à la main, une section repliable "Importer plusieurs équipes" permet de coller un JSON généré en demandant à un chat IA (ChatGPT, Claude, Gemini...) de lire une capture d'écran du tableau de classement — un bouton "Copier" à côté du message à envoyer évite de le retaper. Le JSON est d'abord **prévisualisé** (pour corriger une erreur de lecture éventuelle) avant d'être importé d'un coup dans la catégorie sélectionnée. Aucune clé API ni configuration supplémentaire n'est nécessaire — c'est un simple copier-coller.

### Onglet "Têtes de série & Poules"
1. Une liste des équipes de la catégorie sélectionnée. **Tant qu'aucun classement manuel n'a été fait**, l'ordre par défaut est calculé automatiquement à partir des points de la paire (décroissant). Tu peux ensuite l'ajuster en faisant **glisser** une équipe, ou avec les boutons **▲/▼** à côté de chaque équipe (plus pratique sur téléphone, où le glisser-déposer ne fonctionne pas toujours) — utile pour départager une égalité de points, un cas particulier le jour J, ou désigner une **wild card** (voir section 4bis). Dès que tu fais un seul ajustement manuel, ce classement est sauvegardé et devient la référence (nouvelles équipes ajoutées en bas de liste, à repositionner à la main). Tu peux réordonner à tout moment, même après avoir déjà généré les poules — reclique juste sur le bouton de génération ensuite pour les recalculer avec le nouvel ordre (⚠️ ça réinitialise les matchs et scores déjà saisis pour cette catégorie).
2. Le bouton de génération des poules dépend de la **formule** choisie (section 4bis) :
   - **12 équipes** → "Générer 4 poules de 3", apparaît si 12 équipes sont inscrites.
   - **16 équipes** → "Générer 4 poules de 4", apparaît si 16 équipes sont inscrites.
   - **12 équipes (qualifs 16)** → "Générer les poules de qualification (16 équipes)", apparaît si 24 équipes sont inscrites. Juste en dessous, un aperçu indique qui sont les 8 équipes "Direct Maindraw" et les 16 en "Qualifications", d'après le classement tête de série actuel.

   Dans tous les cas, ce bouton fait tout d'un coup : il crée les poules et répartit les équipes dedans en **méthode serpentin** (voir section 8), puis génère aussi les matchs de chaque poule.

### Onglet "Matchs & Résultats"
1. *(Formule "12 équipes, qualifs 16" uniquement)* **Qualifications** : voir section 4bis pour le détail — poules de qualification, barrages de qualification, et le bouton pour passer au tournoi principal une fois les qualifiés connus.
2. **Matchs de poule** (tournoi principal) : les matchs de chaque poule, repliés (clique pour dérouler). Pour chaque match, tu tapes le score et cliques "Enregistrer".
3. **Phases finales** : un bouton pour générer le tableau final (barrages, quarts, demies, petite finale, finale) — n'apparaît que quand tous les matchs de poule ont un score. Ensuite, mêmes rangées de saisie de score que pour les poules.

**Important** : dès qu'un score fait gagner un match à élimination (barrage/quart/demi, ou un barrage/poule de qualif), l'équipe gagnante (et pour les demies, la perdante aussi) est **automatiquement placée** dans le match suivant — pas besoin de le faire à la main.

**Corriger ou effacer un score** : vider tous les champs de score d'un match déjà noté, puis cliquer "Enregistrer", **supprime** ce score (au lieu de bloquer avec une erreur) et remet le match "à venir". Si ce match avait déjà fait avancer une équipe au tour suivant, ça défait aussi cette avancée automatiquement — sauf si ce tour suivant a lui-même déjà été joué avec cette équipe, auquel cas le site bloque et affiche un message : il faut d'abord effacer le score de ce match suivant, puis remonter le tableau pas à pas.

---

## 4bis. La formule du tournoi et les qualifications

### Choisir une formule

Le tout premier onglet de "Gestion du tournoi" s'appelle **"Formule"** — c'est un passage obligé : **tant qu'aucune formule n'a été choisie, les onglets Inscription, Têtes de série & Poules et Matchs & Résultats restent cachés**, même pour un admin. Dès qu'une formule est cliquée, ils apparaissent immédiatement.

Trois formules sont disponibles, sous forme de gros blocs à cliquer (même taille, même style que les cartes de poules) :

- **12 équipes**
- **16 équipes**
- **12 équipes (qualifs 16)** — voir plus bas

La formule est **une seule pour tout le tournoi**, Hommes et Femmes confondus (pas une par catégorie).

**Changer de formule** :
- **Si des scores ont déjà été saisis** (n'importe quelle catégorie, n'importe quelle phase), le changement est **bloqué** — il faut d'abord terminer ou nettoyer le tournoi en cours.
- **Sinon**, changer de formule réinitialise les poules et matchs des deux catégories (ils dépendent du nombre d'équipes attendu par la formule), mais **les équipes déjà inscrites restent** — pas besoin de les réinscrire, juste à régénérer les poules ensuite. Une confirmation est demandée avant.

Pensé pour qu'un admin sans accès direct à Supabase puisse changer de formule ou repartir de zéro tout seul, sans avoir besoin d'aller nettoyer les tables à la main.

### La formule "12 équipes (qualifs 16)"

Cette formule ajoute une phase de qualification avant le tournoi principal (le "Maindraw"). Au total, **24 équipes** sont inscrites dans la catégorie :

- Les **8 meilleures têtes de série** (classement actuel, voir onglet "Têtes de série & Poules") vont **direct en Maindraw**, sans jouer les qualifs. C'est aussi là que tu places une **wild card** si besoin : il suffit de la positionner manuellement dans le top 8 du classement, même si elle a moins de points qu'une autre équipe.
- Les **16 suivantes** jouent les **qualifications**.

**Les qualifications, étape par étape** (tout se passe dans l'onglet "Matchs & Résultats", section "Qualifications") :

1. **4 poules de qualification** ("Poule Qualif A" à "D"), 4 équipes chacune, réparties en serpentin depuis le classement tête de série. Chaque poule se joue en **poule brésilienne** : un format à élimination en 2 tours, pas un round-robin classique —
   - Tour 1 : la tête de série la plus haute de la poule affronte la plus basse (1 vs 4), et les deux du milieu s'affrontent (2 vs 3).
   - Tour 2 : les deux vainqueurs du tour 1 s'affrontent (pour les places 1 et 2), et les deux perdants s'affrontent entre eux (pour les places 3 et 4). Ce tour se remplit tout seul dès que le tour 1 est noté.
   - Tous ces matchs se jouent en **2 sets à 15 points**, tie-break à **11 points** si 1 set partout.
2. Une fois les 16 matchs de poule de qualif notés, le bouton **"Générer les barrages de qualification"** apparaît. Il crée 8 barrages (notés **Barrage 1** à **Barrage 8**, même format 2 sets à 15/tie-break 11), en 2 tours :
   - **1er tour** (Barrages 1 à 4) : les 2èmes et 3èmes de poule s'affrontent, toujours entre poules différentes — Barrage 1 : 2e Poule A vs 3e Poule C ; Barrage 2 : 2e Poule B vs 3e Poule D ; Barrage 3 : 2e Poule C vs 3e Poule A ; Barrage 4 : 2e Poule D vs 3e Poule B.
   - **2e tour** (Barrages 5 à 8) : les 1ers de poule affrontent les vainqueurs du 1er tour — Barrage 5 : 1er Poule A vs vainqueur Barrage 2 ; Barrage 6 : 1er Poule B vs vainqueur Barrage 1 ; Barrage 7 : 1er Poule C vs vainqueur Barrage 4 ; Barrage 8 : 1er Poule D vs vainqueur Barrage 3. Tant que le vainqueur du 1er tour n'est pas connu, l'affichage dit explicitement **"Vainqueur du Barrage 2"** (par exemple) à la place d'un "À déterminer" générique, pour que les joueurs sachent quel match suivre.
   - Les **4 vainqueurs des Barrages 5 à 8 sont les 4 équipes qualifiées** pour le Maindraw.
3. Une fois ces 4 barrages notés, le bouton **"Générer les poules du Maindraw"** apparaît. Il prend les 8 équipes "direct" + les 4 qualifiées (12 au total), les **reclasse par points** (et non par tête de série — important si une wild card avait moins de points qu'une équipe qualifiée, elle se retrouve correctement derrière elle), puis les répartit en serpentin dans 4 nouvelles poules "Poule A" à "D", exactement comme les autres formules.

**À partir de là**, le tournoi principal se joue exactement comme les formules "12" et "16 équipes" (mêmes poules, mêmes barrages/quarts/demies/petite finale/finale, même page "Phases finales", même Palmarès) — avec une seule différence : **les sets se jouent à 15 points (tie-break à 11)** pour les barrages, quarts, demies, petite finale et finale, au lieu de 21 points (tie-break à 15) pour les formules 12/16 classiques. Les matchs de poule du Maindraw restent en 1 set à 21 points, comme d'habitude.

Les scores des qualifications se saisissent uniquement depuis l'admin (par un admin ou un scorer, comme les autres scores). Ils sont consultables publiquement sur la page **Qualifs** (voir section 3), qui n'apparaît dans le bandeau que si cette formule est active.

---

## 5. Sauvegarde du tournoi (Palmarès)

Une fois qu'un tournoi est **entièrement terminé** (tous les matchs de poule ET tout le tableau des phases finales du **tournoi principal**, **pour les deux catégories Hommes et Femmes**), un bouton **"Sauvegarde du tournoi"** apparaît tout en bas de l'onglet "Matchs & Résultats" — visible **admin uniquement** (pas les scorers). Ça fonctionne de la même façon quelle que soit la formule choisie — seul le tableau du Maindraw est archivé, les qualifications éventuelles ne le sont pas.

En cliquant dessus, un petit formulaire s'ouvre pour renseigner :
- le **nom du tournoi** (pré-rempli avec "Pantin Beach Tour", modifiable si besoin) ;
- le **mois** et l'**année** (pré-remplis avec le mois/l'année en cours).

En confirmant, ça enregistre une **copie figée** des résultats (équipes et tableau complet des phases finales, avec tous les scores, pour les deux catégories) dans le Palmarès public (`palmares.html`, voir section 3). Cette copie est indépendante des données en cours : **rien n'est effacé ni modifié** dans les équipes/poules/matchs actuels — tu peux les nettoyer toi-même (via la suppression d'équipes déjà existante) quand tu es prêt à préparer le tournoi suivant, sans jamais casser une entrée déjà sauvegardée dans le Palmarès.

Sur la page publique **Palmarès**, chaque tournoi sauvegardé apparaît sous forme de ligne dépliable (ex: "Pantin Beach Tour — Août 2026") — un clic dessus déroule un sélecteur Hommes/Femmes et le tableau des phases finales de la catégorie choisie, exactement comme sur la page "Phases finales" (même dessin, mêmes scores).

⚠️ Le bouton n'apparaît que si les deux catégories sont complètes en même temps — si une seule catégorie est finie, il faut attendre l'autre avant de pouvoir sauvegarder.

Sur la page publique Palmarès, quand tu es connecté avec ton compte principal (le "Propriétaire", voir section 6), un bouton **"Supprimer ce tournoi"** apparaît en bas de chaque tournoi déplié — pour rattraper une erreur de sauvegarde (mauvais nom, mauvais mois...). Personne d'autre ne voit ce bouton, ni même les autres admins.

---

## 6. Les comptes et les droits (qui peut faire quoi)

Il y a 3 niveaux :

1. **Visiteur** (personne connectée sans rôle, ou pas connectée du tout) : peut seulement **regarder** les pages publiques (Qualifs, Poules, Phases finales, Ordre des matchs, Palmarès). Ne peut rien modifier. Un compte créé mais sans rôle voit exactement la même chose qu'un simple visiteur (juste l'onglet "Connexion" en plus, avec son email et un bouton pour se déconnecter — accessible via l'icône ⚙).
2. **Scorer** : en plus, peut **saisir les scores** des matchs (onglet "Matchs & Résultats" uniquement — y compris les scores de qualification). Ne voit pas les onglets "Formule", "Inscription" ni "Têtes de série & Poules".
3. **Admin** : accès à tout — formule, inscriptions, poules, scores, et peut gérer les rôles des autres comptes.

Dans tous les cas, les onglets "Inscription", "Têtes de série & Poules" et "Matchs & Résultats" restent cachés tant qu'aucune formule n'a été choisie pour le tournoi (voir section 4bis) — même pour un admin.

### La liste "Comptes" (onglet Connexion)

Tous les comptes créés apparaissent dans une seule liste, avec leur rôle actuel affiché directement ("Aucun rôle", "Scorer", ou "Admin") :

- Pour un compte **sans rôle** ou **Scorer** : deux boutons "Scorer" / "Admin" à côté de son email. Clique sur l'un pour le lui attribuer.
- Pour **retirer un rôle** à quelqu'un (le repasser à "sans rôle") : reclique sur le bouton de son rôle actuel (déjà en surbrillance) — un clic dessus l'enlève.
- Pour un compte déjà **Admin** : plus de bouton, juste un badge "Admin" fixe. **Un admin ne peut pas rétrograder un autre admin** — c'est une protection volontaire (voir plus bas), pour éviter qu'un admin en dégrade un autre par erreur ou par malveillance.

### Comment ajouter quelqu'un (scorer ou admin)

1. La personne va sur `admin.html`, clique **"Créer un compte"** (en dessous du formulaire de connexion), et crée son compte (email + mot de passe). Un champ **"Code (optionnel)"** est proposé (voir plus bas) — si elle le laisse vide, elle n'a **aucun droit** au départ, juste un compte qui existe.
2. Toi (admin), tu vas dans "Gestion du tournoi" (icône ⚙) → onglet "Connexion" → section **"Comptes"** → tu retrouves son email dans la liste → tu cliques "Scorer" ou "Admin".
3. C'est fait, la personne a maintenant les bons accès (pas besoin de se reconnecter, ça s'applique tout de suite).

### Les codes d'inscription automatique

Pour éviter d'avoir à ajouter le rôle manuellement à chaque fois, tu peux définir deux codes secrets (un pour Admin, un pour Scorer) dans l'onglet Connexion, section **"Codes d'inscription automatique"**. Modifiable à tout moment.

Une personne qui rentre le bon code dans le champ "Code" en créant son compte reçoit **automatiquement** le rôle correspondant, sans que tu aies besoin d'intervenir. Pratique pour donner le code "Scorer" aux personnes qui vont tenir les scores le jour J.

### Le compte principal (toi, Gabriel) — "Propriétaire"

Le compte `gabriel.cohen.1997@gmail.com` a un statut à part, codé en dur dans la base de données (pas un rôle comme les autres — voir `assign_role`/`remove_role`/`delete_account`/`delete_tournament_archive` dans le SQL Supabase si tu dois le retrouver un jour) :

- Il s'affiche en haut de la liste "Comptes", avec un badge **"Propriétaire"** au lieu de "Admin", et personne (même toi) ne peut lui retirer ses droits admin via l'interface.
- C'est le **seul** compte qui peut rétrograder un autre admin (les autres admins ne le peuvent pas entre eux).
- C'est le **seul** compte qui voit un bouton **"Supprimer"** à côté de chaque compte (sauf le sien) — supprime définitivement le compte (email + mot de passe + rôle). Irréversible, avec une confirmation avant.
- C'est aussi le **seul** compte qui voit un bouton **"Supprimer ce tournoi"** sur la page publique Palmarès (voir section 5) — pour rattraper une erreur de sauvegarde.

Si un jour tu changes d'adresse email principale, il faut redemander à Claude de mettre à jour cette adresse dans les fonctions SQL correspondantes.

### Pourquoi c'est sécurisé

Ce n'est pas juste une question d'affichage : la base de données elle-même vérifie le rôle (et l'identité du compte principal) avant d'autoriser une modification, directement dans les fonctions SQL (`assign_role`, `remove_role`, `delete_account`, `delete_tournament_archive`). Même si quelqu'un bidouillait le site, il ne pourrait ni changer un rôle sans être admin, ni rétrograder un admin sans être le compte principal, ni supprimer un compte ou un tournoi du Palmarès sauf en étant le compte principal. De la même façon, la formule du tournoi (`tournament_formats`) ne peut être modifiée que par un compte admin, vérifié côté SQL.

---

## 7. Où sont stockées les données (les tables Supabase)

Si tu vas dans Supabase → Table Editor, tu verras ces tables :

- **`teams`** : les équipes inscrites (noms des joueurs, points de classement de la paire, catégorie, poule assignée, classement tête de série)
- **`pools`** : les 4 poules (A/B/C/D) par catégorie, **du tournoi principal (Maindraw) uniquement** — les poules de qualification (formule "12 équipes, qualifs 16") ne sont pas des lignes de cette table ; elles n'existent que sous forme de matchs (voir ci-dessous), regroupés par lettre dans leur `slot`
- **`matches`** : tous les matchs — de poule, barrages, quarts, demies, petite finale, finale (une colonne `phase` dit lequel, une colonne `category` dit Hommes ou Femmes). Pour la formule "12 équipes, qualifs 16", trois valeurs de `phase` supplémentaires existent : `qualif_poule` (poules brésiliennes), `qualif_barrage1` et `qualif_barrage2` (les 2 tours de barrages de qualif) — leur `slot` encode la poule/le numéro de barrage (ex: `qA-r1-1`, `qb5`)
- **`sets`** : les scores de chaque set joué, liés à un match. Une contrainte d'unicité sur (`match_id`, `set_number`) empêche qu'un même set soit enregistré deux fois par erreur (ex: double-clic sur "Enregistrer")
- **`profiles`** : qui a quel rôle (admin/scorer) — lié aux comptes de connexion
- **`signup_codes`** : les deux codes d'inscription automatique (admin/scorer), modifiables depuis l'onglet Connexion
- **`tournament_archives`** : les tournois sauvegardés dans le Palmarès (nom, mois, année, et une colonne `data` qui contient une copie complète et figée des équipes + du tableau des phases finales des deux catégories, au format JSON) — voir section 5
- **`tournament_formats`** : une seule ligne (`id = 1`), avec la formule active du tournoi en cours (`"12"`, `"16"`, ou `"12-quali16"`) — voir section 4bis. Lisible par tout le monde (public), modifiable uniquement par un admin.

---

## 8. Quelques règles du tournoi (pour comprendre les résultats)

- **Formats de sets (formules "12" et "16 équipes")** :
  - Matchs de poule : 1 set à 21 points.
  - Barrages : 2 sets à 15 points, avec un 3ᵉ set (tie-break) à 11 points si 1 partout.
  - Quarts, demies, petite finale, finale : 2 sets à 21 points, tie-break à 15 points si 1 partout.
- **Formats de sets (formule "12 équipes, qualifs 16")** :
  - Matchs de poule (qualif ET Maindraw) : qualif = 2 sets à 15 (tie-break 11) ; Maindraw = 1 set à 21, comme les autres formules.
  - Barrages de qualif, barrages/quarts/demies/petite finale/finale du Maindraw : tous en 2 sets à 15 points, tie-break à 11 points si 1 partout.
  - Voir section 4bis pour le détail complet de cette formule (poules brésiliennes, croisements des barrages de qualif).
- **Répartition en poules (méthode serpentin)** : les têtes de série sont distribuées en zigzag entre les poules pour équilibrer le niveau (ex: Poule A reçoit les têtes de série 1, 8, 9, 16 pour une poule de 16 équipes — jamais les meilleures d'un coup).
- **Classement d'une poule (Maindraw)** : d'abord par nombre de victoires. En cas d'égalité de victoires entre plusieurs équipes (2 équipes à égalité, ou une "triangulaire" à 3 équipes dans une poule de 4), le départage se fait dans cet ordre : 1) la différence de points, calculée **uniquement sur les matchs joués entre les équipes à égalité** (ignore les scores face à l'équipe hors du groupe) ; 2) si toujours égal, la différence de points face à la ou les équipes **hors du groupe** ; 3) si toujours égal, le rang de tête de série. Cette logique est appliquée à l'identique côté public (poules) et côté admin (génération des phases finales), pour que les deux classements affichés concordent toujours. (Les poules de qualif, en poule brésilienne, n'ont pas besoin de ce départage : le classement 1-2-3-4 découle directement des résultats du tour 2, toujours tranché.)
- **Barrages (Maindraw)** : les 2èmes et 3èmes de poule s'affrontent (jamais deux équipes de la même poule) — Barrage 1 : 2e Poule C vs 3e Poule B ; Barrage 2 : 2e Poule B vs 3e Poule C ; Barrage 3 : 2e Poule D vs 3e Poule A ; Barrage 4 : 2e Poule A vs 3e Poule D. Les vainqueurs rejoignent les 1ers de poule en quarts — le vainqueur du Barrage 2 (2e B) affronte le 1er de Poule A, le vainqueur du Barrage 1 (2e C) affronte le 1er de Poule D, le vainqueur du Barrage 4 (2e A) affronte le 1er de Poule B, le vainqueur du Barrage 3 (2e D) affronte le 1er de Poule C. Le tableau est conçu pour que, si les têtes de série se confirment, on ait tête de série 1 contre 4, et 2 contre 3 en demies.
- **Petite finale** : les deux équipes battues en demies s'affrontent pour la 3ᵉ place, en parallèle de la finale.

---

## 9. L'ordre des matchs par terrain

La page publique **Ordre des matchs** (`ordre-des-matchs.html`, fichier `js/ordre-des-matchs.js`) répond à une question très concrète le jour J : *"sur quel terrain, à quelle heure, et dans quel ordre je joue ?"*. Elle affiche les 4 terrains côte à côte, chacun avec sa liste de matchs **avec l'horaire prévu affiché en petit** à côté de chaque match (un planning fixe, pas recalculé dynamiquement — si le tournoi prend du retard, les horaires affichés restent ceux prévus au départ).

**Formule "12 équipes, qualifs 16"** : deux onglets apparaissent en haut de la page — **"Qualif (Samedi)"** et **"Main-draw (Dimanche)"** — pour séparer les deux journées, chacune avec son propre planning (voir plus bas). Sans cette formule, les onglets n'apparaissent pas et la page garde son comportement habituel (juste le Main-draw, sans onglet).

### Répartition des terrains par catégorie

Il y a 4 terrains, dédiés en dur à une catégorie chacun :

| Terrain | Catégorie |
|---|---|
| 1 | Femmes |
| 2 | Hommes |
| 3 | Hommes |
| 4 | Femmes |

Chaque catégorie utilise donc 2 terrains en parallèle, indépendamment de l'autre catégorie — mais suit le **même planning horaire** qu'elle (définis une fois dans `MAINDRAW_SCHEDULE`/`QUALIF_SCHEDULE` de `js/ordre-des-matchs.js`, appliqués identiquement aux deux catégories sur leurs propres terrains).

### Dimanche — Main-draw (poules de 3)

Avec des poules de 3 équipes, un même pool n'a jamais 2 matchs simultanés **en son sein** (il n'y a qu'1 match par tour, pas 2) : la simultanéité vient de **2 poules différentes** jouées en même temps, chacune sur un des 2 terrains de la catégorie. Planning (identique Hommes et Femmes, sur leurs terrains respectifs) :

| Heure | Terrain 1 (1er de la paire) | Terrain 2 (2e de la paire) |
|---|---|---|
| 9h00 | Poule B · Tour 1 | Poule C · Tour 1 |
| 9h30 | Poule A · Tour 1 | Poule D · Tour 1 |
| 10h00 | Poule B · Tour 2 | Poule C · Tour 2 |
| 10h30 | Poule A · Tour 2 | Poule D · Tour 2 |
| 11h00 | Poule B · Tour 3 | Poule C · Tour 3 |
| 11h30 | Poule A · Tour 3 | Poule D · Tour 3 |
| 12h00 | Barrage 1 | Barrage 2 |
| 12h45 | Barrage 3 | Barrage 4 |
| 13h30 | Quart 1 (1er Poule A) | Quart 2 (1er Poule D) |
| 14h15 | Quart 3 (1er Poule B) | Quart 4 (1er Poule C) |
| 15h15 | Demi 1 | Demi 2 |
| 16h15 | Finale | Petite finale |

Les Poules B et C tournent ensemble (chaque terrain de la catégorie alterne entre les deux), les Poules A et D tournent ensemble en décalé d'une demi-heure. Barrage 1+2 et Quart 1+2 vont ensemble (ils alimentent la Demi 1, voir section 8) ; Barrage 3+4 et Quart 3+4 vont ensemble (Demi 2). Tant qu'un match n'a pas encore d'équipes connues, la page affiche les croisements prévus par le format (ex: "2e Poule C" / "3e Poule B" pour le Barrage 1) — mêmes libellés que la page publique Phases finales.

### Samedi — Qualifications (poules de 4, "poule brésilienne")

Ici, contrairement au Main-draw, une poule de qualif (4 équipes) **a bien** 2 matchs simultanés en son sein à chaque tour (1v4+2v3, puis vainqueurs entre eux/perdants entre eux — voir section 4bis) : une seule poule occupe donc les 2 terrains de la catégorie à la fois, comme pour une poule de 4 classique. Planning :

| Heure | Terrain 1 (1er de la paire) | Terrain 2 (2e de la paire) |
|---|---|---|
| 9h00 | Poule Qualif B · Tour 1 (1v4) | Poule Qualif B · Tour 1 (2v3) |
| 9h45 | Poule Qualif D · Tour 1 | Poule Qualif D · Tour 1 |
| 10h30 | Poule Qualif A · Tour 1 | Poule Qualif A · Tour 1 |
| 11h15 | Poule Qualif C · Tour 1 | Poule Qualif C · Tour 1 |
| 12h00 | Poule Qualif B · Tour 2 | Poule Qualif B · Tour 2 |
| 12h45 | Poule Qualif D · Tour 2 | Poule Qualif D · Tour 2 |
| 13h30 | Poule Qualif A · Tour 2 | Poule Qualif A · Tour 2 |
| 14h15 | Poule Qualif C · Tour 2 | Poule Qualif C · Tour 2 |
| 15h00 | Barrage qualif 2 (2B vs 3D) | Barrage qualif 4 (2D vs 3B) |
| 15h45 | Barrage qualif 1 (2A vs 3C) | Barrage qualif 3 (2C vs 3A) |
| 16h30 | Barrage qualif 5 (1A vs vainqueur B2) | Barrage qualif 7 (1C vs vainqueur B4) |
| 17h15 | Barrage qualif 6 (1B vs vainqueur B1) | Barrage qualif 8 (1D vs vainqueur B3) |

Ordre de passage des poules de qualif : **B, D, A, C** (aux deux tours) — différent de l'ordre alphabétique, choix arbitraire pour varier l'enchaînement comme pour le Main-draw. Les barrages de qualif sont groupés par poules concernées : Barrage qualif 2 (2B-3D) et Barrage qualif 4 (2D-3B) ensemble à 15h (tous deux B/D) ; Barrage qualif 1 (2A-3C) et Barrage qualif 3 (2C-3A) ensemble à 15h45 (tous deux A/C) ; puis le 2e tour reprend le même regroupement (B2→B5 et B4→B7 ensemble, B1→B6 et B3→B8 ensemble) — les croisements eux-mêmes (qui affronte qui) restent ceux définis en section 4bis/8, seul le regroupement par terrain/horaire change.

---

## 10. Faire tourner le site sur ton ordinateur

Depuis le dossier du projet, dans le Terminal :

```
python3 serve.py
```

Puis ouvrir `http://localhost:8000` dans le navigateur. (Ce script maison sert le site sans jamais mettre les fichiers en cache — utile pendant qu'on modifie le code, sinon le navigateur montre parfois une vieille version.)

---

## 11. Le code et sa sauvegarde

Le code est sur GitHub : `github.com/GC-code-lab/PantinBeachTour`. Pour sauvegarder tes modifications :

```
git add -A
git commit -m "Description de ce que tu as changé"
git push
```

✅ Le site est **en ligne** depuis GitHub Pages : **https://gc-code-lab.github.io/PantinBeachTour/**. Chaque `git push` sur la branche `main` republie automatiquement le site (compte quelques minutes de battement).

⚠️ **Piège du cache navigateur** : contrairement à `serve.py` en local (qui désactive volontairement le cache), GitHub Pages, lui, laisse les navigateurs mettre les fichiers en cache normalement. Du coup, chaque fichier CSS/JS est chargé avec un numéro de version dans son adresse (ex : `style.css?v=59`, `gestion.js?v=69`) — **à chaque modification d'un de ces fichiers, il faut augmenter ce numéro d'un cran dans le(s) fichier(s) HTML qui le chargent**, sinon les visiteurs continuent de voir l'ancienne version pendant un moment. Si tu demandes une modification à Claude, c'est normalement fait automatiquement à chaque fois — mais si un changement ne semble "pas s'appliquer" en ligne, c'est le premier réflexe à vérifier.

---

## 12. En cas de souci

- **"Une modification que Claude a faite ne s'affiche pas"** : recharge la page (le serveur local ne met rien en cache, donc un simple rechargement suffit en général). Si un rechargement classique (ou même forcé, Cmd+Shift+R) ne suffit pas — ça arrive, certains navigateurs gardent une page "en mémoire" (cache retour-arrière) qui ignore les réglages anti-cache du serveur — ouvre la page dans une **fenêtre de navigation privée**, ou ferme complètement l'onglet et rouvre l'adresse : ça repart toujours d'une page neuve.
- **Erreur du style "column does not exist", "Could not find the function", ou "violates check constraint"** : ça veut presque toujours dire qu'une requête SQL donnée par Claude n'a pas encore été lancée dans le SQL Editor de Supabase. Le cas "check constraint" arrive typiquement quand une nouvelle valeur de `phase` ou de `slot` est introduite côté code (ex: une nouvelle formule de tournoi) sans avoir élargi la contrainte correspondante côté base — Claude doit alors fournir une requête `alter table ... drop constraint ... / add constraint ...` pour l'autoriser.
- **Un nouveau compte ne peut pas se connecter ("Email not confirmed")** : ça ne devrait plus arriver — un déclencheur automatique confirme chaque compte dès sa création. Si ça revient, redemande à Claude de vérifier le trigger `auto_confirm_email_trigger`.
- **Une modification faite sur le site en ligne (pas en local) ne s'affiche pas** : voir l'encadré sur le cache dans la section 11 — il manque probablement un incrément du `?v=N` sur le fichier concerné.
- **En lançant une requête SQL dans Supabase, erreur `unterminated dollar-quoted string`, avec des lignes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` qui apparaissent toutes seules au milieu du code** : c'est un souci connu de l'éditeur SQL de Supabase — un outil d'auto-complétion ("Assistant") essaie d'ajouter automatiquement des sécurités RLS et se trompe sur les fonctions qui contiennent un bloc `declare`, cassant la requête. Solution : utiliser **SQL Editor → New query** (l'éditeur classique) plutôt qu'un assistant/chat qui génère et exécute du SQL, et coller le bloc SQL donné tel quel.
- **Tu ne te souviens plus de rien** : montre ce fichier à Claude en début de conversation, ça remet tout en contexte instantanément.

---

## 13. Historique des décisions

**Import du classement des équipes** (14/08/2026) : plutôt qu'un bouton "connecté à PVS" (pas raisonnable — PVS n'a pas de mot de passe classique, connexion uniquement par Google/lien magique, donc un serveur ne peut pas s'y connecter à ta place) ou qu'une intégration API Claude avec clé secrète (backend à maintenir pour un usage 1x/tournoi, disproportionné), la solution retenue est un **copier-coller de JSON** : tu demandes à un chat IA de ton choix de lire la capture d'écran et de te sortir un JSON, tu le colles dans la section "Importer plusieurs équipes" de l'onglet Inscription (voir section 4). Zéro clé API, zéro backend à maintenir, à voir si on change ça.

**Palmarès** (02/09/2026) : trois choix de conception discutés et tranchés avant de coder — 1) le Palmarès est une **page publique** (pas un onglet admin) puisque c'est un historique que les joueurs ont envie de consulter, comme les autres pages publiques ; 2) la sauvegarde couvre **les deux catégories à la fois** en une seule entrée (un tournoi = un événement, pas deux) — le bouton n'apparaît que quand Hommes ET Femmes sont terminés ; 3) sauvegarder **ne touche pas** aux équipes/poules/matchs en cours — c'est une copie figée en plus, pas un archivage qui vide la base. Techniquement, `tournament_archives.data` stocke une copie complète et autonome des équipes et du tableau des phases finales (pas juste des identifiants) : comme les équipes seront supprimées avant le tournoi suivant, le Palmarès ne peut dépendre d'aucune ligne des tables `teams`/`matches`/`pools` pour rester lisible dans le temps.

**Suppression d'un tournoi du Palmarès** (03/09/2026) : suite à une sauvegarde faite par erreur, ajout d'un droit de suppression réservé au compte principal (voir `delete_tournament_archive` et la section "Le compte principal" en section 6) — même pattern que `delete_account` : bouton visible seulement pour ce compte, et vérification refaite côté SQL pour que ce ne soit pas juste une question d'affichage.

**Formule du tournoi** (04/10/2026) : jusque-là, le nombre d'équipes attendu (12 ou 16) était juste déduit du nombre d'équipes inscrites — pas un vrai choix. Pour préparer l'ajout de formules plus complexes (qualifications), un onglet "Formule" dédié a été créé, avec un choix explicite stocké dans `tournament_formats`, qui **gate** l'accès au reste de la gestion du tournoi (rien d'autre n'est accessible tant que ce choix n'est pas fait). Décisions prises en discussion : une formule pour tout le tournoi (pas une par catégorie, pour rester cohérent avec un événement unique) ; changer de formule reste possible tant qu'aucun score n'existe (sinon bloqué) ; changer de formule réinitialise les poules/matchs mais **garde les équipes inscrites**, pour qu'un admin sans accès à Supabase puisse piloter ça seul.

**Formule "12 équipes, qualifs 16"** (04/10/2026) : conçue pour que le tableau des phases finales du Maindraw reste strictement identique aux autres formules (seuls les points de set changent), afin de pouvoir réutiliser tel quel tout le moteur existant (génération des poules par serpentin, propagation des vainqueurs via `BRACKET_PROGRESSION`, affichage public). Choix d'architecture clé : les poules de qualification ne sont **pas** des lignes de la table `pools` (juste des matchs regroupés par lettre dans leur `slot`) — ça évite toute collision avec les contrôles qui comptent "4 poules" pour le Maindraw, et permet aux deux systèmes de coexister sans se marcher dessus. Les 8 équipes "direct Maindraw" sont choisies par tête de série (permettant les wild cards), mais les 12 équipes du Maindraw final sont reclassées par **points** juste avant le serpentin, pour qu'une wild card plus faible qu'une équipe qualifiée ne soit pas avantagée. Choix volontaire de scope : l'affichage public des qualifications (page `qualifs.html`) est arrivé dans un second temps, après validation du moteur côté admin — et l'intégration à la page "Ordre des matchs" (terrains) n'est pas encore faite.

**Restructuration de la navigation admin** (04/10/2026) : le titre "Gestion du tournoi" et les 5 onglets à plat (dont "Connexion") ont été remplacés par une icône ⚙ dans le bandeau commun (toutes pages), avec un menu déroulant au survol vers "Gestion du tournoi" (4 onglets : Formule, Inscription, Têtes de série & Poules, Matchs & Résultats) ou "Connexion" (compte/rôles, via `gestion.html#compte`). Objectif : alléger l'interface et sortir "Connexion" du flot des onglets de pilotage, qui n'a rien à voir avec les autres.

**Correction des scores (doublons et effacement)** (04/10/2026) : deux bugs liés corrigés ensemble. 1) Un double-clic sur "Enregistrer" avant la fin du rechargement de page pouvait créer plusieurs lignes de score pour le même set (le code ne voyait pas encore le set tout juste créé) — corrigé en désactivant le bouton dès le premier clic, plus une contrainte d'unicité ajoutée côté base (`sets`, sur `match_id` + `set_number`) en filet de sécurité. 2) Vider les champs d'un match déjà noté puis "Enregistrer" bloquait avec une erreur au lieu d'effacer le score — corrigé pour que ça supprime le score et défasse une éventuelle propagation déjà faite vers le match suivant (sauf si ce dernier a lui-même déjà été joué, auquel cas il faut remonter le tableau pas à pas).

**Boîte à idées "Amélioration du site"** (04/10/2026) : nouvel onglet dans le menu ⚙ (entre "Gestion du tournoi" et "Connexion") où n'importe quel admin ou scorer peut laisser un message libre (table `site_feedback`). Seuls les admins voient la liste des retours reçus et peuvent les supprimer une fois traités — un scorer peut écrire mais pas relire, comme une vraie boîte à idées.

**Renommage du site** (07/10/2026) : le site a vocation à servir au-delà du seul "Pantin Beach Tour" — titre, logo et pied de page sont passés sur le nom générique "Sand System Tournament" (une signature "dev by GabClaude" ajoutée au pied de page a été retirée dans la foulée, jugée pas nécessaire). Le nom du tournoi archivé dans le Palmarès reste modifiable à chaque sauvegarde (toujours pré-rempli "Pantin Beach Tour" par défaut) ; le dépôt GitHub et l'URL publique (`PantinBeachTour`) n'ont volontairement pas été renommés, pour ne pas casser le lien existant.

**Correction du croisement des barrages (Maindraw)** (07/10/2026) : les barrages 1↔2 et 3↔4 étaient inversés — le vainqueur du Barrage 1 (2e Poule C) rejoignait à tort le 1er de Poule A au lieu du 1er de Poule D, et pareil pour 3↔4. Corrigé dans `BRACKET_PROGRESSION` (js/gestion.js), avec répercussion sur l'ordre d'affichage visuel du tableau (js/bracket-render.js, pour que les lignes de connexion restent justes) et sur le regroupement par terrain (js/ordre-des-matchs.js, pour que chaque terrain suive un seul chemin cohérent du tableau). Voir section 8 pour le détail exact du bon croisement.

**Intégration des qualifs à "Ordre des matchs", avec horaires fixes** (07/10/2026) : la page affiche désormais 2 onglets ("Qualif (Samedi)" / "Main-draw (Dimanche)") quand la formule active comporte des qualifications, avec un **horaire précis affiché à côté de chaque match** sur les deux journées — jusque-là cette page ignorait les qualifs et n'affichait aucun horaire. Changement d'architecture à cette occasion : l'ancienne logique générique (`POOL_ORDER` + découpage mécanique des matchs d'une poule par paquets de 2) a été remplacée par un **planning explicite** (`MAINDRAW_SCHEDULE`/`QUALIF_SCHEDULE` dans js/ordre-des-matchs.js, un tableau d'horaires avec ce qui se joue sur chaque terrain à chaque heure), donné heure par heure par Gabriel plutôt que déduit automatiquement. Raison du changement : l'ancienne logique supposait à tort qu'un "tour" avait toujours 2 matchs simultanés *au sein d'une même poule* — vrai pour une poule de 4 (et donc pour les poules de qualif), mais **faux pour une poule de 3** (round-robin à 3 équipes, 1 seul match par tour) où elle produisait un mauvais découpage (2 matchs présentés comme simultanés alors qu'ils partagent une équipe). Le vrai planning du Main-draw (poules de 3) fait jouer 2 POULES DIFFÉRENTES en parallèle (Poule B + Poule C ensemble, Poule A + Poule D ensemble, décalées d'une demi-heure) plutôt que de chercher une simultanéité interne impossible. Voir section 9 pour le détail complet des deux plannings.

**Inversion des terrains par catégorie** (08/10/2026) : Hommes et Femmes ont échangé leurs terrains — Hommes joue maintenant sur 2 et 3, Femmes sur 1 et 4 (c'était l'inverse). Un seul endroit à changer : `GENDER_TERRAINS`/`COURTS` dans js/ordre-des-matchs.js, le reste du site ne fait jamais référence à un numéro de terrain précis.
