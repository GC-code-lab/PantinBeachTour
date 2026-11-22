// Page publique "Suivi d'équipe" : cherche une paire par nom de joueur, affiche tous
// ses matchs (connus en base) triés chronologiquement avec horaire + terrain (déduits
// des plannings partagés de js/tournoi-commun.js). Chaque match a un lien vers sa ligne
// dans "Ordre des matchs" ; quand l'adversaire n'est pas encore connu mais déductible
// (ex: "vainqueur du Barrage 2"), ce texte est lui aussi cliquable.

const searchInput = document.getElementById("team-search");
const searchResults = document.getElementById("search-results");
const trackingSection = document.getElementById("tracking-section");

let allTeams = [];
let selectedTeam = null;

// Lien vers la ligne d'un match dans "Ordre des matchs", sur l'onglet de sa journée.
function matchLink(category, slot, matchId) {
  const day = scheduleDayFor(days, category, slot);
  const dayParam = day ? `day=${day.key}&` : "";
  return `ordre-des-matchs.html?${dayParam}anchor=${encodeURIComponent(matchAnchor(category, slot, matchId))}`;
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

  const source = slot ? findSourceSlot(slot, otherPosition) : null;
  if (source) {
    const verb = source.outcome === "winner" ? "vainqueur" : "perdant";
    return { text: `${verb} de ${slotLabel(source.slot)}`, linkSlot: source.slot };
  }

  if (slot) {
    return { text: slotPlaceholder(slot, otherPosition === "team1_id" ? 0 : 1), linkSlot: null };
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
  return formatTeamShort(team);
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

// `silent` (rafraîchissement automatique) : pas de "Chargement…", et en cas d'erreur
// réseau on garde l'affichage actuel. Si une autre équipe a été choisie entre-temps,
// le résultat (devenu obsolète) est ignoré.
async function loadTeamTimeline(team, { silent = false } = {}) {
  trackingSection.hidden = false;
  if (!silent) trackingSection.innerHTML = "Chargement…";

  const [
    { data: teams, error: teamsError },
    { data: pools, error: poolsError },
    { data: matches, error: matchesError },
  ] = await Promise.all([
    supabaseClient.from("teams").select("*").eq("category", team.category),
    supabaseClient.from("pools").select("*").eq("category", team.category),
    supabaseClient.from("matches").select("*, sets(*)").eq("category", team.category),
  ]);

  if (team !== selectedTeam) return;
  if (teamsError || poolsError || matchesError) {
    if (!silent) trackingSection.textContent = "Erreur de chargement.";
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

  // Index "case du planning" -> horaire/terrain, construit depuis les plannings
  // partagés (js/tournoi-commun.js) : clé "pool:<poule>:<rang du match>" pour un
  // match de poule du Maindraw, "slot:<slot>" pour un match à slot fixe.
  const scheduleIndex = new Map();
  days.forEach((day, dayIndex) => {
    const courts = day.courts.filter((court) => court.category === team.category);
    day.rows.forEach((row) => {
      courts.forEach((court) => {
        const cell = scheduleCell(row, court.terrainIndex);
        if (!cell) return;
        const key = cell.poolLabel ? `pool:${cell.poolLabel}:${cell.matchIndex}` : `slot:${cell.slot}`;
        scheduleIndex.set(key, { time: row.time, order: row.order, dayIndex, dayName: day.dayName, terrain: court.terrain });
      });
    });
  });

  function resolveSchedule(match) {
    if (match.phase === "poule") {
      const pool = pools.find((p) => p.id === match.pool_id);
      if (!pool) return null;
      const index = (poolMatchesByPoolId.get(pool.id) || []).indexOf(match);
      const entry = scheduleIndex.get(`pool:${pool.label}:${index}`);
      return entry ? { ...entry, label: pool.label } : null;
    }
    if (!match.slot) return null;
    const entry = scheduleIndex.get(`slot:${match.slot}`);
    return entry ? { ...entry, label: slotLabel(match.slot) } : null;
  }

  const confirmed = matches
    .filter((m) => m.team1_id === team.id || m.team2_id === team.id)
    .map((m) => ({ match: m, schedule: resolveSchedule(m) }))
    .filter((row) => row.schedule);

  // Samedi avant dimanche, puis ordre de passage dans la journée.
  confirmed.sort((a, b) => scheduleSortKey(a.schedule) - scheduleSortKey(b.schedule));

  renderTimeline(team, teamsById, confirmed);
}

function scheduleSortKey(schedule) {
  return schedule.dayIndex * 1000 + schedule.order;
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

// "win"/"loss" une fois le match tranché, sinon null (pas de verdict à afficher).
function matchOutcomeForTeam(match, teamId) {
  const result = matchResult(match);
  if (!result) return null;
  return result.winnerId === teamId ? "win" : "loss";
}

function renderMatchCard(team, teamsById, match, schedule) {
  const card = document.createElement("div");
  card.className = match.status === "termine" ? "match-row match-row-done" : "match-row";

  // Le jour n'est indiqué que si le tournoi dure deux jours.
  const dayText = days.length > 1 ? schedule.dayName : "";
  const timeText = [dayText, schedule.time].filter(Boolean).join(" ");
  if (timeText) {
    const timeTag = document.createElement("span");
    timeTag.className = "match-time";
    timeTag.textContent = timeText;
    card.appendChild(timeTag);
  }

  const terrainTag = document.createElement("a");
  terrainTag.className = "match-order-tag match-order-link";
  terrainTag.href = matchLink(team.category, match.slot, match.id);
  terrainTag.textContent = `${schedule.label} · Terrain ${schedule.terrain}`;
  card.appendChild(terrainTag);

  const position = match.team1_id === team.id ? "team1_id" : "team2_id";
  const { text: opponentText, linkSlot } = resolveOpponent(match.slot, position, match, teamsById);

  const opponent = document.createElement(linkSlot ? "a" : "span");
  opponent.className = linkSlot ? "match-team team2 hint-match-link" : "match-team team2";
  if (linkSlot) opponent.href = matchLink(team.category, linkSlot, null);
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

// Journées du tournoi, horaires calculés (voir buildSchedules dans js/tournoi-commun.js).
let days = [];

async function init() {
  const [{ data, error }, settings] = await Promise.all([
    supabaseClient.from("teams").select("*"),
    fetchTournamentSettings(),
  ]);
  if (!error && data) allTeams = data;
  days = buildSchedules(settings);
}

init();

// Rafraîchissement automatique : seulement si une équipe est affichée.
onAutoRefresh(async (options) => {
  if (!selectedTeam) return;
  days = buildSchedules(await fetchTournamentSettings()); // réglages changés côté admin
  await loadTeamTimeline(selectedTeam, options);
});
