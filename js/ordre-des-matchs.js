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

// Terrains (GENDER_TERRAINS, COURTS) et plannings (MAINDRAW_SCHEDULE, QUALIF_SCHEDULE) :
// voir js/tournoi-commun.js — partagés avec la page "Suivi d'équipe".

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

async function loadCourts() {
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
    courtsInfo.textContent = "Erreur de chargement des données.";
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
async function loadQualifCourts() {
  const [{ data: teams, error: teamsError }, { data: qualifMatches, error: qualifError }] = await Promise.all([
    supabaseClient.from("teams").select("*"),
    supabaseClient.from("matches").select("*, sets(*)").in("phase", PHASES_QUALIF),
  ]);

  if (teamsError || qualifError) {
    qualifCourtsInfo.textContent = "Erreur de chargement des données.";
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

function renderCourts(pools, teamsById, poolMatches, bracketMatches) {
  courtsList.innerHTML = "";

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

    appendPhaseSection(card, "Programme", buildMainDrawRows(court, pools, poolMatches, bracketMatches, teamsById));

    courtsList.appendChild(card);
  });
}

function renderQualifCourts(teamsById, pouleMatches, barrageMatches) {
  qualifCourtsList.innerHTML = "";

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

    appendPhaseSection(card, "Programme", buildQualifRows(court, pouleMatches, barrageMatches, teamsById));

    qualifCourtsList.appendChild(card);
  });
}

function appendPhaseSection(card, title, rows) {
  const { section, content } = createCollapsibleSection(title);

  if (rows.length === 0) {
    content.appendChild(createNote("Pas encore disponible."));
  } else {
    rows.forEach((row) => content.appendChild(row));
  }

  card.appendChild(section);
}

// Construit, pour UN terrain, la liste des lignes dans l'ordre chronologique du
// MAINDRAW_SCHEDULE — en sautant les matchs de poule qui n'existent pas encore (poules
// pas tirées), mais en affichant toujours les lignes de phases finales (avec les
// croisements connus à l'avance tant que le vrai match n'existe pas).
function buildMainDrawRows(court, pools, poolMatches, bracketMatches, teamsById) {
  const terrainIndex = GENDER_TERRAINS[court.category].indexOf(court.terrain);
  const rows = [];

  MAINDRAW_SCHEDULE.forEach((entry) => {
    if (entry.kind === "poolPair") {
      const poolLabel = entry.pools[terrainIndex];
      const pool = pools.find((p) => p.category === court.category && p.label === poolLabel);
      if (!pool) return;
      const matches = poolMatches
        .filter((m) => m.pool_id === pool.id)
        .sort((a, b) => a.id - b.id);
      const match = matches[entry.round];
      if (!match) return;
      rows.push(renderMatchRow(`${poolLabel} · Tour ${entry.round + 1}`, match, teamsById, null, entry.time, court.category));
    } else if (entry.kind === "slotPair") {
      const slot = entry.slots[terrainIndex];
      const match = bracketMatches.find((m) => m.category === court.category && m.slot === slot);
      rows.push(renderMatchRow(slotLabel(slot), match, teamsById, slot, entry.time, court.category));
    }
  });

  return rows;
}

// Pendant de buildMainDrawRows ci-dessus pour la journée "Qualif" — voir QUALIF_SCHEDULE.
function buildQualifRows(court, pouleMatches, barrageMatches, teamsById) {
  const terrainIndex = GENDER_TERRAINS[court.category].indexOf(court.terrain);

  const pouleBySlot = new Map(
    pouleMatches.filter((m) => m.category === court.category).map((m) => [m.slot, m])
  );
  const barrageBySlot = new Map(
    barrageMatches.filter((m) => m.category === court.category).map((m) => [m.slot, m])
  );

  const rows = [];

  QUALIF_SCHEDULE.forEach((entry) => {
    if (entry.kind === "poolRound") {
      const slots = qualifRoundSlots(entry.poolLetter, entry.round);
      const slot = slots[terrainIndex];
      const match = pouleBySlot.get(slot);
      if (!match) return;
      rows.push(
        renderMatchRow(
          `Poule Qualif ${entry.poolLetter} · Tour ${entry.round + 1}`,
          match,
          teamsById,
          null,
          entry.time,
          court.category
        )
      );
    } else if (entry.kind === "slotPair") {
      const slot = entry.slots[terrainIndex];
      const match = barrageBySlot.get(slot);
      rows.push(renderMatchRow(slotLabel(slot), match, teamsById, slot, entry.time, court.category));
    }
  });

  return rows;
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
  row.dataset.anchor = slot ? `slot:${category}:${slot}` : match ? `match:${match.id}` : "";

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

    const content = target.closest(".pool-card-content");
    if (content && content.hidden) {
      content.hidden = false;
      const header = content.previousElementSibling;
      if (header && header.classList.contains("pool-card-header")) {
        header.setAttribute("aria-expanded", "true");
      }
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("match-row-highlight");
    setTimeout(() => target.classList.remove("match-row-highlight"), 2500);
  });
}

// Les onglets Qualif/Main-draw n'existent que si la formule active comporte des
// qualifications ; sinon, comportement inchangé (juste le Main-draw, pas d'onglets).
async function checkFormatAndInit() {
  const hasQualifs = (await fetchTournamentFormat()) === "12-quali16";

  if (hasQualifs) dayTabs.hidden = false;
  await Promise.all([hasQualifs ? loadQualifCourts() : null, loadCourts()]);

  if (hasQualifs) {
    const requestedDay = new URLSearchParams(window.location.search).get("day");
    switchDay(requestedDay === "maindraw" ? "maindraw" : "qualif");
  }

  handleDeepLink();
}

checkFormatAndInit();
