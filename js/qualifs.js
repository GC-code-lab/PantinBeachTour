// Page publique "Qualifications" (formule "12-quali16" uniquement) : 4 poules
// brésiliennes (tour 1 = 1v4/2v3, tour 2 = vainqueurs/perdants entre eux) puis
// les 8 barrages de qualification. Lecture seule, même esprit que js/poules.js.

const poolsList = document.getElementById("qualif-pools-list");
const barragesList = document.getElementById("qualif-barrages-list");
const qualifiedList = document.getElementById("qualified-list");
const categoryButtons = document.querySelectorAll(".category-button");

let currentCategory = "Hommes";

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentCategory));
    loadQualifs();
  });
});

// Sous-onglets "Poules" / "Barrages" de cette page.
const subTabButtons = document.querySelectorAll(".tab-button[data-subtab]");
const subTabPanels = {
  poules: document.getElementById("subtab-poules"),
  barrages: document.getElementById("subtab-barrages"),
};

subTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.subtab;
    subTabButtons.forEach((b) => b.classList.toggle("active", b === button));
    Object.entries(subTabPanels).forEach(([key, panel]) => {
      panel.hidden = key !== tab;
    });
  });
});

// Croisement connu à l'avance par le format (toujours affiché, même avant que les
// poules de qualif soient jouées), avec un libellé explicite pour le 2e tour :
// "Vainqueur du Barrage 2" plutôt qu'un "À déterminer" générique.
function qualifBarrageLabel(slot) {
  return `Barrage ${slot.slice(2)}`;
}

function qualifPlaceholder(slot, index) {
  return slotPlaceholder(slot, index, { sourceLabel: (source) => `du ${qualifBarrageLabel(source)}` });
}

// Une ligne de match de poule de qualif (lecture seule).
function renderMatchRow(match, teamsById, { label } = {}) {
  const team1 = match ? teamsById.get(match.team1_id) : null;
  const team2 = match ? teamsById.get(match.team2_id) : null;
  const sets = (match && match.sets) || [];

  const row = document.createElement("div");
  row.className = match && match.status === "termine" ? "match-row match-row-done" : "match-row";

  if (label) {
    const tag = document.createElement("span");
    tag.className = "match-order-tag";
    tag.textContent = label;
    row.appendChild(tag);
  }

  const team1Span = document.createElement("span");
  team1Span.className = "match-team";
  team1Span.textContent = team1 ? formatTeamShort(team1) : "À déterminer";
  row.appendChild(team1Span);

  if (sets.length > 0) {
    const score = document.createElement("span");
    score.className = "match-score";
    score.textContent = formatSetsScore(sets);
    row.appendChild(score);
  } else {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "À venir";
    row.appendChild(badge);
  }

  const team2Span = document.createElement("span");
  team2Span.className = "match-team team2";
  team2Span.textContent = team2 ? formatTeamShort(team2) : "À déterminer";
  row.appendChild(team2Span);

  return row;
}

function renderStandingsList(teamsRanked) {
  const list = document.createElement("ol");
  list.className = "qualif-standings-list";
  teamsRanked.forEach((team) => {
    const item = document.createElement("li");
    item.textContent = team ? formatTeamDetail(team) : "?";
    list.appendChild(item);
  });
  return list;
}

function renderPoules(teamsById, pouleMatches) {
  poolsList.innerHTML = "";

  if (pouleMatches.length === 0) {
    poolsList.textContent = "Les poules de qualification seront affichées ici dès que le tirage sera fait.";
    return;
  }

  const bySlot = new Map(pouleMatches.map((m) => [m.slot, m]));

  ["A", "B", "C", "D"].forEach((letter) => {
    const r1a = bySlot.get(`q${letter}-r1-1`);
    const r1b = bySlot.get(`q${letter}-r1-2`);
    const r2w = bySlot.get(`q${letter}-r2-w`);
    const r2l = bySlot.get(`q${letter}-r2-l`);
    if (!r1a || !r1b) return;

    const card = document.createElement("div");
    card.className = "pool-card";

    const title = document.createElement("h3");
    title.textContent = `Poule Qualif ${letter}`;
    card.appendChild(title);

    // Ordre tête de série (1,2,3,4) dans la poule — r1a oppose 1 et 4 (team1/team2),
    // r1b oppose 2 et 3 : lister tel quel donnerait 1,4,2,3, pas l'ordre attendu.
    const list = document.createElement("ul");
    [r1a.team1_id, r1b.team1_id, r1b.team2_id, r1a.team2_id].forEach((id) => {
      const team = teamsById.get(id);
      if (!team) return;
      const item = document.createElement("li");
      item.textContent = formatTeamDetail(team);
      list.appendChild(item);
    });
    card.appendChild(list);

    const matchesSection = createCollapsibleSection("Matchs et résultats");
    [r1a, r1b, r2w, r2l].forEach((match) => {
      if (!match) return;
      matchesSection.content.appendChild(renderMatchRow(match, teamsById));
    });
    card.appendChild(matchesSection.section);

    const standingsSection = createCollapsibleSection("Classement");
    const standingIds = computeBresilienneStandings(letter, bySlot);
    const standings = standingIds && standingIds.map((id) => teamsById.get(id));
    if (!standings) {
      const note = document.createElement("p");
      note.className = "form-message";
      note.textContent = "Classement à venir.";
      standingsSection.content.appendChild(note);
    } else {
      standingsSection.content.appendChild(renderStandingsList(standings));
    }
    card.appendChild(standingsSection.section);

    poolsList.appendChild(card);
  });
}

// Tableau visuel des barrages de qualif, même esprit que le tableau des phases
// finales (js/bracket-render.js) : boîtes reliées par des lignes. Contrairement au
// tableau du Maindraw, ce n'est pas un arbre qui converge (8 -> 4 -> 2 -> 1) mais
// 2 tours en parallèle de 4 matchs chacun, reliés 1 pour 1 (qb1->qb6, qb2->qb5,
// qb3->qb8, qb4->qb7) : l'ordre d'affichage du 2e tour est donc réarrangé en
// [qb6, qb5, qb8, qb7] pour aligner chaque croisement sur la même ligne et éviter
// que les lignes de connexion se croisent visuellement.
// Dimensions identiques à js/bracket-render.js (dupliquées ici : cette page ne
// charge pas ce fichier, et la structure du tableau est trop différente pour
// réutiliser renderBracket tel quel — voir plus bas).
const QB_BOX_WIDTH = 220;
const QB_BOX_HEIGHT = 67;
const QB_ITEM_GAP = 20;
const QB_COL_GAP = 60;

const QUALIF_BARRAGE_ROUNDS = [
  { label: "Barrages (1er tour)", slots: ["qb1", "qb2", "qb3", "qb4"] },
  { label: "Barrages (2e tour)", slots: ["qb6", "qb5", "qb8", "qb7"] },
];

function createBarrageMatchBox(match, teamsById, x, y, slot) {
  const box = document.createElement("div");
  box.className = "bracket-match";
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  box.style.width = `${QB_BOX_WIDTH}px`;

  const team1 = match ? teamsById.get(match.team1_id) : null;
  const team2 = match ? teamsById.get(match.team2_id) : null;

  const team1Div = document.createElement("div");
  team1Div.className = "bracket-team";
  team1Div.textContent = team1 ? formatTeamShort(team1) : qualifPlaceholder(slot, 0);
  box.appendChild(team1Div);

  const team2Div = document.createElement("div");
  team2Div.className = "bracket-team";
  team2Div.textContent = team2 ? formatTeamShort(team2) : qualifPlaceholder(slot, 1);
  box.appendChild(team2Div);

  const sets = (match && match.sets) || [];
  const scoreLine = document.createElement("div");
  if (sets.length > 0) {
    scoreLine.className = "bracket-score";
    scoreLine.textContent = formatSetsScore(sets);
  } else {
    scoreLine.className = "badge bracket-score";
    scoreLine.textContent = "?";
  }
  box.appendChild(scoreLine);

  return box;
}

// Trace une ligne droite (segment SVG) entre deux points — identique à bracketSvgLine
// de js/bracket-render.js, dupliqué ici pour ne pas dépendre de ce fichier (structure
// trop différente pour réutiliser renderBracket tel quel).
function barrageSvgLine(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", "bracket-connector");
  return line;
}

// Les 8 croisements sont toujours affichés, même avant que les poules de qualif
// soient jouées — avec les placeholders fixes (ex: "2e Poule A") tant que l'équipe
// réelle n'est pas encore connue, pour que les joueurs voient le chemin complet.
function renderBarrages(teamsById, barrage1Matches, barrage2Matches) {
  barragesList.innerHTML = "";

  const bySlot = new Map([...barrage1Matches, ...barrage2Matches].map((m) => [m.slot, m]));
  const centerY = (k) => k * (QB_BOX_HEIGHT + QB_ITEM_GAP) + QB_BOX_HEIGHT / 2;
  const totalWidth = QUALIF_BARRAGE_ROUNDS.length * QB_BOX_WIDTH + (QUALIF_BARRAGE_ROUNDS.length - 1) * QB_COL_GAP;
  const totalHeight = 4 * QB_BOX_HEIGHT + 3 * QB_ITEM_GAP;

  const scroller = document.createElement("div");
  scroller.className = "bracket-scroller";

  const titles = document.createElement("div");
  titles.className = "bracket-titles";
  titles.style.width = `${totalWidth}px`;
  QUALIF_BARRAGE_ROUNDS.forEach((round, i) => {
    const title = document.createElement("span");
    title.style.left = `${i * (QB_BOX_WIDTH + QB_COL_GAP)}px`;
    title.style.width = `${QB_BOX_WIDTH}px`;
    title.textContent = round.label;
    titles.appendChild(title);
  });
  scroller.appendChild(titles);

  const tree = document.createElement("div");
  tree.className = "bracket-tree";
  tree.style.width = `${totalWidth}px`;
  tree.style.height = `${totalHeight}px`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", totalWidth);
  svg.setAttribute("height", totalHeight);
  svg.classList.add("bracket-connectors");

  QUALIF_BARRAGE_ROUNDS.forEach((round, i) => {
    const x = i * (QB_BOX_WIDTH + QB_COL_GAP);

    round.slots.forEach((slot, k) => {
      const y = centerY(k) - QB_BOX_HEIGHT / 2;
      tree.appendChild(createBarrageMatchBox(bySlot.get(slot), teamsById, x, y, slot));
    });

    if (i === QUALIF_BARRAGE_ROUNDS.length - 1) return;

    const boxRight = x + QB_BOX_WIDTH;
    const nextBoxLeft = boxRight + QB_COL_GAP;
    round.slots.forEach((slot, k) => {
      const y = centerY(k);
      svg.appendChild(barrageSvgLine(boxRight, y, nextBoxLeft, y));
    });
  });

  tree.appendChild(svg);
  scroller.appendChild(tree);
  barragesList.appendChild(scroller);
}

// Dès qu'un barrage du 2e tour (qb5-qb8) est tranché, son vainqueur rejoint cette
// liste — pas besoin d'attendre que les 4 soient connus pour commencer à l'afficher.
function renderQualified(teamsById, barrage2Matches) {
  qualifiedList.innerHTML = "";

  const slots = ["qb5", "qb6", "qb7", "qb8"];
  const bySlot = new Map(barrage2Matches.map((m) => [m.slot, m]));
  const qualifiedTeams = slots
    .map((slot) => bySlot.get(slot))
    .filter(Boolean)
    .map((match) => matchResult(match))
    .filter(Boolean)
    .map((result) => teamsById.get(result.winnerId))
    .filter(Boolean);

  if (qualifiedTeams.length === 0) {
    const note = document.createElement("p");
    note.className = "form-message";
    note.textContent = "Les équipes qualifiées apparaîtront ici au fur et à mesure.";
    qualifiedList.appendChild(note);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "qualified-grid";

  qualifiedTeams.forEach((team) => {
    const card = document.createElement("div");
    card.className = "qualified-card";

    const emoji = document.createElement("div");
    emoji.className = "qualified-emoji";
    emoji.textContent = "✅";
    card.appendChild(emoji);

    const name = document.createElement("div");
    name.className = "qualified-name";
    name.textContent = formatTeamDetail(team);
    card.appendChild(name);

    const tag = document.createElement("div");
    tag.className = "qualified-tag";
    tag.textContent = "Qualifié pour le Maindraw !";
    card.appendChild(tag);

    grid.appendChild(card);
  });

  qualifiedList.appendChild(grid);
}

async function loadQualifs() {
  const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] = await Promise.all([
    supabaseClient.from("teams").select("*").eq("category", currentCategory),
    supabaseClient.from("matches").select("*, sets(*)").eq("category", currentCategory).in("phase", PHASES_QUALIF),
  ]);

  if (teamsError || matchesError) {
    poolsList.textContent = "Erreur de chargement des qualifications.";
    return;
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const pouleMatches = matches.filter((m) => m.phase === "qualif_poule");
  const barrage1Matches = matches.filter((m) => m.phase === "qualif_barrage1");
  const barrage2Matches = matches.filter((m) => m.phase === "qualif_barrage2");

  renderPoules(teamsById, pouleMatches);
  renderBarrages(teamsById, barrage1Matches, barrage2Matches);
  renderQualified(teamsById, barrage2Matches);
}

loadQualifs();
