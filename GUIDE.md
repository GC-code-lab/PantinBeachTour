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

Ordre des liens dans le bandeau du haut : **Équipes · Qualifs** *(si formule avec qualifs)* **· Main Draw · Ordre des matchs · Suivi d'équipe · Palmarès**, puis **Connexion** (ou l'icône ⚙ une fois connecté avec un rôle). Le logo "🏐 Sand System Tournament" ramène à la page d'accueil (Main Draw).

| Page | Fichier | Ce qu'on y voit |
|---|---|---|
| **Équipes** | `equipes.html` | La liste des équipes inscrites dans la catégorie, avec leur **numéro de tête de série** (#1, #2...) et leurs **points**. Pour la formule "12 équipes, qualifs 16", la liste est coupée en deux : **Direct Maindraw** (les 8 premières têtes de série) et **Qualifications** (les 16 suivantes) — même répartition que côté admin. |
| **Qualifs** | `qualifs.html` | *Visible uniquement si la formule active du tournoi comporte des qualifications (voir section 4bis)* — deux sous-onglets **Poules** et **Barrages** : les 4 poules de qualification ("Poule Qualif A" à "D") avec leurs matchs/scores et leur classement 1-2-3-4, et un tableau visuel type bracket pour les 8 barrages de qualification. En bas de page, un bloc **"Les qualifiés pour le Main Draw"** affiche une carte ✅ par équipe qualifiée, au fur et à mesure que les Barrages 5 à 8 sont joués. Apparaît dans le bandeau juste après "Équipes". |
| **Main Draw** (page d'accueil) | `index.html` | Deux sous-onglets : **Poule** (les 4 poules A/B/C/D du tournoi principal, avec pour chacune la liste des équipes, puis deux blocs repliés par défaut : **"Matchs et résultats"** et **"Classement"** — rang, victoires, défaites, ratio de points, tête de série) et **Phases Finales** (le tableau à élimination directe en dessin : barrages → quarts → demies → finale + petite finale, avec un podium en dessous une fois le tournoi terminé) — toujours le tableau du tournoi principal, identique quelle que soit la formule choisie. *(Avant le 09/10/2026, Poules et Phases finales étaient deux pages séparées.)* |
| **Ordre des matchs** | `ordre-des-matchs.html` | L'ordre de passage des matchs **terrain par terrain**, avec l'horaire prévu (voir section 9) — pratique à afficher/imprimer le jour J pour savoir qui joue où et dans quel ordre. Pour la formule "12 équipes, qualifs 16", deux onglets apparaissent en haut : **Qualif (Samedi)** et **Main-draw (Dimanche)**. |
| **Suivi d'équipe** | `suivi.html` | Un champ de recherche : on tape un nom ou prénom de joueur (2 lettres minimum, accents ignorés), on choisit sa paire dans la liste, et la page affiche **tous ses matchs dans l'ordre chronologique** (samedi avant dimanche) : horaire, terrain, adversaire, score, et un badge **Gagné / Perdu / À venir**. Chaque match est un lien qui ouvre "Ordre des matchs" directement sur la bonne ligne (dépliée et surlignée). Si l'adversaire n'est pas encore connu, la page dit d'où il viendra (ex : "vs vainqueur de Barrage 2"), et ce texte est lui aussi cliquable. Seuls les matchs qui existent déjà en base apparaissent (pas de projection des tours suivants). |
| **Palmarès** | `palmares.html` | La liste des tournois passés, chacun dépliable pour revoir son tableau des phases finales avec tous les scores (voir section 5) |

Les pages **Équipes**, **Main Draw** et **Qualifs** ont un sélecteur **Hommes / Femmes** en haut, pour basculer entre les deux catégories — ce sélecteur est partagé par leurs sous-onglets respectifs. La page **Ordre des matchs** n'a pas ce sélecteur : elle affiche les 4 terrains d'un coup, chacun dédié à une seule catégorie (voir section 9). **Suivi d'équipe** non plus : la catégorie découle de l'équipe choisie. La page **Palmarès** a un sélecteur Hommes/Femmes **par tournoi déplié** (pas un seul sélecteur global en haut de page), puisqu'elle peut afficher plusieurs tournois à la fois.

**Mise à jour automatique** : les pages Équipes, Qualifs, Main Draw, Ordre des matchs et Suivi d'équipe se mettent à jour **toutes seules** — un score saisi apparaît en 30 secondes maximum (une correction de score, en 5 minutes maximum), sans recharger. Les blocs dépliés restent dépliés, et le tableau garde sa position de défilement. Rien ne tourne quand l'onglet est caché ou le téléphone en veille ; la page se remet à jour dès qu'on y revient. (Le Palmarès, figé par nature, et l'admin ne sont pas concernés.)

**Avant même que les poules soient terminées**, le tableau des phases finales affiche déjà les croisements connus à l'avance (ex: "2e Poule C" contre "3e Poule B" pour un barrage, "1er Poule A" pour un quart) — ces croisements sont fixés par le format du tournoi, indépendamment des résultats. Le reste (ex: "vainqueur du quart 1") s'affiche juste comme "TBD" tant que ce n'est pas joué, pour ne pas surcharger l'affichage avec une évidence. La page **Qualifs** fait pareil pour ses propres barrages, mais avec un libellé plus parlant : "Vainqueur du Barrage 2" plutôt qu'un "TBD" générique, pour que les joueurs sachent quel match suivre (voir section 4bis).

Le site est pensé pour être consulté sur téléphone. Seule exception : le tableau des phases finales est volontairement large et pixel-exact (pour bien tracer les lignes de connexion) — sur un petit écran, il faut le faire défiler horizontalement avec le doigt pour tout voir, il commence toujours affiché depuis la gauche (les barrages).

### Partie admin (compte requis)

| Page | Fichier | Rôle |
|---|---|---|
| **Connexion** | `admin.html` | Se connecter, ou créer un nouveau compte (voir section 6) |
| **Gestion du tournoi** | `gestion.html` | Tout le pilotage du tournoi (voir section 4 et 4bis) |

**Comment y accéder** : sur toutes les pages, une fois connecté avec un rôle (admin ou scorer), le lien texte "Gestion du tournoi" du bandeau du haut est remplacé par une icône **⚙**, tout en haut à droite à côté de "Palmarès". Passer la souris dessus déroule un petit menu avec trois destinations : **"Gestion du tournoi"** (ouvre `gestion.html`, sur la vue par défaut), **"Amélioration du site"** (ouvre `gestion.html#feedback`, la boîte à idées — voir section 13) et **"Connexion"** (ouvre `gestion.html#compte`, directement sur le compte/les rôles). Ces trois vues sont trois "sections" de la même page `gestion.html`, choisies d'après la fin de l'adresse (`#feedback`, `#compte`, ou rien). Le menu se referme tout seul dès que la souris s'en va — pas besoin de cliquer ailleurs. Un visiteur non connecté (ou un compte sans rôle) voit juste "Connexion" en texte, comme avant, qui mène vers `admin.html`.

---

## 4. Les onglets de "Gestion du tournoi"

Une fois sur `gestion.html` (via l'icône ⚙ → "Gestion du tournoi"), il y a 4 onglets. **"Formule"** est toujours visible pour un admin ; les 3 autres n'apparaissent **qu'une fois une formule choisie** pour le tournoi (voir section 4bis). Un scorer ne voit que "Matchs & Résultats" (voir section 6). Chaque onglet (sauf Formule) a son propre sélecteur Hommes/Femmes, partagé entre eux :

### Onglet "Formule"
Voir section 4bis — c'est le premier onglet, et le passage obligé avant tout le reste. Une fois la formule choisie, un bloc **"Horaires"** apparaît en dessous pour régler l'heure de début et la durée des matchs, ou masquer les horaires (voir section 9).

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

**Corriger ou effacer un score** :
- **Corriger** : retaper le score et "Enregistrer". Si le vainqueur change, l'équipe placée au tour suivant est remplacée automatiquement. Si le match n'est plus tranché (ex : on ne garde qu'un set), il repasse "à venir" et sa place au tour suivant est vidée. Un tie-break devenu inutile (correction d'un 1-1 en 2-0) est supprimé.
- **Effacer** : vider tous les champs du match puis "Enregistrer" **supprime** le score et remet le match "à venir", en défaisant l'avancée au tour suivant.
- Dans les deux cas, si le tour suivant a **déjà été joué** avec l'équipe concernée, le site bloque et affiche un message : il faut d'abord effacer le score de ce match suivant, puis remonter le tableau pas à pas.

**Places pas encore connues** : tant qu'une équipe n'est pas connue, la ligne de match indique d'où elle viendra ("2e Poule C", "Vainqueur Barrage 2", "Perdant Demi 1"...).

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

**Aperçu des poules du Maindraw avant même le début des qualifications** : la page publique Main Draw, sous-onglet "Poule" (section 3), affiche un aperçu dès que 24 équipes sont inscrites, sans attendre que les qualifications soient jouées ni même générées. Les équipes "direct Maindraw" dont les points dépassent la meilleure équipe de qualif sont certaines de leur rang final (aucune qualifiée ne pourra jamais les dépasser au classement final) et apparaissent donc déjà dans leur poule A/B/C/D. Les 4 slots qualifiés affichent "TBD". Une équipe "direct Maindraw" placée par wild card (points inférieurs ou égaux à une équipe de qualif) a un rang final incertain — elle n'est pas placée dans une poule, mais listée à part ("En attente de confirmation de poule") jusqu'à la fin des qualifications.

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

1. **Visiteur** (personne connectée sans rôle, ou pas connectée du tout) : peut seulement **regarder** les pages publiques (Équipes, Qualifs, Main Draw, Ordre des matchs, Suivi d'équipe, Palmarès). Ne peut rien modifier. Un compte créé mais sans rôle voit exactement la même chose qu'un simple visiteur (juste l'onglet "Connexion" en plus, avec son email et un bouton pour se déconnecter — accessible via l'icône ⚙).
2. **Scorer** : en plus, peut **saisir les scores** des matchs (onglet "Matchs & Résultats" uniquement — y compris les scores de qualification). Ne voit pas les onglets "Formule", "Inscription" ni "Têtes de série & Poules". Peut écrire dans la boîte à idées "Amélioration du site", mais pas relire les messages.
3. **Admin** : accès à tout — formule, inscriptions, poules, scores, sauvegarde dans le Palmarès, lecture/suppression des messages de la boîte à idées, et gestion des rôles des autres comptes.

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

Ton compte (Gabriel) a un statut à part, codé en dur **dans la base de données uniquement** (pas un rôle comme les autres — voir `assign_role`/`remove_role`/`delete_account`/`delete_tournament_archive`/`owner_email` dans le SQL Supabase si tu dois le retrouver un jour). Son adresse email n'est volontairement écrite ni dans le code du site ni dans ce guide, qui sont publics sur GitHub : le site la demande à la fonction SQL `owner_email()`, qui ne la donne qu'à un admin connecté.

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

- **`teams`** : les équipes inscrites (`name` = "NOM1/NOM2", `player1_nom`/`player1_prenom`/`player2_nom`/`player2_prenom`, `points` de la paire, `category`, `pool_id` = poule du Maindraw assignée, `seed` = classement tête de série manuel, vide tant qu'aucun ajustement n'a été fait)
- **`pools`** : les 4 poules (A/B/C/D) par catégorie, **du tournoi principal (Maindraw) uniquement** — les poules de qualification (formule "12 équipes, qualifs 16") ne sont pas des lignes de cette table ; elles n'existent que sous forme de matchs (voir ci-dessous), regroupés par lettre dans leur `slot`
- **`matches`** : tous les matchs — de poule, barrages, quarts, demies, petite finale, finale (une colonne `phase` dit lequel, une colonne `category` dit Hommes ou Femmes). Pour la formule "12 équipes, qualifs 16", trois valeurs de `phase` supplémentaires existent : `qualif_poule` (poules brésiliennes), `qualif_barrage1` et `qualif_barrage2` (les 2 tours de barrages de qualif) — leur `slot` encode la poule/le numéro de barrage (ex: `qA-r1-1`, `qb5`). Les matchs du tableau final ont aussi un `slot` fixe (`barrage-1`…`barrage-4`, `qf-1`…`qf-4`, `sf-1`, `sf-2`, `petite-finale`, `finale`) ; les matchs de poule n'en ont pas (ils sont rattachés à leur poule par `pool_id`, et leur ordre de jeu = leur ordre de création). Une colonne `status` vaut `a_venir` ou `termine`. ⚠️ Un même `slot` existe une fois **par catégorie** : toute requête par slot doit aussi filtrer sur `category`
- **`sets`** : les scores de chaque set joué, liés à un match. Une contrainte d'unicité sur (`match_id`, `set_number`) empêche qu'un même set soit enregistré deux fois par erreur (ex: double-clic sur "Enregistrer")
- **`profiles`** : qui a quel rôle (admin/scorer) — lié aux comptes de connexion
- **`signup_codes`** : les deux codes d'inscription automatique (admin/scorer), modifiables depuis l'onglet Connexion
- **`tournament_archives`** : les tournois sauvegardés dans le Palmarès (nom, mois, année, et une colonne `data` qui contient une copie complète et figée des équipes + du tableau des phases finales des deux catégories, au format JSON) — voir section 5
- **`tournament_formats`** : une seule ligne (`id = 1`), avec la formule active du tournoi en cours (`format` = `"12"`, `"16"`, ou `"12-quali16"`, voir section 4bis) et les réglages d'horaires (`show_timing`, `saturday_start`, `sunday_start`, `duration_1x21`, `duration_2x15`, `duration_2x21`, voir section 9). Lisible par tout le monde (public), modifiable uniquement par un admin.
- **`site_feedback`** : les messages de la boîte à idées "Amélioration du site" (`message`, `author_email`, date). Un admin ou un scorer peut en ajouter ; seuls les admins peuvent les lire et les supprimer (règles RLS côté Supabase).

Fonctions SQL (RPC) appelées par le site : `list_all_accounts`, `assign_role`, `remove_role`, `delete_account`, `claim_role_with_code` (code d'inscription), `delete_tournament_archive`, `owner_email` (renvoie l'email du compte Propriétaire, seulement à un admin connecté). Plus le déclencheur `auto_confirm_email_trigger` (voir section 12). Le code SQL lui-même n'est **pas** dans le dépôt GitHub : il n'existe que dans Supabase.

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
- **Classement d'une poule (Maindraw)** : d'abord par nombre de victoires. En cas d'égalité de victoires entre plusieurs équipes (2 équipes à égalité, ou une "triangulaire" à 3 équipes dans une poule de 4), le départage se fait dans cet ordre : 1) le **ratio de points** (points marqués ÷ points encaissés, colonne "Ratio" — pas une différence), calculé **uniquement sur les matchs joués entre les équipes à égalité** (ignore les scores face à l'équipe hors du groupe) ; 2) si toujours égal, le ratio de points face à la ou les équipes **hors du groupe** ; 3) si toujours égal, le rang de tête de série. Cette logique est appliquée à l'identique côté public (poules) et côté admin (génération des phases finales), pour que les deux classements affichés concordent toujours. (Les poules de qualif, en poule brésilienne, n'ont pas besoin de ce départage : le classement 1-2-3-4 découle directement des résultats du tour 2, toujours tranché.)
- **Barrages (Maindraw)** : les 2èmes et 3èmes de poule s'affrontent (jamais deux équipes de la même poule) — Barrage 1 : 2e Poule C vs 3e Poule B ; Barrage 2 : 2e Poule B vs 3e Poule C ; Barrage 3 : 2e Poule D vs 3e Poule A ; Barrage 4 : 2e Poule A vs 3e Poule D. Les vainqueurs rejoignent les 1ers de poule en quarts — le vainqueur du Barrage 2 (2e B) affronte le 1er de Poule A, le vainqueur du Barrage 1 (2e C) affronte le 1er de Poule D, le vainqueur du Barrage 4 (2e A) affronte le 1er de Poule B, le vainqueur du Barrage 3 (2e D) affronte le 1er de Poule C. Le tableau est conçu pour que, si les têtes de série se confirment, on ait tête de série 1 contre 4, et 2 contre 3 en demies.
- **Petite finale** : les deux équipes battues en demies s'affrontent pour la 3ᵉ place, en parallèle de la finale.

---

## 9. L'ordre des matchs par terrain

La page publique **Ordre des matchs** (`ordre-des-matchs.html`, fichier `js/ordre-des-matchs.js`) répond à une question très concrète le jour J : *"sur quel terrain, à quelle heure, et dans quel ordre je joue ?"*. Elle affiche les 4 terrains côte à côte, chacun avec sa liste de matchs dans l'ordre de passage, et (si l'admin l'a activé) **l'horaire prévu affiché en petit** à côté de chaque match. Ces horaires sont prévus à l'avance : si le tournoi prend du retard, ils ne bougent pas.

**Formule "12 équipes, qualifs 16"** : deux onglets apparaissent en haut de la page — **"Qualif (Samedi)"** et **"Main-draw (Dimanche)"** — pour séparer les deux journées, chacune avec son propre planning (voir plus bas). Sans cette formule, les onglets n'apparaissent pas et la page garde son comportement habituel (juste le Main-draw, sans onglet).

### Répartition des terrains par catégorie

Chaque terrain affiche son **Programme** (bloc repliable) : matchs de poule puis phases finales, dans l'ordre horaire.

Il y a 4 terrains, dédiés en dur à une catégorie chacun :

| Terrain | Catégorie |
|---|---|
| 1 | Femmes |
| 2 | Hommes |
| 3 | Hommes |
| 4 | Femmes |

Chaque catégorie utilise donc 2 terrains en parallèle, indépendamment de l'autre catégorie — mais suit le **même planning** qu'elle (défini une seule fois dans `js/tournoi-commun.js` : `maindrawScheduleRows`/`qualifScheduleRows`, appliqué identiquement aux deux catégories sur leurs propres terrains, et réutilisé par "Suivi d'équipe").

### Les horaires : calculés, et réglables par l'admin

L'**ordre** de passage est fixe (voir plus bas). Les **heures**, elles, sont calculées à partir des réglages de l'onglet **Formule → Horaires** :

- **Afficher les horaires** (case à cocher) : décochée, "Ordre des matchs" et "Suivi d'équipe" n'affichent plus que l'ordre de passage, sans heure (Suivi d'équipe indique juste "Samedi"/"Dimanche" s'il y a des qualifs).
- **Début samedi** (formule avec qualifs uniquement) et **Début dimanche** (ou "Début du tournoi" pour les formules sur une seule journée).
- **Durée d'un match**, selon son format, changement de terrain compris : **1 set à 21** (poules du Maindraw), **2 sets à 15** (qualifs, barrages, et tout le tableau final en formule "12 équipes, qualifs 16"), **2 sets à 21** (quarts, demies, finales des formules "12" et "16" — champ masqué en formule qualifs, où il ne sert pas).

Règle de calcul : chaque ligne du planning (les 2 matchs joués en même temps sur les 2 terrains d'une catégorie) commence quand la précédente se termine, **sans pause**. Le formulaire affiche en direct la **fin prévue** de chaque journée. Les réglages sont stockés dans `tournament_formats` (voir section 7) ; tant qu'ils ne sont pas enregistrés, les valeurs par défaut s'appliquent : **9h00**, **30 min** (1 set à 21), **45 min** (2 sets à 15), **60 min** (2 sets à 21).

Les heures données dans les tableaux ci-dessous correspondent à ces valeurs par défaut.

### Dimanche — Main-draw, poules de 3 (formules "12 équipes" et "12 équipes, qualifs 16")

Avec des poules de 3 équipes, un même pool n'a jamais 2 matchs simultanés **en son sein** (il n'y a qu'1 match par tour, pas 2) : la simultanéité vient de **2 poules différentes** jouées en même temps, chacune sur un des 2 terrains de la catégorie. Planning (identique Hommes et Femmes, sur leurs terrains respectifs) :

| Heure (formule 12) | Heure (formule qualifs) | Terrain 1 (1er de la paire) | Terrain 2 (2e de la paire) |
|---|---|---|---|
| 9h00 | 9h00 | Poule B · Tour 1 | Poule C · Tour 1 |
| 9h30 | 9h30 | Poule A · Tour 1 | Poule D · Tour 1 |
| 10h00 | 10h00 | Poule B · Tour 2 | Poule C · Tour 2 |
| 10h30 | 10h30 | Poule A · Tour 2 | Poule D · Tour 2 |
| 11h00 | 11h00 | Poule B · Tour 3 | Poule C · Tour 3 |
| 11h30 | 11h30 | Poule A · Tour 3 | Poule D · Tour 3 |
| 12h00 | 12h00 | Barrage 1 | Barrage 2 |
| 12h45 | 12h45 | Barrage 3 | Barrage 4 |
| 13h30 | 13h30 | Quart 1 (1er Poule A) | Quart 2 (1er Poule D) |
| 14h30 | 14h15 | Quart 3 (1er Poule B) | Quart 4 (1er Poule C) |
| 15h30 | 15h00 | Demi 1 | Demi 2 |
| 16h30 | 15h45 | Finale | Petite finale |
| *fin 17h30* | *fin 16h30* | | |

Les Poules B et C tournent ensemble (chaque terrain de la catégorie alterne entre les deux), les Poules A et D tournent ensemble en décalé d'une demi-heure. Barrage 1+2 et Quart 1+2 vont ensemble (ils alimentent la Demi 1, voir section 8) ; Barrage 3+4 et Quart 3+4 vont ensemble (Demi 2). Tant qu'un match n'a pas encore d'équipes connues, la page affiche les croisements prévus par le format (ex: "2e Poule C" / "3e Poule B" pour le Barrage 1) — mêmes libellés que l'onglet Phases Finales.

### Main-draw, poules de 4 (formule "16 équipes")

Une poule de 4 a 2 matchs simultanés à chaque tour (6 matchs = 3 tours de 2) : comme le samedi des qualifs, **une poule occupe les 2 terrains de sa catégorie** pendant un tour, dans l'ordre **A, B, C, D**, puis on recommence pour le tour suivant. Puis le tableau final, comme ci-dessus.

| Heure | Les 2 terrains de la catégorie |
|---|---|
| 9h00 · 9h30 · 10h00 · 10h30 | Poules A, B, C, D · Tour 1 (1v4 et 2v3) |
| 11h00 · 11h30 · 12h00 · 12h30 | Poules A, B, C, D · Tour 2 (1v3 et 2v4) |
| 13h00 · 13h30 · 14h00 · 14h30 | Poules A, B, C, D · Tour 3 (1v2 et 3v4) |
| 15h00 → 19h30 | Barrages (×2), quarts (×2), demies, finales — même ordre que ci-dessus |
| *fin 20h30* | |

### Samedi — Qualifications (poules de 4, "poule brésilienne")

Ici, contrairement au Main-draw, une poule de qualif (4 équipes) **a bien** 2 matchs simultanés en son sein à chaque tour (1v4+2v3, puis vainqueurs entre eux/perdants entre eux — voir section 4bis) : une seule poule occupe donc les 2 terrains de la catégorie à la fois. Planning :

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
| *fin 18h00* | | |

Ordre de passage des poules de qualif : **B, D, A, C** (aux deux tours) — différent de l'ordre alphabétique, choix arbitraire pour varier l'enchaînement comme pour le Main-draw. Les barrages de qualif sont groupés par poules concernées : Barrage qualif 2 (2B-3D) et Barrage qualif 4 (2D-3B) ensemble (tous deux B/D) ; Barrage qualif 1 (2A-3C) et Barrage qualif 3 (2C-3A) ensemble (tous deux A/C) ; puis le 2e tour reprend le même regroupement (B2→B5 et B4→B7 ensemble, B1→B6 et B3→B8 ensemble) — les croisements eux-mêmes (qui affronte qui) restent ceux définis en section 4bis/8, seul le regroupement par terrain/horaire change.

**Lien depuis "Suivi d'équipe"** : chaque ligne de match porte un identifiant invisible (`slot:<catégorie>:<slot>` pour les matchs à slot fixe — tableau final, poules et barrages de qualif —, `match:<id>` pour les matchs de poule du Maindraw). Une adresse du type `ordre-des-matchs.html?day=maindraw&anchor=slot:Hommes:barrage-2` ouvre le bon onglet, déplie le terrain concerné, fait défiler jusqu'au match et le surligne quelques secondes.

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

⚠️ **Piège du cache navigateur** : contrairement à `serve.py` en local (qui désactive volontairement le cache), GitHub Pages, lui, laisse les navigateurs mettre les fichiers en cache normalement. Du coup, chaque fichier CSS/JS est chargé avec un numéro de version dans son adresse (ex : `style.css?v=69`, `gestion.js?v=72`). `style.css` et `nav.js` sont chargés par **toutes** les pages HTML : il faut donc monter leur numéro dans les 8 fichiers HTML d'un coup — **à chaque modification d'un de ces fichiers, il faut augmenter ce numéro d'un cran dans le(s) fichier(s) HTML qui le chargent**, sinon les visiteurs continuent de voir l'ancienne version pendant un moment. Si tu demandes une modification à Claude, c'est normalement fait automatiquement à chaque fois — mais si un changement ne semble "pas s'appliquer" en ligne, c'est le premier réflexe à vérifier.

### Organisation du code

Pas de framework ni d'étape de build : chaque page HTML charge, dans cet ordre :
1. la librairie Supabase (depuis un CDN, **version fixée** : `supabase-js@2.119.0` — à monter volontairement, pas automatiquement) ;
2. `js/supabaseClient.js` (adresse + clé publique du projet Supabase) ;
3. **`js/tournoi-commun.js`** — les règles du tournoi partagées par toutes les pages (voir plus bas) ;
4. `js/nav.js` (bandeau commun : lien Qualifs, menu ⚙/Connexion) ;
5. le ou les scripts propres à la page.

| Fichier JS | Utilisé par | Rôle |
|---|---|---|
| `tournoi-commun.js` | toutes les pages | **La source de vérité** : croisements du tableau (`MAINDRAW_BRACKET_ENTRANTS`, `QUALIF_BARRAGE_ENTRANTS`), propagation des vainqueurs (`BRACKET_PROGRESSION`), classement de poule (`computePoolStandings`) et de poule brésilienne, vainqueur d'un match (`matchResult`), terrains, plannings et calcul des horaires (`GENDER_TERRAINS`, `maindrawScheduleRows`, `qualifScheduleRows`, `buildSchedules`), ordre des têtes de série, lecture du compte Propriétaire (`fetchOwnerEmail`), rafraîchissement automatique des pages publiques (`onAutoRefresh`), petits outils d'affichage |
| `gestion.js` | `gestion.html` | Tout l'admin : formule, inscriptions, import JSON, têtes de série, génération des poules/qualifs/tableau, saisie des scores, sauvegarde Palmarès, comptes/rôles, boîte à idées |
| `login.js` | `admin.html` | Connexion et création de compte (avec code optionnel) |
| `equipes.js` | `equipes.html` | Page Équipes |
| `qualifs.js` | `qualifs.html` | Page Qualifs (poules brésiliennes, bracket des barrages, qualifiés) |
| `poules.js`, `phases-finales.js`, `bracket-render.js`, `maindraw-tabs.js` | `index.html` | Main Draw : poules + classement, tableau final, bascule entre les 2 sous-onglets |
| `bracket-render.js`, `palmares.js` | `palmares.html` | Le dessin du tableau final est partagé avec le Main Draw |
| `ordre-des-matchs.js` | `ordre-des-matchs.html` | Plannings par terrain |
| `suivi.js` | `suivi.html` | Suivi d'équipe |

**Règle d'or** : une règle du tournoi (un croisement, un horaire, un critère de départage...) ne s'écrit qu'**une seule fois**, dans `tournoi-commun.js`. Les autres fichiers ne font que l'utiliser — par exemple, changer un croisement de barrage dans `MAINDRAW_BRACKET_ENTRANTS` change à la fois la génération du tableau côté admin ET tous les libellés "2e Poule C" des pages publiques. Seuls les **libellés** restent propres à chaque page (ex : "TBD" dans le dessin du tableau, "Vainqueur du Barrage 2" sur la page Qualifs).

⚠️ Comme tous les scripts d'une page partagent le même espace de noms, un nom défini dans `tournoi-commun.js` ne doit pas être redéfini (`const`/`let`) dans un autre fichier JS : la page planterait au chargement.

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

**Inversion des terrains par catégorie** (08/10/2026) : Hommes et Femmes ont échangé leurs terrains — Hommes joue maintenant sur 2 et 3, Femmes sur 1 et 4 (c'était l'inverse). Un seul endroit à changer : `GENDER_TERRAINS`/`COURTS` (aujourd'hui dans js/tournoi-commun.js), le reste du site ne fait jamais référence à un numéro de terrain précis.

**Correction du départage de poule (différence → ratio de points)** (14/10/2026) : suite à un souci constaté pendant un tournoi, le départage en cas d'égalité de victoires (2 équipes à égalité, ou "triangulaire" à 3) utilisait une **différence** de points (marqués − encaissés), alors que la règle du tournoi est un **ratio** (marqués ÷ encaissés). Corrigé dans `computePoolStandings` (dupliqué dans js/poules.js et js/gestion.js — ce dernier sert à déterminer le 1er/2e/3e de chaque poule pour générer les barrages, donc le bug pouvait réellement mal placer une équipe dans le tableau final). Le ratio est comparé par produit en croix (`bFor * aAgainst` vs `aFor * bAgainst`) plutôt que par division, pour ne jamais tomber sur une division par zéro si une équipe n'a encaissé aucun point. La colonne "Diff" de la page publique Poules est devenue "Ratio" (affiché avec 2 décimales, "∞" si 0 point encaissé).

**Page "Suivi d'équipe"** (08-09/10/2026) : nouvelle page publique pour qu'un joueur retrouve tous ses matchs sans fouiller les poules et le tableau : recherche par nom, liste chronologique sur les 2 jours avec horaire/terrain/score/badge Gagné-Perdu, et liens directs vers la ligne correspondante dans "Ordre des matchs" (voir sections 3 et 9). À l'époque, les plannings et la table de progression du tableau y avaient été **recopiés** depuis `ordre-des-matchs.js`/`gestion.js` (regroupés depuis dans `tournoi-commun.js`, voir plus bas). Correctif associé : les liens incluent la catégorie, car un slot comme `barrage-2` existe chez les Hommes ET chez les Femmes.

**Page publique "Équipes"** (09/10/2026) : liste des équipes inscrites avec tête de série et points, scindée Direct Maindraw / Qualifications en formule "12 équipes, qualifs 16". Devient le premier lien du bandeau.

**Barrages de qualif en bracket visuel + aperçu du Maindraw** (09/10/2026) : la page Qualifs passe en sous-onglets Poules/Barrages, les barrages de qualif sont dessinés comme le tableau final (2 colonnes de 4 matchs reliés 1 pour 1), et le Main Draw affiche un aperçu des poules avant même la fin des qualifs (voir fin de section 4bis).

**Fusion Poules + Phases finales dans "Main Draw"** (09/10/2026) : les deux pages publiques séparées (`index.html` pour les poules, `phases-finales.html`) sont devenues une seule page "Main Draw" à deux sous-onglets, pour alléger le bandeau. `phases-finales.html` n'existe plus.

**Mise à jour du guide** (20/11/2026) : relecture complète du code et remise à niveau de ce fichier — ajout des pages Équipes et Suivi d'équipe, du menu ⚙ à 3 entrées, de la table `site_feedback`, de l'organisation du code (section 11), et de la limite du planning en formule "16 équipes" (section 9).

**Grand nettoyage + corrections de bugs** (20/11/2026) :
- *Code commun* : les règles du tournoi qui existaient en 2 à 5 exemplaires (croisements, propagation, classement de poule, plannings, terrains, ordre des têtes de série...) sont regroupées dans un seul fichier, `js/tournoi-commun.js` (voir section 11). Les croisements sont décrits une seule fois (`MAINDRAW_BRACKET_ENTRANTS`, `QUALIF_BARRAGE_ENTRANTS`) et servent à la fois à générer les matchs et à afficher les libellés. Vérifié avant/après : affichage identique de toutes les pages publiques, classement de poule identique sur 20 000 poules tirées au hasard.
- *Scorer sur l'onglet Formule* : un scorer arrivait sur le contenu de l'onglet "Formule" (seul le bouton de l'onglet était caché) et pouvait cliquer une formule. Il arrive maintenant directement sur "Matchs & Résultats". Et changer de formule enregistre d'abord la nouvelle formule, puis seulement vide les poules — plus de poules effacées si l'enregistrement est refusé.
- *Correction de score* : corriger un 1-1 + tie-break en 2-0 laissait un 3e set "fantôme" en base (le champ caché gardait sa valeur). Corrigé, et une correction qui change le vainqueur (ou rend le match non tranché) met désormais à jour le tour suivant — avec le même blocage que l'effacement si ce tour est déjà joué.
- *Génération des barrages de qualif / du Maindraw / du tableau* : exigent maintenant des matchs **tranchés**, pas juste "avec un score" (un match en 2 sets gagnants avec un seul set saisi passait le contrôle).
- *Départage par tête de série côté admin* : à la génération du tableau final, les équipes n'étaient pas triées par tête de série avant le calcul — avec un classement manuel, le dernier critère de départage pouvait différer de la page publique. Corrigé.
- *Suivi d'équipe* : pour la petite finale, l'adversaire était annoncé "vainqueur de Demi 1" au lieu de "perdant de Demi 1".
- *Menu ⚙* : pouvait apparaître en double (plusieurs événements de connexion traités en parallèle).
- *Divers* : version de la librairie Supabase figée (avant : "dernière version 2.x", qui pouvait changer sans prévenir) ; requêtes des pages lancées en parallèle (chargement plus rapide) ; avertissement explicite quand supprimer une équipe efface les poules/scores de sa catégorie ; confirmation avant de supprimer un message de la boîte à idées ; tableau "Classement" construit sans `innerHTML` (les noms d'équipe sont une saisie libre) ; places inconnues décrites côté admin ("Vainqueur Barrage 2" au lieu de "À déterminer") ; le bloc de chaque terrain dans "Ordre des matchs" s'appelle "Programme" (il contient aussi les phases finales).

**Email du Propriétaire retiré du code public** (20/11/2026) : l'adresse du compte principal était écrite en clair dans le JavaScript du site et dans ce guide, donc lisible par n'importe qui sur GitHub ou dans le navigateur. Elle n'existe plus que côté Supabase : le site appelle la fonction SQL `owner_email()`, qui ne la renvoie qu'à un admin connecté (`null` pour tous les autres). Les vérifications de sécurité, elles, n'ont jamais dépendu du JavaScript (elles sont dans les fonctions SQL).

**Horaires réglables + planning de la formule 16 équipes** (20/11/2026) : les heures de "Ordre des matchs" et "Suivi d'équipe" ne sont plus écrites en dur ; elles sont **calculées** à partir d'un réglage de l'onglet Formule (heure de début de chaque journée, durée d'un match par format : 1 set à 21 / 2 sets à 15 / 2 sets à 21, sans pause), et peuvent être masquées. Décisions prises en discussion : une durée **par format de match** plutôt que par tour (conséquence acceptée : avec les valeurs par défaut, quarts/demies/finales du dimanche ne tombent plus exactement aux heures de l'ancien planning fait main, voir section 9) ; **pas de pause** ; en formule "16 équipes", chaque poule de 4 occupe les 2 terrains de sa catégorie pendant un tour, ordre A, B, C, D (jusque-là cette formule n'avait pas de planning et seuls 3 matchs sur 6 par poule apparaissaient). Correctif au passage : depuis Suivi d'équipe, le lien vers un match de **poule de qualif** ne retrouvait pas sa ligne dans Ordre des matchs.

**Mise à jour automatique des pages publiques** (21/11/2026) : le jour J, un joueur garde la page ouverte sur son téléphone ; jusque-là elle ne montrait que les scores du moment où il l'avait ouverte. Deux options discutées : relecture régulière (choisie) ou "temps réel" Supabase (instantané, mais une requête SQL de plus et des connexions qui se coupent de toute façon quand le téléphone se verrouille). Pour ne pas épuiser le quota d'échange de données de Supabase (recharger toute la page toutes les 30 s sur des dizaines de téléphones aurait pu consommer plusieurs Go par jour de tournoi), la page ne pose toutes les 30 s qu'une question minuscule — le nombre de sets, de matchs, de matchs terminés et d'équipes (`fetchDataSignature`) — et ne recharge tout que si un de ces nombres a changé, ou au moins toutes les 5 minutes (une correction de score ne change aucun compteur). Rien ne tourne quand l'onglet est caché. Les blocs dépliés restent dépliés (`createCollapsibleSection` avec une clé) et le défilement horizontal des tableaux est conservé. En cas d'erreur réseau pendant un rafraîchissement, l'affichage actuel est gardé tel quel.
