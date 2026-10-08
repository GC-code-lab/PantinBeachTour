// Page publique "Suivi d'équipe" : cherche une paire par nom de joueur, affiche tous
// ses matchs (connus en base) triés chronologiquement avec horaire + terrain (déduits
// des mêmes plannings que js/ordre-des-matchs.js — dupliqués ici volontairement, ce
// site n'a pas de module JS partagé entre pages). Chaque match a un lien vers sa ligne
// dans "Ordre des matchs" ; quand l'adversaire n'est pas encore connu mais déductible
// (ex: "vainqueur du Barrage 2"), ce texte est lui aussi cliquable.

const searchInput = document.getElementById("team-search");
const searchResults = document.getElementById("search-results");
const trackingSection = document.getElementById("tracking-section");

let allTeams = [];
let selectedTeam = null;

// --- Mêmes plannings/terrains que js/ordre-des-matchs.js (tenir synchronisés si l'un change) ---

const GENDER_TERRAINS = { Hommes: [2, 3], Femmes: [1, 4] };

const MAINDRAW_SCHEDULE = [
  { time: "9h00", kind: "poolPair", pools: ["Poule B", "Poule C"], round: 0 },
  { time: "9h30", kind: "poolPair", pools: ["Poule A", "Poule D"], round: 0 },
  { time: "10h00", kind: "poolPair", pools: ["Poule B", "Poule C"], round: 1 },
  { time: "10h30", kind: "poolPair", pools: ["Poule A", "Poule D"], round: 1 },
  { time: "11h00", kind: "poolPair", pools: ["Poule B", "Poule C"], round: 2 },
  { time: "11h30", kind: "poolPair", pools: ["Poule A", "Poule D"], round: 2 },
  { time: "12h00", kind: "slotPair", slots: ["barrage-1", "barrage-2"] },
  { time: "12h45", kind: "slotPair", slots: ["barrage-3", "barrage-4"] },
  { time: "13h30", kind: "slotPair", slots: ["qf-1", "qf-2"] },
  { time: "14h15", kind: "slotPair", slots: ["qf-3", "qf-4"] },
  { time: "15h15", kind: "slotPair", slots: ["sf-1", "sf-2"] },
  { time: "16h15", kind: "slotPair", slots: ["finale", "petite-finale"] },
];

const QUALIF_SCHEDULE = [
  { time: "9h00", kind: "poolRound", poolLetter: "B", round: 0 },
  { time: "9h45", kind: "poolRound", poolLetter: "D", round: 0 },
  { time: "10h30", kind: "poolRound", poolLetter: "A", round: 0 },
  { time: "11h15", kind: "poolRound", poolLetter: "C", round: 0 },
  { time: "12h00", kind: "poolRound", poolLetter: "B", round: 1 },
  { time: "12h45", kind: "poolRound", poolLetter: "D", round: 1 },
  { time: "13h30", kind: "poolRound", poolLetter: "A", round: 1 },
  { time: "14h15", kind: "poolRound", poolLetter: "C", round: 1 },
  { time: "15h00", kind: "slotPair", slots: ["qb2", "qb4"] },
  { time: "15h45", kind: "slotPair", slots: ["qb1", "qb3"] },
  { time: "16h30", kind: "slotPair", slots: ["qb5", "qb7"] },
  { time: "17h15", kind: "slotPair", slots: ["qb6", "qb8"] },
];

function qualifRoundSlots(letter, round) {
  return round === 0 ? [`q${letter}-r1-1`, `q${letter}-r1-2`] : [`q${letter}-r2-w`, `q${letter}-r2-l`];
}

const SLOT_LABELS = {
  "sf-1": "Demi 1",
  "sf-2": "Demi 2",
  "petite-finale": "Petite finale",
  finale: "Finale",
};

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

const SLOT_PLACEHOLDERS = {
  "barrage-1": ["2e Poule C", "3e Poule B"],
  "barrage-2": ["2e Poule B", "3e Poule C"],
  "barrage-3": ["2e Poule D", "3e Poule A"],
  "barrage-4": ["2e Poule A", "3e Poule D"],
  "qf-1": ["1er Poule A", "Vainqueur Barrage 2"],
  "qf-2": ["1er Poule D", "Vainqueur Barrage 1"],
  "qf-3": ["1er Poule B", "Vainqueur Barrage 4"],
  "qf-4": ["1er Poule C", "Vainqueur Barrage 3"],
  "sf-1": ["Vainqueur Quart 1", "Vainqueur Quart 2"],
  "sf-2": ["Vainqueur Quart 3", "Vainqueur Quart 4"],
  finale: ["Vainqueur Demi 1", "Vainqueur Demi 2"],
  "petite-finale": ["Perdant Demi 1", "Perdant Demi 2"],
  qb1: ["2e Poule A", "3e Poule C"],
  qb2: ["2e Poule B", "3e Poule D"],
  qb3: ["2e Poule C", "3e Poule A"],
  qb4: ["2e Poule D", "3e Poule B"],
  qb5: ["1er Poule A", "Vainqueur Barrage qualif 2"],
  qb6: ["1er Poule B", "Vainqueur Barrage qualif 1"],
  qb7: ["1er Poule C", "Vainqueur Barrage qualif 4"],
  qb8: ["1er Poule D", "Vainqueur Barrage qualif 3"],
};

// Même table que BRACKET_PROGRESSION dans js/gestion.js — qui gagne va où ensuite, et à
// quelle "place" (team1_id/team2_id) du match suivant, pour savoir déterministement de
// quel côté sera l'équipe suivie et donc décrire précisément son futur adversaire.
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
  "qA-r1-1": { winner: { nextSlot: "qA-r2-w", position: "team1_id" }, loser: { nextSlot: "qA-r2-l", position: "team1_id" } },
  "qA-r1-2": { winner: { nextSlot: "qA-r2-w", position: "team2_id" }, loser: { nextSlot: "qA-r2-l", position: "team2_id" } },
  "qB-r1-1": { winner: { nextSlot: "qB-r2-w", position: "team1_id" }, loser: { nextSlot: "qB-r2-l", position: "team1_id" } },
  "qB-r1-2": { winner: { nextSlot: "qB-r2-w", position: "team2_id" }, loser: { nextSlot: "qB-r2-l", position: "team2_id" } },
  "qC-r1-1": { winner: { nextSlot: "qC-r2-w", position: "team1_id" }, loser: { nextSlot: "qC-r2-l", position: "team1_id" } },
  "qC-r1-2": { winner: { nextSlot: "qC-r2-w", position: "team2_id" }, loser: { nextSlot: "qC-r2-l", position: "team2_id" } },
  "qD-r1-1": { winner: { nextSlot: "qD-r2-w", position: "team1_id" }, loser: { nextSlot: "qD-r2-l", position: "team1_id" } },
  "qD-r1-2": { winner: { nextSlot: "qD-r2-w", position: "team2_id" }, loser: { nextSlot: "qD-r2-l", position: "team2_id" } },
  qb1: { winner: { nextSlot: "qb6", position: "team2_id" } },
  qb2: { winner: { nextSlot: "qb5", position: "team2_id" } },
  qb3: { winner: { nextSlot: "qb8", position: "team2_id" } },
  qb4: { winner: { nextSlot: "qb7", position: "team2_id" } },
};

// Cherche dans BRACKET_PROGRESSION le slot dont le gagnant (ou perdant) rejoint
// `nextSlot` à la place `position` — ex: findSourceSlot("qf-1", "team2_id") renvoie
// "barrage-2". Utilisé pour savoir quel match précis décide de l'adversaire d'un match
// pas encore joué, et donc pouvoir y créer un lien.
function findSourceSlot(nextSlot, position) {
  for (const [slot, progression] of Object.entries(BRACKET_PROGRESSION)) {
    if (progression.winner && progression.winner.nextSlot === nextSlot && progression.winner.position === position) {
      return slot;
    }
    if (progression.loser && progression.loser.nextSlot === nextSlot && progression.loser.position === position) {
      return slot;
    }
  }
  return null;
}

// Qualif ou Main-draw ? Détermine vers quel onglet de "Ordre des matchs" un slot pointe.
function slotDay(slot) {
  if (!slot) return "maindraw";
  if (slot.startsWith("qb") || /^q[A-D]-r/.test(slot)) return "qualif";
  return "maindraw";
}

function matchLink(day, anchor) {
  return `ordre-des-matchs.html?day=${day}&anchor=${encodeURIComponent(anchor)}`;
}

// Décrit l'adversaire d'un match (existant ou pas encore créé), dans cet ordre :
// équipe déjà connue en base > match précis qui la déterminera (lien cliquable) >
// placeholder fixe (ex: "1er Poule A", pas de match à lier) > texte générique.
// `position` = le champ (team1_id/team2_id) qu'occupe l'équipe suivie.
function resolveOpponent(slot, position, matchRecord, teamsById) {
  const otherPosition = position === "team1_id" ? "team2_id" : "team1_id";
  const otherTeamId = matchRecord ? matchRecord[otherPosition] : null;

  if (otherTeamId) {
    return { text: teamShortName(teamsById.get(otherTeamId)), linkSlot: null };
  }

  const sourceSlot = slot ? findSourceSlot(slot, otherPosition) : null;
  if (sourceSlot) {
    return { text: `vainqueur de ${slotLabel(sourceSlot)}`, linkSlot: sourceSlot };
  }

  const placeholder = slot ? SLOT_PLACEHOLDERS[slot] : null;
  if (placeholder) {
    return { text: placeholder[otherPosition === "team1_id" ? 0 : 1], linkSlot: null };
  }

  return { text: "pas encore connu", linkSlot: null };
}

// --- Recherche ---

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function teamName(team) {
  if (!team) return "?";
  return `${team.player1_prenom} ${team.player1_nom} / ${team.player2_prenom} ${team.player2_nom}`;
}

function teamShortName(team) {
  if (!team) return "?";
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
}

searchInput.addEventListener("input", () => {
  const query = normalize(searchInput.value.trim());
  searchResults.innerHTML = "";

  if (query.length < 2) {
    searchResults.hidden = true;
    return;
  }

  const matches = allTeams
    .filter((team) =>
      [team.player1_nom, team.player1_prenom, team.player2_nom, team.player2_prenom].some((field) =>
        normalize(field).includes(query)
      )
    )
    .slice(0, 10);

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-result-empty";
    empty.textContent = "Aucune équipe trouvée.";
    searchResults.appendChild(empty);
    searchResults.hidden = false;
    return;
  }

  matches.forEach((team) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "search-result-item";
    item.textContent = `${teamName(team)} (${team.category})`;
    item.addEventListener("click", () => selectTeam(team));
    searchResults.appendChild(item);
  });

  searchResults.hidden = false;
});

document.addEventListener("click", (event) => {
  if (!searchResults.hidden && !event.target.closest(".search-wrap")) {
    searchResults.hidden = true;
  }
});

async function selectTeam(team) {
  selectedTeam = team;
  searchInput.value = teamName(team);
  searchResults.hidden = true;
  searchResults.innerHTML = "";
  await loadTeamTimeline(team);
}

// --- Chargement + calcul de la timeline d'une équipe ---

async function loadTeamTimeline(team) {
  trackingSection.hidden = false;
  trackingSection.innerHTML = "Chargement…";

  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .eq("category", team.category);

  const { data: pools, error: poolsError } = await supabaseClient
    .from("pools")
    .select("*")
    .eq("category", team.category);

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", team.category);

  if (teamsError || poolsError || matchesError) {
    trackingSection.textContent = "Erreur de chargement.";
    return;
  }

  const teamsById = new Map(teams.map((t) => [t.id, t]));

  const poolMatchesByPoolId = new Map();
  matches
    .filter((m) => m.phase === "poule")
    .sort((a, b) => a.id - b.id)
    .forEach((m) => {
      if (!poolMatchesByPoolId.has(m.pool_id)) poolMatchesByPoolId.set(m.pool_id, []);
      poolMatchesByPoolId.get(m.pool_id).push(m);
    });

  function resolveMainDrawPool(match) {
    const pool = pools.find((p) => p.id === match.pool_id);
    if (!pool) return null;
    const sorted = poolMatchesByPoolId.get(pool.id) || [];
    const roundIndex = sorted.indexOf(match);
    if (roundIndex === -1) return null;

    for (const entry of MAINDRAW_SCHEDULE) {
      if (entry.kind !== "poolPair" || entry.round !== roundIndex) continue;
      const idx = entry.pools.indexOf(pool.label);
      if (idx === -1) continue;
      return { time: entry.time, day: "maindraw", terrain: GENDER_TERRAINS[team.category][idx], label: pool.label };
    }
    return null;
  }

  function resolveBySlot(slot) {
    for (const entry of MAINDRAW_SCHEDULE) {
      if (entry.kind === "slotPair") {
        const idx = entry.slots.indexOf(slot);
        if (idx !== -1) {
          return { time: entry.time, day: "maindraw", terrain: GENDER_TERRAINS[team.category][idx], label: slotLabel(slot) };
        }
      }
    }
    for (const entry of QUALIF_SCHEDULE) {
      if (entry.kind === "slotPair") {
        const idx = entry.slots.indexOf(slot);
        if (idx !== -1) {
          return { time: entry.time, day: "qualif", terrain: GENDER_TERRAINS[team.category][idx], label: slotLabel(slot) };
        }
      }
      if (entry.kind === "poolRound") {
        const slots = qualifRoundSlots(entry.poolLetter, entry.round);
        const idx = slots.indexOf(slot);
        if (idx !== -1) {
          return { time: entry.time, day: "qualif", terrain: GENDER_TERRAINS[team.category][idx], label: slotLabel(slot) };
        }
      }
    }
    return null;
  }

  function resolveSchedule(match) {
    if (match.phase === "poule") return resolveMainDrawPool(match);
    if (match.slot) return resolveBySlot(match.slot);
    return null;
  }

  const confirmed = matches
    .filter((m) => m.team1_id === team.id || m.team2_id === team.id)
    .map((m) => ({ match: m, schedule: resolveSchedule(m) }))
    .filter((row) => row.schedule);

  // Samedi (qualif) toujours avant dimanche (Main-draw), peu importe l'heure brute —
  // sans ça, un match de qualif à 9h se retrouverait trié après un match de Main-draw
  // à 9h30 du lendemain.
  confirmed.sort((a, b) => scheduleSortKey(a.schedule) - scheduleSortKey(b.schedule));

  renderTimeline(team, teamsById, confirmed);
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split("h");
  return Number(h) * 60 + Number(m || 0);
}

// Clé de tri chronologique sur les 2 jours : samedi (qualif) avant dimanche (Main-draw),
// quelle que soit l'heure brute de chacun.
function scheduleSortKey(schedule) {
  const dayOffset = schedule.day === "qualif" ? 0 : 1;
  return dayOffset * 10000 + timeToMinutes(schedule.time);
}

function formatSetsScore(sets) {
  return sets
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => `${set.score_team1}-${set.score_team2}`)
    .join(" / ");
}

// --- Rendu ---

function renderTimeline(team, teamsById, confirmed) {
  trackingSection.innerHTML = "";

  const header = document.createElement("div");
  header.className = "tracking-header";
  const title = document.createElement("h2");
  title.textContent = teamName(team);
  header.appendChild(title);
  const sub = document.createElement("p");
  sub.className = "form-message";
  sub.textContent = team.category;
  header.appendChild(sub);
  trackingSection.appendChild(header);

  if (confirmed.length === 0) {
    const note = document.createElement("p");
    note.className = "form-message";
    note.textContent = "Aucun match programmé pour l'instant (poules pas encore tirées).";
    trackingSection.appendChild(note);
    return;
  }

  confirmed.forEach(({ match, schedule }) => {
    trackingSection.appendChild(renderMatchCard(team, teamsById, match, schedule));
  });
}

// L'ancre d'un match dans "Ordre des matchs" doit inclure la catégorie : un `slot`
// comme "barrage-2" n'est pas unique en base (il existe une fois par catégorie), donc
// sans ça le lien tombe sur le premier des deux trouvé dans la page (souvent Femmes).
function matchAnchor(category, slot, matchId) {
  return slot ? `slot:${category}:${slot}` : `match:${matchId}`;
}

// "win"/"loss" une fois le match tranché (assez de sets gagnés pour sa phase), sinon
// null (match en cours ou pas encore joué — pas de verdict à afficher).
function matchOutcomeForTeam(match, teamId) {
  const sets = (match && match.sets) || [];
  const needed = match.phase === "poule" ? 1 : 2;
  const wins1 = sets.filter((s) => s.score_team1 > s.score_team2).length;
  const wins2 = sets.filter((s) => s.score_team2 > s.score_team1).length;
  if (wins1 < needed && wins2 < needed) return null;
  const winnerId = wins1 >= needed ? match.team1_id : match.team2_id;
  return winnerId === teamId ? "win" : "loss";
}

function renderMatchCard(team, teamsById, match, schedule) {
  const card = document.createElement("div");
  card.className = match.status === "termine" ? "match-row match-row-done" : "match-row";

  const timeTag = document.createElement("span");
  timeTag.className = "match-time";
  timeTag.textContent = schedule.time;
  card.appendChild(timeTag);

  const terrainTag = document.createElement("a");
  terrainTag.className = "match-order-tag match-order-link";
  terrainTag.href = matchLink(slotDay(match.slot), matchAnchor(team.category, match.slot, match.id));
  terrainTag.textContent = `${schedule.label} · Terrain ${schedule.terrain}`;
  card.appendChild(terrainTag);

  const position = match.team1_id === team.id ? "team1_id" : "team2_id";
  const { text: opponentText, linkSlot } = resolveOpponent(match.slot, position, match, teamsById);

  const opponent = document.createElement(linkSlot ? "a" : "span");
  opponent.className = linkSlot ? "match-team team2 hint-match-link" : "match-team team2";
  if (linkSlot) opponent.href = matchLink(slotDay(linkSlot), matchAnchor(team.category, linkSlot, null));
  opponent.textContent = `vs ${opponentText}`;
  card.appendChild(opponent);

  if (match.sets && match.sets.length > 0) {
    const score = document.createElement("span");
    score.className = "match-score";
    score.textContent = formatSetsScore(match.sets);
    card.appendChild(score);

    const outcome = matchOutcomeForTeam(match, team.id);
    if (outcome) {
      const resultBadge = document.createElement("span");
      resultBadge.className = outcome === "win" ? "badge badge-win" : "badge badge-loss";
      resultBadge.textContent = outcome === "win" ? "Gagné" : "Perdu";
      card.appendChild(resultBadge);
    }
  } else {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "À venir";
    card.appendChild(badge);
  }

  return card;
}

async function init() {
  const { data, error } = await supabaseClient.from("teams").select("*");
  if (!error && data) allTeams = data;
}

init();
