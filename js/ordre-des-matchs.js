// Une ou deux journées selon la formule (voir buildSchedules dans js/tournoi-commun.js) :
// - "12-quali16" : Qualif (samedi) puis Main-draw (dimanche) ;
// - "12"/"16" avec "un jour par catégorie" : une catégorie le samedi, l'autre le dimanche ;
// - sinon : une seule journée, pas d'onglets.
// Chaque journée a son onglet et son panneau (samedi / dimanche).
const dayTabs = document.getElementById("day-tabs");
const dayButtons = document.querySelectorAll(".tab-button[data-day]");
const dayPanels = {
  saturday: {
    panel: document.getElementById("day-saturday"),
    info: document.getElementById("courts-info-saturday"),
    list: document.getElementById("courts-list-saturday"),
  },
  sunday: {
    panel: document.getElementById("day-sunday"),
    info: document.getElementById("courts-info-sunday"),
    list: document.getElementById("courts-list-sunday"),
  },
};
let activeDay = "sunday";

dayButtons.forEach((button) => {
  button.addEventListener("click", () => switchDay(button.dataset.day));
});

function switchDay(day) {
  activeDay = day;
  dayButtons.forEach((b) => b.classList.toggle("active", b.dataset.day === day));
  Object.entries(dayPanels).forEach(([key, { panel }]) => {
    panel.hidden = key !== day;
  });
}

// Journées du tournoi, horaires calculés (voir js/tournoi-commun.js — partagé avec
// la page "Suivi d'équipe"). Rempli au chargement (loadAllCourts).
let days = [];

// Place encore inconnue : le croisement fixé par le format ("2e Poule C",
// "Vainqueur Barrage 2"...). Au-delà des quarts, juste "TBD" (comme le tableau).
function slotTeamLabel(match, teamsById, slot, index) {
  const teamId = match ? (index === 0 ? match.team1_id : match.team2_id) : null;
  if (teamId) return teamLabel(teamId, teamsById);
  const source = findSourceSlot(slot, index === 0 ? "team1_id" : "team2_id");
  const fromBarrage = source && (source.slot.startsWith("barrage-") || source.slot.startsWith("qb"));
  if (source && !fromBarrage) return "TBD";
  return slotPlaceholder(slot, index);
}

// Données du Main-draw (poules + tableau), avec de quoi retrouver le match d'une case
// du planning. null en cas d'erreur réseau.
async function fetchMaindrawData() {
  const [
    { data: pools, error: poolsError },
    { data: teams, error: teamsError },
    { data: poolMatches, error: poolMatchesError },
    { data: bracketMatches, error: bracketError },
  ] = await Promise.all([
    supabaseClient.from("pools").select("*"),
    supabaseClient.from("teams").select("*"),
    supabaseClient.from("matches").select("*, sets(*)").eq("phase", "poule").order("id", { ascending: true }),
    supabaseClient.from("matches").select("*, sets(*)").in("phase", PHASES_MAINDRAW_BRACKET),
  ]);
  if (poolsError || teamsError || poolMatchesError || bracketError) return null;

  const matchesByPool = new Map();
  poolMatches
    .slice()
    .sort((a, b) => a.id - b.id)
    .forEach((m) => {
      if (!matchesByPool.has(m.pool_id)) matchesByPool.set(m.pool_id, []);
      matchesByPool.get(m.pool_id).push(m);
    });

  return {
    teamsById: new Map(teams.map((team) => [team.id, team])),
    isReady: (category) => pools.some((p) => p.category === category),
    emptyText: "L'ordre des matchs sera affiché ici dès que les poules seront tirées.",
    findPoolMatch: (category, poolLabel, index) => {
      const pool = pools.find((p) => p.category === category && p.label === poolLabel);
      return pool ? (matchesByPool.get(pool.id) || [])[index] : null;
    },
    findSlotMatch: (category, slot) => bracketMatches.find((m) => m.category === category && m.slot === slot),
  };
}

// Pendant de fetchMaindrawData() pour la journée "Qualif".
async function fetchQualifData() {
  const [{ data: teams, error: teamsError }, { data: qualifMatches, error: qualifError }] = await Promise.all([
    supabaseClient.from("teams").select("*"),
    supabaseClient.from("matches").select("*, sets(*)").in("phase", PHASES_QUALIF),
  ]);
  if (teamsError || qualifError) return null;

  return {
    teamsById: new Map(teams.map((team) => [team.id, team])),
    isReady: (category) => qualifMatches.some((m) => m.phase === "qualif_poule" && m.category === category),
    emptyText: "L'ordre des matchs de qualification sera affiché ici dès que les poules de qualif seront générées.",
    findPoolMatch: () => null,
    findSlotMatch: (category, slot) => qualifMatches.find((m) => m.category === category && m.slot === slot),
  };
}

// `silent` (rafraîchissement automatique) : en cas d'erreur réseau, on garde
// l'affichage actuel au lieu d'afficher un message d'erreur.
function renderDay(day, data, { silent = false } = {}) {
  const { info, list } = dayPanels[day.key];
  if (!data) {
    if (!silent) info.textContent = "Erreur de chargement des données.";
    return;
  }
  if (!day.categories.some((category) => data.isReady(category))) {
    info.textContent = data.emptyText;
    list.innerHTML = "";
    return;
  }
  info.textContent = "";
  renderCourtCards(list, day, data);
}

function teamLabel(teamId, teamsById) {
  if (!teamId) return "À déterminer";
  return formatTeamShort(teamsById.get(teamId));
}

// Les 4 cartes "Terrain N" d'une journée.
function renderCourtCards(container, day, { findPoolMatch, findSlotMatch, teamsById }) {
  container.innerHTML = "";

  day.courts.forEach((court) => {
    const card = document.createElement("div");
    card.className = "pool-card";

    const title = document.createElement("h3");
    title.textContent = `Terrain ${court.terrain}`;
    card.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "form-message";
    subtitle.textContent = court.category;
    card.appendChild(subtitle);

    const rows = [];
    day.rows.forEach((scheduleRow) => {
      const cell = scheduleCell(scheduleRow, court.terrainIndex);
      if (!cell) return; // terrain libre sur cette ligne (ex: demies sur 4 terrains)
      if (cell.poolLabel) {
        // Match de poule : n'apparaît qu'une fois les poules tirées.
        const match = findPoolMatch(court.category, cell.poolLabel, cell.matchIndex);
        if (match) rows.push(renderMatchRow(cell.label, match, teamsById, null, scheduleRow.time, court.category));
      } else {
        const match = findSlotMatch(court.category, cell.slot);
        // Poule de qualif : pas encore générée -> rien. Tableau / barrages : toujours
        // affichés, avec les croisements connus à l'avance tant que le match n'existe pas.
        const isQualifPool = /^q[A-D]-r/.test(cell.slot);
        if (isQualifPool && !match) return;
        rows.push(
          renderMatchRow(cell.label, match, teamsById, isQualifPool ? null : cell.slot, scheduleRow.time, court.category)
        );
      }
    });

    appendPhaseSection(card, "Programme", rows, `${day.key}-terrain-${court.terrain}`);
    container.appendChild(card);
  });
}

// `key` : l'état déplié/replié du terrain survit aux rafraîchissements automatiques.
function appendPhaseSection(card, title, rows, key) {
  const { section, content } = createCollapsibleSection(title, key);

  if (rows.length === 0) {
    content.appendChild(createNote("Pas encore disponible."));
  } else {
    rows.forEach((row) => content.appendChild(row));
  }

  card.appendChild(section);
}

// `slot` n'est fourni que pour les matchs dont les équipes peuvent être inconnues
// (phases finales, barrages de qualif) : ça active l'affichage des croisements connus
// à l'avance (SLOT_PLACEHOLDERS) quand le match n'existe pas encore côté admin. `time`
// est optionnel, affiché en petit juste avant le nom de l'équipe 1. `category` sert
// uniquement à construire une ancre unique (voir plus bas).
function renderMatchRow(label, match, teamsById, slot, time, category) {
  const row = document.createElement("div");
  row.className = match && match.status === "termine" ? "match-row match-row-done" : "match-row";

  // Ancre utilisée par le lien "voir ce match" depuis la page Suivi d'équipe : les
  // matchs à slot fixe (phases finales, barrages de qualif) sont identifiés par leur
  // slot + catégorie — un `slot` comme "barrage-2" existe une fois par catégorie, donc
  // sans la catégorie le lien tombait au hasard sur Hommes ou Femmes. Les matchs de
  // poule (pas de slot) sont identifiés par leur id, qui lui est déjà unique tout court.
  const anchorSlot = slot || (match && match.slot);
  row.dataset.anchor = anchorSlot ? `slot:${category}:${anchorSlot}` : match ? `match:${match.id}` : "";

  const orderTag = document.createElement("span");
  orderTag.className = "match-order-tag";
  orderTag.textContent = label;
  row.appendChild(orderTag);

  if (time) {
    const timeTag = document.createElement("span");
    timeTag.className = "match-time";
    timeTag.textContent = time;
    row.appendChild(timeTag);
  }

  const team1Span = document.createElement("span");
  team1Span.className = "match-team";
  team1Span.textContent = slot ? slotTeamLabel(match, teamsById, slot, 0) : teamLabel(match.team1_id, teamsById);
  row.appendChild(team1Span);

  if (match && match.sets && match.sets.length > 0) {
    const score = document.createElement("span");
    score.className = "match-score";
    score.textContent = formatSetsScore(match.sets);
    row.appendChild(score);
  } else {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "À venir";
    row.appendChild(badge);
  }

  const team2Span = document.createElement("span");
  team2Span.className = "match-team team2";
  team2Span.textContent = slot ? slotTeamLabel(match, teamsById, slot, 1) : teamLabel(match.team2_id, teamsById);
  row.appendChild(team2Span);

  return row;
}

// Arrivée depuis un lien "voir ce match" de la page Suivi d'équipe
// (ordre-des-matchs.html?day=saturday&anchor=slot:Hommes:qb5) : bascule sur le bon onglet,
// déplie la section repliable qui contient la ligne visée, scrolle jusqu'à elle et la
// met en surbrillance un instant.
function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const anchor = params.get("anchor");
  if (!anchor) return;

  requestAnimationFrame(() => {
    const target = document.querySelector(`[data-anchor="${CSS.escape(anchor)}"]`);
    if (!target) return;

    // Déplie le terrain via son bouton (et non en modifiant le DOM à la main), pour
    // qu'il reste ouvert lors des rafraîchissements automatiques.
    const content = target.closest(".pool-card-content");
    const header = content && content.previousElementSibling;
    if (content && content.hidden && header && header.classList.contains("pool-card-header")) {
      header.click();
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("match-row-highlight");
    setTimeout(() => target.classList.remove("match-row-highlight"), 2500);
  });
}

// Anciens liens (?day=qualif / ?day=maindraw) toujours acceptés.
function requestedDayKey() {
  const day = new URLSearchParams(window.location.search).get("day");
  return { qualif: "saturday", maindraw: "sunday" }[day] || day;
}

// Réglages relus à chaque fois : un changement côté admin (formule, jours, horaires)
// se voit aussi au rafraîchissement automatique.
async function loadAllCourts(options = {}) {
  const settings = await fetchTournamentSettings();
  days = buildSchedules(settings);

  const needs = (source) => days.some((day) => day.source === source);
  const [maindrawData, qualifData] = await Promise.all([
    needs("maindraw") ? fetchMaindrawData() : null,
    needs("qualif") ? fetchQualifData() : null,
  ]);
  days.forEach((day) => renderDay(day, day.source === "qualif" ? qualifData : maindrawData, options));

  // Onglets seulement s'il y a deux journées, titrés selon la formule.
  dayTabs.hidden = days.length < 2;
  dayButtons.forEach((button) => {
    const day = days.find((d) => d.key === button.dataset.day);
    button.hidden = !day;
    if (day) button.textContent = day.title;
  });
  if (!days.some((day) => day.key === activeDay)) switchDay(days[0].key);
}

async function init() {
  await loadAllCourts();
  const requested = requestedDayKey();
  switchDay(days.some((day) => day.key === requested) ? requested : days[0].key);
  handleDeepLink();
}

init();
onAutoRefresh(loadAllCourts);
