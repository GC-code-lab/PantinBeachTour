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

// Les 4 terrains, dédiés en dur à une catégorie chacun. Hommes utilise les terrains 2
// et 3, Femmes les terrains 1 et 4 — les deux catégories tournent en parallèle, chacune
// sur ses 2 terrains, en suivant le MÊME planning horaire (voir *_SCHEDULE ci-dessous).
const GENDER_TERRAINS = { Hommes: [2, 3], Femmes: [1, 4] };
const COURTS = [
  { terrain: 1, category: "Femmes" },
  { terrain: 2, category: "Hommes" },
  { terrain: 3, category: "Hommes" },
  { terrain: 4, category: "Femmes" },
];

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
  return slot;
}

// Croisements connus à l'avance par le format du tournoi (indépendants des résultats),
// affichés tant que le vrai match/l'équipe correspondante n'existe pas encore — mêmes
// libellés que la page publique "Phases finales".
const SLOT_PLACEHOLDERS = {
  "barrage-1": ["2e Poule C", "3e Poule B"],
  "barrage-2": ["2e Poule B", "3e Poule C"],
  "barrage-3": ["2e Poule D", "3e Poule A"],
  "barrage-4": ["2e Poule A", "3e Poule D"],
  "qf-1": ["1er Poule A", "Vainqueur Barrage 2"],
  "qf-2": ["1er Poule D", "Vainqueur Barrage 1"],
  "qf-3": ["1er Poule B", "Vainqueur Barrage 4"],
  "qf-4": ["1er Poule C", "Vainqueur Barrage 3"],
  "sf-1": ["TBD", "TBD"],
  "sf-2": ["TBD", "TBD"],
  finale: ["TBD", "TBD"],
  "petite-finale": ["TBD", "TBD"],
  qb1: ["2e Poule A", "3e Poule C"],
  qb2: ["2e Poule B", "3e Poule D"],
  qb3: ["2e Poule C", "3e Poule A"],
  qb4: ["2e Poule D", "3e Poule B"],
  qb5: ["1er Poule A", "Vainqueur Barrage qualif 2"],
  qb6: ["1er Poule B", "Vainqueur Barrage qualif 1"],
  qb7: ["1er Poule C", "Vainqueur Barrage qualif 4"],
  qb8: ["1er Poule D", "Vainqueur Barrage qualif 3"],
};

function slotTeamLabel(match, teamsById, slot, index) {
  const teamId = match ? (index === 0 ? match.team1_id : match.team2_id) : null;
  if (teamId) return teamLabel(teamId, teamsById);
  const placeholder = SLOT_PLACEHOLDERS[slot];
  return placeholder ? placeholder[index] : "À déterminer";
}

// --- Planning horaire du Main-draw (dimanche) ---
// Avec des poules de 3, un même pool n'a jamais 2 matchs simultanés en son sein (il n'y
// a qu'1 match par tour) : la simultanéité vient de 2 POULES DIFFÉRENTES jouées en même
// temps, chacune sur un des 2 terrains de la catégorie. Poule B et Poule C tournent
// ensemble (9h/10h/11h), Poule A et Poule D tournent ensemble, décalées d'une demi-heure
// (9h30/10h30/11h30) — sur les 2 MÊMES terrains, donc chaque terrain alterne entre ses 2
// poules. Un "poolPair" indique, pour ce terrain pair, quelle poule joue sur le 1er
// terrain de la paire et laquelle joue sur le 2e. Ensuite, barrages/quarts/demies/
// finales sont groupés par le chemin qu'ils alimentent (voir js/gestion.js,
// BRACKET_PROGRESSION) : barrage-1+barrage-2 ensemble (ils alimentent qf-1/qf-2, donc
// la demi 1), barrage-3+barrage-4 ensemble (qf-3/qf-4, demi 2).
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

// --- Planning horaire des qualifications (samedi) ---
// Contrairement au Main-draw, une poule de qualif (4 équipes, poule brésilienne) A bien
// 2 matchs simultanés en son sein à chaque tour (1v4+2v3, puis vainqueurs/perdants entre
// eux) — comme pour les poules de 4 équipes classiques. Donc ici, un "poolRound" = UNE
// poule occupe les 2 terrains pour son tour. Ordre de passage des poules : B, D, A, C
// (même ordre aux 2 tours). Puis les barrages de qualif sont groupés par poules
// concernées (B+D ensemble, A+C ensemble pour le 1er tour ; les croisements du 2e tour
// qui en découlent ensemble aussi) — voir generateQualifBarrages dans js/gestion.js.
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

async function loadCourts() {
  const { data: pools, error: poolsError } = await supabaseClient.from("pools").select("*");
  const { data: teams, error: teamsError } = await supabaseClient.from("teams").select("*");
  const { data: poolMatches, error: poolMatchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("phase", "poule")
    .order("id", { ascending: true });
  const { data: bracketMatches, error: bracketError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .in("phase", ["barrage", "quart", "demi", "petite_finale", "finale"]);

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
  const { data: teams, error: teamsError } = await supabaseClient.from("teams").select("*");
  const { data: qualifMatches, error: qualifError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .in("phase", ["qualif_poule", "qualif_barrage1", "qualif_barrage2"]);

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
  const team = teamsById.get(teamId);
  if (!team) return "?";
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
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

    appendPhaseSection(card, "Poules", buildMainDrawRows(court, pools, poolMatches, bracketMatches, teamsById));

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

// Un bouton-titre repliable + son contenu (replié par défaut), même pattern que
// les sections "Matchs et résultats"/"Classement" de la page publique Poules.
function createCollapsibleSection(title) {
  const header = document.createElement("button");
  header.type = "button";
  header.className = "pool-card-header";
  header.setAttribute("aria-expanded", "false");

  const labelSpan = document.createElement("span");
  labelSpan.textContent = title;
  header.appendChild(labelSpan);

  const chevron = document.createElement("span");
  chevron.className = "pool-card-chevron";
  chevron.textContent = "▾";
  header.appendChild(chevron);

  const content = document.createElement("div");
  content.className = "pool-card-content";
  content.hidden = true;

  header.addEventListener("click", () => {
    const isOpen = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", String(!isOpen));
    content.hidden = isOpen;
  });

  const section = document.createElement("div");
  section.className = "pool-card-section";
  section.appendChild(header);
  section.appendChild(content);

  return { section, content };
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

function createNote(text) {
  const note = document.createElement("p");
  note.className = "form-message";
  note.textContent = text;
  return note;
}

function formatSetsScore(sets) {
  return sets
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => `${set.score_team1}-${set.score_team2}`)
    .join(" / ");
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
  const { data } = await supabaseClient.from("tournament_formats").select("format").maybeSingle();
  const hasQualifs = data && data.format === "12-quali16";

  if (hasQualifs) {
    dayTabs.hidden = false;
    await loadQualifCourts();
  }

  await loadCourts();

  if (hasQualifs) {
    const requestedDay = new URLSearchParams(window.location.search).get("day");
    switchDay(requestedDay === "maindraw" ? "maindraw" : "qualif");
  }

  handleDeepLink();
}

checkFormatAndInit();
