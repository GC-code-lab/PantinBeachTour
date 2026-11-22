const courtsInfo = document.getElementById("courts-info");
const courtsList = document.getElementById("courts-list");
const qualifCourtsInfo = document.getElementById("qualif-courts-info");
const qualifCourtsList = document.getElementById("qualif-courts-list");

// Onglets "Qualif (Samedi)" / "Main-draw (Dimanche)" — n'existent que si la formule
// active du tournoi comporte des qualifications (voir checkFormatAndInit tout en bas).
// Sans qualifs, cachés : la page garde exactement son comportement d'avant (une seule
// vue, le Main-draw).
const dayTabs = document.getElementById("day-tabs");
const dayButtons = document.querySelectorAll(".tab-button[data-day]");
const dayPanels = {
  qualif: document.getElementById("day-qualif"),
  maindraw: document.getElementById("day-maindraw"),
};

dayButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const day = button.dataset.day;
    dayButtons.forEach((b) => b.classList.toggle("active", b === button));
    Object.entries(dayPanels).forEach(([key, panel]) => {
      panel.hidden = key !== day;
    });
  });
});

function switchDay(day) {
  const button = [...dayButtons].find((b) => b.dataset.day === day);
  if (button) button.click();
}

// Terrains (GENDER_TERRAINS, COURTS) et plannings (maindrawScheduleRows,
// qualifScheduleRows, horaires calculés par buildSchedules) : voir js/tournoi-commun.js
// — partagés avec la page "Suivi d'équipe". Rempli au chargement (checkFormatAndInit).
let schedules = { qualif: [], maindraw: [] };

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

// `silent` (rafraîchissement automatique) : en cas d'erreur réseau, on garde
// l'affichage actuel au lieu d'afficher un message d'erreur.
async function loadCourts({ silent = false } = {}) {
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

  if (poolsError || teamsError || poolMatchesError || bracketError) {
    if (!silent) courtsInfo.textContent = "Erreur de chargement des données.";
    return;
  }

  if (pools.length === 0) {
    courtsInfo.textContent = "L'ordre des matchs sera affiché ici dès que les poules seront tirées.";
    courtsList.innerHTML = "";
    return;
  }

  courtsInfo.textContent = "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  renderCourts(pools, teamsById, poolMatches, bracketMatches);
}

// Pendant du loadCourts()/renderCourts() ci-dessus, pour la journée "Qualif".
async function loadQualifCourts({ silent = false } = {}) {
  const [{ data: teams, error: teamsError }, { data: qualifMatches, error: qualifError }] = await Promise.all([
    supabaseClient.from("teams").select("*"),
    supabaseClient.from("matches").select("*, sets(*)").in("phase", PHASES_QUALIF),
  ]);

  if (teamsError || qualifError) {
    if (!silent) qualifCourtsInfo.textContent = "Erreur de chargement des données.";
    return;
  }

  const pouleMatches = qualifMatches.filter((m) => m.phase === "qualif_poule");
  const barrageMatches = qualifMatches.filter((m) => m.phase !== "qualif_poule");

  if (pouleMatches.length === 0) {
    qualifCourtsInfo.textContent = "L'ordre des matchs de qualification sera affiché ici dès que les poules de qualif seront générées.";
    qualifCourtsList.innerHTML = "";
    return;
  }

  qualifCourtsInfo.textContent = "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  renderQualifCourts(teamsById, pouleMatches, barrageMatches);
}

function teamLabel(teamId, teamsById) {
  if (!teamId) return "À déterminer";
  return formatTeamShort(teamsById.get(teamId));
}

// Les 4 cartes "Terrain N" d'une journée. `findPoolMatch(category, poolLabel, index)`
// et `findSlotMatch(category, slot)` disent où trouver le match d'une case du planning.
function renderCourtCards(container, scheduleRows, findPoolMatch, findSlotMatch, teamsById) {
  container.innerHTML = "";

  COURTS.forEach((court) => {
    const card = document.createElement("div");
    card.className = "pool-card";

    const title = document.createElement("h3");
    title.textContent = `Terrain ${court.terrain}`;
    card.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "form-message";
    subtitle.textContent = court.category;
    card.appendChild(subtitle);

    const terrainIndex = GENDER_TERRAINS[court.category].indexOf(court.terrain);
    const rows = [];
    scheduleRows.forEach((scheduleRow) => {
      const cell = scheduleCell(scheduleRow, terrainIndex);
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

    appendPhaseSection(card, "Programme", rows, `${container.id}-terrain-${court.terrain}`);
    container.appendChild(card);
  });
}

function renderCourts(pools, teamsById, poolMatches, bracketMatches) {
  const matchesByPool = new Map();
  poolMatches
    .slice()
    .sort((a, b) => a.id - b.id)
    .forEach((m) => {
      if (!matchesByPool.has(m.pool_id)) matchesByPool.set(m.pool_id, []);
      matchesByPool.get(m.pool_id).push(m);
    });

  renderCourtCards(
    courtsList,
    schedules.maindraw,
    (category, poolLabel, index) => {
      const pool = pools.find((p) => p.category === category && p.label === poolLabel);
      return pool ? (matchesByPool.get(pool.id) || [])[index] : null;
    },
    (category, slot) => bracketMatches.find((m) => m.category === category && m.slot === slot),
    teamsById
  );
}

function renderQualifCourts(teamsById, pouleMatches, barrageMatches) {
  const all = [...pouleMatches, ...barrageMatches];
  renderCourtCards(
    qualifCourtsList,
    schedules.qualif,
    () => null,
    (category, slot) => all.find((m) => m.category === category && m.slot === slot),
    teamsById
  );
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
// (ordre-des-matchs.html?day=qualif&anchor=slot:qb5) : bascule sur le bon onglet,
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

// Les onglets Qualif/Main-draw n'existent que si la formule active comporte des
// qualifications ; sinon, comportement inchangé (juste le Main-draw, pas d'onglets).
async function loadAllCourts(options = {}) {
  const settings = await fetchTournamentSettings();
  schedules = buildSchedules(settings);
  const hasQualifs = settings.format === "12-quali16";
  await Promise.all([hasQualifs ? loadQualifCourts(options) : null, loadCourts(options)]);
  return hasQualifs;
}

async function checkFormatAndInit() {
  const hasQualifs = await loadAllCourts();
  if (hasQualifs) dayTabs.hidden = false;

  if (hasQualifs) {
    const requestedDay = new URLSearchParams(window.location.search).get("day");
    switchDay(requestedDay === "maindraw" ? "maindraw" : "qualif");
  }

  handleDeepLink();
}

checkFormatAndInit();
// Réglages d'horaires relus à chaque fois : un changement côté admin se voit aussi.
onAutoRefresh(loadAllCourts);
