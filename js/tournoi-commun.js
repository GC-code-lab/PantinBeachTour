// Règles et outils du tournoi partagés par toutes les pages (admin et publiques).
// Chargé juste après js/supabaseClient.js et avant le script propre à chaque page :
// tout ce qui est défini ici est disponible partout. C'est LA source de vérité pour
// les croisements du tableau, les plannings, le classement de poule, etc. — ne pas
// recopier ces règles dans un autre fichier, les utiliser d'ici.
//
// ⚠️ Fichier chargé comme un <script> classique sur la même page que d'autres :
// un nom défini ici (const/let) ne doit être redéfini dans aucun autre fichier JS.

// Email du compte "Propriétaire" (le seul qui peut supprimer un compte, rétrograder
// un admin ou supprimer un tournoi du Palmarès). Il n'est volontairement PAS écrit
// dans le code du site (public) : la fonction SQL owner_email() ne le renvoie qu'à
// un admin connecté, et null à tout le monde sinon. Ceci ne sert qu'à l'affichage :
// la vraie vérification est refaite côté SQL (assign_role, remove_role,
// delete_account, delete_tournament_archive).
async function fetchOwnerEmail() {
  const { data, error } = await supabaseClient.rpc("owner_email");
  return error ? null : data;
}

const PHASES_MAINDRAW_BRACKET = ["barrage", "quart", "demi", "petite_finale", "finale"];
const PHASES_QUALIF = ["qualif_poule", "qualif_barrage1", "qualif_barrage2"];

// --- Équipes ---

function teamPoints(team) {
  return Number(team.points || 0);
}

// "Jean DUPONT / Paul MARTIN"
function formatTeamDetail(team) {
  return `${team.player1_prenom} ${team.player1_nom} / ${team.player2_prenom} ${team.player2_nom}`;
}

// "Jean D. / Paul M." — version courte pour les lignes de match et le tableau.
function formatTeamShort(team) {
  if (!team) return "?";
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
}

// Tri par points décroissants, puis ordre d'inscription.
function compareByPoints(a, b) {
  const diff = teamPoints(b) - teamPoints(a);
  if (diff !== 0) return diff;
  return new Date(a.created_at) - new Date(b.created_at);
}

// Ordre des têtes de série. `teams` doit arriver trié par seed puis created_at (comme
// le fait chaque requête du site). Tant qu'aucun classement manuel n'a été fait (tous
// les teams.seed à null), l'ordre par défaut vient des points de la paire.
function defaultSeedOrder(teams) {
  const hasManualSeed = teams.some((team) => team.seed != null);
  if (hasManualSeed) return teams;
  return teams.slice().sort(compareByPoints);
}

// --- Matchs et scores ---

// Nombre de sets gagnants pour remporter un match : 1 set pour une poule du
// Maindraw, 2 sets pour tout le reste (qualifs comprises).
function requiredSetWins(phase) {
  return phase === "poule" ? 1 : 2;
}

// { winnerId, loserId } si le match est tranché, sinon null.
function matchResult(match) {
  const sets = (match && match.sets) || [];
  const needed = requiredSetWins(match ? match.phase : null);
  const wins1 = sets.filter((s) => s.score_team1 > s.score_team2).length;
  const wins2 = sets.filter((s) => s.score_team2 > s.score_team1).length;
  if (wins1 >= needed && wins1 > wins2) return { winnerId: match.team1_id, loserId: match.team2_id };
  if (wins2 >= needed && wins2 > wins1) return { winnerId: match.team2_id, loserId: match.team1_id };
  return null;
}

// "21-18 / 15-21 / 15-12"
function formatSetsScore(sets) {
  return sets
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => `${set.score_team1}-${set.score_team2}`)
    .join(" / ");
}

// --- Croisements du tableau ---

// Qui entre dans chaque match "à place fixe" depuis un classement de poule
// ({ rank: 2, pool: "C" } = 2e de la Poule C). `null` = place remplie par le
// vainqueur d'un autre match (voir BRACKET_PROGRESSION). Sert à la fois à GÉNÉRER
// les matchs (js/gestion.js) et à AFFICHER le croisement tant que l'équipe réelle
// n'est pas connue (toutes les pages publiques).
const MAINDRAW_BRACKET_ENTRANTS = {
  "barrage-1": [{ rank: 2, pool: "C" }, { rank: 3, pool: "B" }],
  "barrage-2": [{ rank: 2, pool: "B" }, { rank: 3, pool: "C" }],
  "barrage-3": [{ rank: 2, pool: "D" }, { rank: 3, pool: "A" }],
  "barrage-4": [{ rank: 2, pool: "A" }, { rank: 3, pool: "D" }],
  "qf-1": [{ rank: 1, pool: "A" }, null],
  "qf-2": [{ rank: 1, pool: "D" }, null],
  "qf-3": [{ rank: 1, pool: "B" }, null],
  "qf-4": [{ rank: 1, pool: "C" }, null],
  "sf-1": [null, null],
  "sf-2": [null, null],
  "petite-finale": [null, null],
  finale: [null, null],
};

// Phase de chaque match du tableau final (pour la génération).
const MAINDRAW_BRACKET_PHASES = {
  "barrage-1": "barrage",
  "barrage-2": "barrage",
  "barrage-3": "barrage",
  "barrage-4": "barrage",
  "qf-1": "quart",
  "qf-2": "quart",
  "qf-3": "quart",
  "qf-4": "quart",
  "sf-1": "demi",
  "sf-2": "demi",
  "petite-finale": "petite_finale",
  finale: "finale",
};

// Formule "12-quali16" : barrages de qualification, même principe (Poule = poule de qualif).
const QUALIF_BARRAGE_ENTRANTS = {
  qb1: [{ rank: 2, pool: "A" }, { rank: 3, pool: "C" }],
  qb2: [{ rank: 2, pool: "B" }, { rank: 3, pool: "D" }],
  qb3: [{ rank: 2, pool: "C" }, { rank: 3, pool: "A" }],
  qb4: [{ rank: 2, pool: "D" }, { rank: 3, pool: "B" }],
  qb5: [{ rank: 1, pool: "A" }, null],
  qb6: [{ rank: 1, pool: "B" }, null],
  qb7: [{ rank: 1, pool: "C" }, null],
  qb8: [{ rank: 1, pool: "D" }, null],
};

// "2e Poule C", "1er Poule A"
function entrantLabel(entrant) {
  return `${entrant.rank === 1 ? "1er" : `${entrant.rank}e`} Poule ${entrant.pool}`;
}

// Match gagné (ou perdu, pour les demies) -> place occupée dans le match suivant.
// Le tableau est conçu pour que, si les têtes de série se confirment, on ait
// tête de série 1 contre 4 et 2 contre 3 en demies.
const BRACKET_PROGRESSION = {
  "barrage-1": { winner: { nextSlot: "qf-2", position: "team2_id" } },
  "barrage-2": { winner: { nextSlot: "qf-1", position: "team2_id" } },
  "barrage-3": { winner: { nextSlot: "qf-4", position: "team2_id" } },
  "barrage-4": { winner: { nextSlot: "qf-3", position: "team2_id" } },
  "qf-1": { winner: { nextSlot: "sf-1", position: "team1_id" } },
  "qf-2": { winner: { nextSlot: "sf-1", position: "team2_id" } },
  "qf-3": { winner: { nextSlot: "sf-2", position: "team1_id" } },
  "qf-4": { winner: { nextSlot: "sf-2", position: "team2_id" } },
  "sf-1": {
    winner: { nextSlot: "finale", position: "team1_id" },
    loser: { nextSlot: "petite-finale", position: "team1_id" },
  },
  "sf-2": {
    winner: { nextSlot: "finale", position: "team2_id" },
    loser: { nextSlot: "petite-finale", position: "team2_id" },
  },

  // Formule "12-quali16" : poules de qualif en poule brésilienne (tour 1 = 1v4/2v3,
  // tour 2 = vainqueurs entre eux pour les places 1-2, perdants entre eux pour 3-4),
  // puis 2 tours de barrages de qualif.
  ...Object.fromEntries(
    ["A", "B", "C", "D"].flatMap((letter) => [
      [
        `q${letter}-r1-1`,
        {
          winner: { nextSlot: `q${letter}-r2-w`, position: "team1_id" },
          loser: { nextSlot: `q${letter}-r2-l`, position: "team1_id" },
        },
      ],
      [
        `q${letter}-r1-2`,
        {
          winner: { nextSlot: `q${letter}-r2-w`, position: "team2_id" },
          loser: { nextSlot: `q${letter}-r2-l`, position: "team2_id" },
        },
      ],
    ])
  ),
  qb1: { winner: { nextSlot: "qb6", position: "team2_id" } },
  qb2: { winner: { nextSlot: "qb5", position: "team2_id" } },
  qb3: { winner: { nextSlot: "qb8", position: "team2_id" } },
  qb4: { winner: { nextSlot: "qb7", position: "team2_id" } },
};

// Le match dont le vainqueur (ou le perdant) vient occuper la place `position` de
// `nextSlot` — ex: findSourceSlot("qf-1", "team2_id") renvoie { slot: "barrage-2", outcome: "winner" }.
function findSourceSlot(nextSlot, position) {
  for (const [slot, progression] of Object.entries(BRACKET_PROGRESSION)) {
    for (const outcome of ["winner", "loser"]) {
      const target = progression[outcome];
      if (target && target.nextSlot === nextSlot && target.position === position) {
        return { slot, outcome };
      }
    }
  }
  return null;
}

const SLOT_LABELS = {
  "sf-1": "Demi 1",
  "sf-2": "Demi 2",
  "petite-finale": "Petite finale",
  finale: "Finale",
};

// Nom lisible d'un slot : "Barrage 2", "Quart 1", "Barrage qualif 5", "Poule Qualif B"...
function slotLabel(slot) {
  if (SLOT_LABELS[slot]) return SLOT_LABELS[slot];
  if (slot.startsWith("barrage-")) return `Barrage ${slot.split("-")[1]}`;
  if (slot.startsWith("qf-")) return `Quart ${slot.split("-")[1]}`;
  if (slot.startsWith("qb")) return `Barrage qualif ${slot.slice(2)}`;
  const qualifPool = slot.match(/^q([A-D])-r(\d)-(.+)$/);
  if (qualifPool) {
    const [, letter, round, part] = qualifPool;
    if (round === "1") return `Poule Qualif ${letter}`;
    return `Poule Qualif ${letter} (${part === "w" ? "vainqueurs" : "perdants"})`;
  }
  return slot;
}

// Texte affiché pour une place encore inconnue d'un match à slot fixe :
// "2e Poule C" si elle vient d'un classement de poule, sinon "Vainqueur Barrage 2"
// (ou "Perdant Demi 1") d'après BRACKET_PROGRESSION. `options.sourceLabel` permet à
// une page de choisir son propre libellé du match source.
function slotPlaceholder(slot, index, options = {}) {
  const entrants = MAINDRAW_BRACKET_ENTRANTS[slot] || QUALIF_BARRAGE_ENTRANTS[slot];
  const entrant = entrants && entrants[index];
  if (entrant) return entrantLabel(entrant);

  const source = findSourceSlot(slot, index === 0 ? "team1_id" : "team2_id");
  if (!source) return "À déterminer";
  const label = options.sourceLabel ? options.sourceLabel(source.slot) : slotLabel(source.slot);
  return `${source.outcome === "winner" ? "Vainqueur" : "Perdant"} ${label}`;
}

// --- Terrains et plannings (page "Ordre des matchs" et "Suivi d'équipe") ---

// 4 terrains. Quand Hommes et Femmes jouent le même jour, chaque catégorie a ses 2
// terrains (GENDER_TERRAINS) et les deux suivent le MÊME planning : la 1re colonne
// d'un planning va sur le 1er terrain de la catégorie, la 2e sur le 2e. Quand chaque
// catégorie a sa journée (option "un jour par catégorie"), elle a les 4 terrains.
const GENDER_TERRAINS = { Hommes: [2, 3], Femmes: [1, 4] };
const ALL_TERRAINS = [1, 2, 3, 4];
const CATEGORIES = ["Hommes", "Femmes"];

function otherCategory(category) {
  return category === "Hommes" ? "Femmes" : "Hommes";
}

// Terrains d'une journée : { terrain, category, terrainIndex } — `terrainIndex` =
// colonne du planning jouée sur ce terrain (voir scheduleCell).
function sharedCourts() {
  return ALL_TERRAINS.map((terrain) => {
    const category = CATEGORIES.find((c) => GENDER_TERRAINS[c].includes(terrain));
    return { terrain, category, terrainIndex: GENDER_TERRAINS[category].indexOf(terrain) };
  });
}

function soloCourts(category) {
  return ALL_TERRAINS.map((terrain, terrainIndex) => ({ terrain, category, terrainIndex }));
}

// --- Plannings ---
// Un planning = la liste ordonnée de ce qui se joue en même temps sur les terrains
// d'une catégorie (une "ligne", 2 ou 4 colonnes selon le nombre de terrains). L'ORDRE
// est fixe ; les HEURES sont calculées à partir des réglages de la table
// tournament_formats (heure de début de chaque journée et durée d'un match selon son
// format) — voir computeScheduleTimes.
//
// Types de ligne :
// - poolMatch  : poules de 3 DIFFÉRENTES en parallèle (`pools`, une par terrain),
//                1 match chacune (le tour `round`).
// - poolRound  : poules de 4 (`pools`), chacune sur 2 terrains, ses 2 matchs du tour `round`.
// - qualifRound: 1 poule de qualif (brésilienne) sur les 2 terrains, son tour `round`.
// - slots      : matchs à slot fixe en parallèle (tableau final, barrages de qualif).
//                Moins de slots que de terrains : les terrains en trop sont libres.

const POOL_LETTERS = ["A", "B", "C", "D"];

const BRACKET_SCHEDULE_ROWS = [
  { kind: "slots", slots: ["barrage-1", "barrage-2"] },
  { kind: "slots", slots: ["barrage-3", "barrage-4"] },
  { kind: "slots", slots: ["qf-1", "qf-2"] },
  { kind: "slots", slots: ["qf-3", "qf-4"] },
  { kind: "slots", slots: ["sf-1", "sf-2"] },
  { kind: "slots", slots: ["finale", "petite-finale"] },
];

const BRACKET_SCHEDULE_ROWS_4_COURTS = [
  { kind: "slots", slots: ["barrage-1", "barrage-2", "barrage-3", "barrage-4"] },
  { kind: "slots", slots: ["qf-1", "qf-2", "qf-3", "qf-4"] },
  { kind: "slots", slots: ["sf-1", "sf-2"] },
  { kind: "slots", slots: ["finale", "petite-finale"] },
];

// Main-draw d'une catégorie, sur `courtCount` terrains (2 ou 4).
// Sur 2 terrains — poules de 3 (formules "12" et "12-quali16") : 1 seul match par
// poule et par tour, donc 2 poules différentes en parallèle (B+C, puis A+D). Poules de
// 4 (formule "16") : une poule occupe les 2 terrains pendant un tour, dans l'ordre
// A, B, C, D, puis tour suivant. Ensuite le tableau, groupé par chemin (barrages 1+2
// et quarts 1+2 alimentent la demi 1, 3+4 la demi 2).
// Sur 4 terrains — poules de 3 : les 4 poules en même temps. Poules de 4 : A+B puis
// C+D à chaque tour. Puis les 4 barrages, les 4 quarts, les demies, les finales.
function maindrawScheduleRows(format, courtCount = 2) {
  const poolRows = [];
  for (let round = 0; round < 3; round++) {
    if (format === "16") {
      const groups = courtCount === 4 ? [["A", "B"], ["C", "D"]] : POOL_LETTERS.map((letter) => [letter]);
      groups.forEach((letters) => poolRows.push({ kind: "poolRound", pools: letters.map((l) => `Poule ${l}`), round }));
    } else {
      const groups = courtCount === 4 ? [["A", "B", "C", "D"]] : [["B", "C"], ["A", "D"]];
      groups.forEach((letters) => poolRows.push({ kind: "poolMatch", pools: letters.map((l) => `Poule ${l}`), round }));
    }
  }
  return [...poolRows, ...(courtCount === 4 ? BRACKET_SCHEDULE_ROWS_4_COURTS : BRACKET_SCHEDULE_ROWS)];
}

// Samedi (qualifs, formule "12-quali16") : une poule occupe les 2 terrains à chaque
// tour, ordre de passage B, D, A, C. Puis les barrages de qualif, groupés par poules
// concernées (B/D ensemble, A/C ensemble).
function qualifScheduleRows() {
  const rows = [];
  for (let round = 0; round < 2; round++) {
    ["B", "D", "A", "C"].forEach((letter) => rows.push({ kind: "qualifRound", poolLetter: letter, round }));
  }
  return [
    ...rows,
    { kind: "slots", slots: ["qb2", "qb4"] },
    { kind: "slots", slots: ["qb1", "qb3"] },
    { kind: "slots", slots: ["qb5", "qb7"] },
    { kind: "slots", slots: ["qb6", "qb8"] },
  ];
}

// Les 2 matchs (un par terrain) d'un tour de poule de qualif.
function qualifRoundSlots(letter, round) {
  return round === 0 ? [`q${letter}-r1-1`, `q${letter}-r1-2`] : [`q${letter}-r2-w`, `q${letter}-r2-l`];
}

// Ce qui se joue dans la colonne `terrainIndex` d'une ligne de planning : soit un
// match de poule du Maindraw (repéré par sa poule et son rang parmi les matchs de la
// poule, dans l'ordre de création), soit un match à slot fixe. null = terrain libre.
function scheduleCell(row, terrainIndex) {
  if (row.kind === "poolMatch") {
    const pool = row.pools[terrainIndex];
    return pool ? { poolLabel: pool, matchIndex: row.round, label: `${pool} · Tour ${row.round + 1}` } : null;
  }
  if (row.kind === "poolRound") {
    const pool = row.pools[Math.floor(terrainIndex / 2)];
    if (!pool) return null;
    return { poolLabel: pool, matchIndex: 2 * row.round + (terrainIndex % 2), label: `${pool} · Tour ${row.round + 1}` };
  }
  if (row.kind === "qualifRound") {
    const slot = qualifRoundSlots(row.poolLetter, row.round)[terrainIndex];
    return slot ? { slot, label: `Poule Qualif ${row.poolLetter} · Tour ${row.round + 1}` } : null;
  }
  const slot = row.slots[terrainIndex];
  return slot ? { slot, label: slotLabel(slot) } : null;
}

// --- Horaires ---

// Réglages par défaut, utilisés tant que l'admin n'a rien enregistré (ou si les
// colonnes n'existent pas encore en base). `split_days` : en formule "12" ou "16",
// chaque catégorie joue sa journée (sur les 4 terrains), `saturday_category` le samedi.
const TIMING_DEFAULTS = {
  show_timing: true,
  saturday_start: "09:00",
  sunday_start: "09:00",
  duration_1x21: 30,
  duration_2x15: 45,
  duration_2x21: 60,
  split_days: false,
  saturday_category: "Femmes",
};

// Format de jeu d'une ligne de planning : "1x21" (poule du Maindraw), "2x15" (qualifs,
// barrages, et tout le tableau en formule "12-quali16"), "2x21" (quarts/demies/finales
// des formules "12" et "16"). Mêmes règles que la validation des scores (js/gestion.js).
function scheduleRowMatchFormat(row, format) {
  if (row.kind === "poolMatch" || row.kind === "poolRound") return "1x21";
  if (row.kind === "qualifRound") return "2x15";
  const slot = row.slots[0];
  if (slot.startsWith("qb") || slot.startsWith("barrage-")) return "2x15";
  return format === "12-quali16" ? "2x15" : "2x21";
}

function parseClock(value) {
  const match = /^(\d{1,2})[:h](\d{2})/.exec(value || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : 9 * 60;
}

// 570 -> "9h30"
function formatClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// Ajoute à chaque ligne son rang (`order`), et son heure de début (`time`, ex: "9h30")
// si les horaires sont affichés — sinon `time` vaut null. Pas de pause : chaque ligne
// commence quand la précédente se termine. `endTime` = heure de fin prévue de la journée.
function computeScheduleTimes(rows, startClock, settings) {
  let cursor = parseClock(startClock);
  const timed = rows.map((row, order) => {
    const time = settings.show_timing ? formatClock(cursor) : null;
    cursor += Number(settings[`duration_${scheduleRowMatchFormat(row, settings.format)}`]) || 0;
    return { ...row, order, time };
  });
  timed.endTime = formatClock(cursor);
  return timed;
}

// L'option "un jour par catégorie" n'existe que sans qualifs (le samedi de la formule
// "12-quali16" est déjà pris par les qualifs des deux catégories).
function splitDaysAvailable(format) {
  return format === "12" || format === "16";
}

function isSplitDays(settings) {
  return Boolean(settings.split_days) && splitDaysAvailable(settings.format);
}

// Catégorie qui joue le samedi en mode "un jour par catégorie".
function saturdayCategory(settings) {
  return CATEGORIES.includes(settings.saturday_category) ? settings.saturday_category : "Femmes";
}

// Les journées du tournoi, dans l'ordre, horaires calculés. Chaque journée :
// { key: "saturday"|"sunday", dayName, title, source: "qualif"|"maindraw" (quels
//   matchs s'y jouent), courts (voir sharedCourts), categories, rows }
// - "12-quali16" : samedi = qualifs, dimanche = Main-draw, les deux catégories ensemble.
// - "12"/"16" un jour par catégorie : samedi = Main-draw d'une catégorie, dimanche = l'autre.
// - sinon : une seule journée (le dimanche), les deux catégories ensemble.
function buildSchedules(settings) {
  const day = (key, title, source, rows, courts) => ({
    key,
    dayName: key === "saturday" ? "Samedi" : "Dimanche",
    title,
    source,
    courts,
    categories: [...new Set(courts.map((court) => court.category))],
    rows: computeScheduleTimes(rows, settings[`${key}_start`], settings),
  });

  if (settings.format === "12-quali16") {
    return [
      day("saturday", "Qualif (Samedi)", "qualif", qualifScheduleRows(), sharedCourts()),
      day("sunday", "Main-draw (Dimanche)", "maindraw", maindrawScheduleRows(settings.format), sharedCourts()),
    ];
  }
  if (isSplitDays(settings)) {
    const rows = maindrawScheduleRows(settings.format, 4);
    const first = saturdayCategory(settings);
    const second = otherCategory(first);
    return [
      day("saturday", `${first} (Samedi)`, "maindraw", rows, soloCourts(first)),
      day("sunday", `${second} (Dimanche)`, "maindraw", rows, soloCourts(second)),
    ];
  }
  return [day("sunday", "Main-draw (Dimanche)", "maindraw", maindrawScheduleRows(settings.format), sharedCourts())];
}

// Journée où se joue le match `slot` (null = match de poule du Maindraw) d'une catégorie.
function scheduleDayFor(days, category, slot) {
  const source = slot && (slot.startsWith("qb") || /^q[A-D]-r/.test(slot)) ? "qualif" : "maindraw";
  return days.find((d) => d.source === source && d.categories.includes(category)) || null;
}

// La ligne de tournament_formats (formule + réglages d'horaires), complétée par les
// valeurs par défaut pour tout ce qui n'est pas renseigné.
async function fetchTournamentSettings() {
  const { data } = await supabaseClient.from("tournament_formats").select("*").maybeSingle();
  const settings = { ...TIMING_DEFAULTS, format: null };
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) settings[key] = value;
  });
  return settings;
}

// --- Classement d'une poule du Maindraw ---

// Compare deux équipes par ratio de points (marqués / encaissés) sans jamais diviser
// (pas de division par zéro si une équipe n'a encaissé aucun point) : produit en
// croix. Retourne > 0 si b doit passer devant a (même convention que `b - a`).
function compareByPointRatio(aFor, aAgainst, bFor, bAgainst) {
  return bFor * aAgainst - aFor * bAgainst;
}

// Classe les équipes d'une poule : d'abord par victoires. En cas d'égalité de
// victoires entre plusieurs équipes (2 à égalité, ou "triangulaire" à 3 dans une
// poule de 4), départage : 1) ratio de points UNIQUEMENT sur les matchs joués entre
// les équipes à égalité, 2) ratio de points face aux équipes HORS du groupe,
// 3) rang de tête de série. Utilisé à l'identique pour l'affichage public et pour
// générer le tableau final côté admin — les deux classements concordent toujours.
//
// Retourne une ligne par équipe : { team, wins, losses, pointsFor, pointsAgainst }.
// pointsFor/pointsAgainst = ce qui sert au départage (matchs internes au groupe
// d'égalité), ou tous les matchs de poule pour une équipe seule à son nombre de victoires.
function computePoolStandings(pool, teamsInPool, poolMatches, seedRankByTeamId) {
  const teamsInPoolMatches = poolMatches.filter((match) => match.pool_id === pool.id);
  const stats = new Map(
    teamsInPool.map((team) => [
      team.id,
      { team, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, externalFor: 0, externalAgainst: 0 },
    ])
  );

  teamsInPoolMatches.forEach((match) => {
    const set = match.sets && match.sets[0];
    const stats1 = stats.get(match.team1_id);
    const stats2 = stats.get(match.team2_id);
    if (!set || !stats1 || !stats2) return;

    if (set.score_team1 > set.score_team2) {
      stats1.wins += 1;
      stats2.losses += 1;
    } else {
      stats2.wins += 1;
      stats1.losses += 1;
    }
  });

  const groupsByWins = new Map();
  stats.forEach((s) => {
    if (!groupsByWins.has(s.wins)) groupsByWins.set(s.wins, []);
    groupsByWins.get(s.wins).push(s);
  });

  const ranked = [];
  [...groupsByWins.keys()]
    .sort((a, b) => b - a)
    .forEach((winCount) => {
      const group = groupsByWins.get(winCount);
      const groupIds = new Set(group.map((s) => s.team.id));
      const isSolo = group.length === 1;

      teamsInPoolMatches.forEach((match) => {
        const set = match.sets && match.sets[0];
        if (!set) return;
        const inGroup1 = groupIds.has(match.team1_id);
        const inGroup2 = groupIds.has(match.team2_id);
        // Équipe seule : pas de départage, on compte tous ses matchs pour l'affichage.
        const internal = (inGroup1 && inGroup2) || isSolo;
        if (inGroup1) {
          const s = stats.get(match.team1_id);
          if (internal) {
            s.pointsFor += set.score_team1;
            s.pointsAgainst += set.score_team2;
          } else {
            s.externalFor += set.score_team1;
            s.externalAgainst += set.score_team2;
          }
        }
        if (inGroup2) {
          const s = stats.get(match.team2_id);
          if (internal) {
            s.pointsFor += set.score_team2;
            s.pointsAgainst += set.score_team1;
          } else {
            s.externalFor += set.score_team2;
            s.externalAgainst += set.score_team1;
          }
        }
      });

      const sortedGroup = group.slice().sort((a, b) => {
        const ratioCmp = compareByPointRatio(a.pointsFor, a.pointsAgainst, b.pointsFor, b.pointsAgainst);
        if (ratioCmp !== 0) return ratioCmp;
        const extCmp = compareByPointRatio(a.externalFor, a.externalAgainst, b.externalFor, b.externalAgainst);
        if (extCmp !== 0) return extCmp;
        return seedRankByTeamId.get(a.team.id) - seedRankByTeamId.get(b.team.id);
      });
      ranked.push(...sortedGroup);
    });

  return ranked;
}

// Classement 1-2-3-4 d'une poule brésilienne de qualif (lettre A-D), lu sur le
// tour 2 : vainqueur/perdant du match des vainqueurs, puis du match des perdants.
// Retourne 4 ids d'équipes, ou null si le tour 2 n'est pas entièrement tranché.
function computeBresilienneStandings(letter, matchesBySlot) {
  const top = matchResult(matchesBySlot.get(`q${letter}-r2-w`));
  const bottom = matchResult(matchesBySlot.get(`q${letter}-r2-l`));
  if (!top || !bottom) return null;
  return [top.winnerId, top.loserId, bottom.winnerId, bottom.loserId];
}

// --- Affichage ---

// Sections dépliées par le visiteur, retenues par clé : les pages publiques se
// redessinent toutes seules (voir onAutoRefresh), et une section ouverte doit le rester.
const openSectionKeys = new Set();

// Un bouton-titre repliable + son contenu, replié par défaut. Avec une `key` stable
// (ex: "poule-Hommes-Poule A-matchs"), son état ouvert/fermé survit aux rafraîchissements.
function createCollapsibleSection(title, key = null) {
  const startOpen = key !== null && openSectionKeys.has(key);
  const header = document.createElement("button");
  header.type = "button";
  header.className = "pool-card-header";
  header.setAttribute("aria-expanded", String(startOpen));

  const labelSpan = document.createElement("span");
  labelSpan.textContent = title;
  header.appendChild(labelSpan);

  const chevron = document.createElement("span");
  chevron.className = "pool-card-chevron";
  chevron.textContent = "▾";
  header.appendChild(chevron);

  const content = document.createElement("div");
  content.className = "pool-card-content";
  content.hidden = !startOpen;

  header.addEventListener("click", () => {
    const isOpen = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", String(!isOpen));
    content.hidden = isOpen;
    if (key !== null) {
      if (isOpen) openSectionKeys.delete(key);
      else openSectionKeys.add(key);
    }
  });

  const section = document.createElement("div");
  section.className = "pool-card-section";
  section.appendChild(header);
  section.appendChild(content);

  return { header, content, section };
}

function createNote(text) {
  const note = document.createElement("p");
  note.className = "form-message";
  note.textContent = text;
  return note;
}

// Format du tournoi actif ("12", "16", "12-quali16"), ou null si pas encore choisi.
async function fetchTournamentFormat() {
  const { data } = await supabaseClient.from("tournament_formats").select("format").maybeSingle();
  return data ? data.format : null;
}

// Remplace le contenu de `container` par ce que dessine `render()`, en gardant la
// position de défilement horizontal des tableaux (.bracket-scroller) : sur téléphone,
// un rafraîchissement ne doit pas renvoyer le visiteur au début du tableau.
function preserveHorizontalScroll(container, render) {
  const previous = container.querySelector(".bracket-scroller");
  const scrollLeft = previous ? previous.scrollLeft : 0;
  render();
  const next = container.querySelector(".bracket-scroller");
  if (next && scrollLeft) next.scrollLeft = scrollLeft;
}

// --- Rafraîchissement automatique des pages publiques ---
// Le jour J, un joueur garde la page ouverte sur son téléphone : elle doit se mettre à
// jour toute seule. Pour ne pas consommer le quota d'échange de données Supabase, on
// ne recharge pas tout toutes les 30 s : on pose d'abord une question minuscule (des
// nombres de lignes, sans les données — fetchDataSignature), et on recharge tout
// seulement si quelque chose a changé. Rechargement complet aussi au retour sur
// l'onglet si ça fait longtemps, et au moins toutes les 5 minutes (une correction de
// score ne change aucun compteur). Rien ne tourne tant que l'onglet est caché
// (téléphone en veille, autre onglet).
const AUTO_REFRESH_CHECK_MS = 30 * 1000;
const AUTO_REFRESH_FULL_MS = 5 * 60 * 1000;
const autoRefreshLoaders = [];

async function fetchDataSignature() {
  const head = { count: "exact", head: true };
  const results = await Promise.all([
    supabaseClient.from("sets").select("id", head),
    supabaseClient.from("matches").select("id", head),
    supabaseClient.from("matches").select("id", head).eq("status", "termine"),
    supabaseClient.from("teams").select("id", head),
  ]);
  if (results.some((r) => r.error)) return null;
  return results.map((r) => r.count).join("-");
}

// Enregistre une fonction de rechargement de la page. Elle est appelée avec
// { silent: true } : pas de "Chargement…", et en cas d'erreur réseau on garde
// l'affichage actuel au lieu de le remplacer par un message d'erreur.
function onAutoRefresh(reload) {
  autoRefreshLoaders.push(reload);
  if (autoRefreshLoaders.length > 1) return;

  let lastSignature = null;
  let lastFullReload = Date.now();
  let busy = false;

  async function tick() {
    if (document.hidden || busy) return;
    busy = true;
    try {
      const signature = await fetchDataSignature();
      const changed = signature !== null && signature !== lastSignature;
      const stale = Date.now() - lastFullReload > AUTO_REFRESH_FULL_MS;
      if (signature !== null) lastSignature = signature;
      if (changed || stale) {
        lastFullReload = Date.now();
        await Promise.all(autoRefreshLoaders.map((load) => load({ silent: true })));
      }
    } catch (error) {
      // Réseau capricieux sur la plage : on réessaiera au prochain tour.
    } finally {
      busy = false;
    }
  }

  setInterval(tick, AUTO_REFRESH_CHECK_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
}
