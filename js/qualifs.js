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

// Numéro affiché devant chaque barrage, et croisement connu à l'avance par le format
// (toujours affiché, même avant que les poules de qualif soient jouées) — même
// convention que côté admin (js/gestion.js) et "Ordre des matchs".
const QUALIF_BARRAGE_LABELS = {
  qb1: "Barrage 1",
  qb2: "Barrage 2",
  qb3: "Barrage 3",
  qb4: "Barrage 4",
  qb5: "Barrage 5",
  qb6: "Barrage 6",
  qb7: "Barrage 7",
  qb8: "Barrage 8",
};

const QUALIF_BARRAGE_PLACEHOLDERS = {
  qb1: ["2e Poule A", "3e Poule C"],
  qb2: ["2e Poule B", "3e Poule D"],
  qb3: ["2e Poule C", "3e Poule A"],
  qb4: ["2e Poule D", "3e Poule B"],
  qb5: ["1er Poule A", "Vainqueur du Barrage 2"],
  qb6: ["1er Poule B", "Vainqueur du Barrage 1"],
  qb7: ["1er Poule C", "Vainqueur du Barrage 4"],
  qb8: ["1er Poule D", "Vainqueur du Barrage 3"],
};

function matchTeamLabel(team) {
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
}

function formatTeamDetail(team) {
  return `${team.player1_prenom} ${team.player1_nom} / ${team.player2_prenom} ${team.player2_nom}`;
}

function formatSetsScore(sets) {
  return sets
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => `${set.score_team1}-${set.score_team2}`)
    .join(" / ");
}

// Un bouton-titre repliable + son contenu (identique à js/poules.js), replié par défaut.
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

  return { header, content, section };
}

// `match` peut être absent (pas encore créé côté admin) — dans ce cas, `placeholders`
// (un tableau [texte équipe 1, texte équipe 2]) prend le relais pour afficher le
// croisement connu à l'avance par le format, plutôt qu'un "À déterminer" générique.
function renderMatchRow(match, teamsById, { label, placeholders } = {}) {
  const team1 = match ? teamsById.get(match.team1_id) : null;
  const team2 = match ? teamsById.get(match.team2_id) : null;
  const sets = (match && match.sets) || [];

  const row = document.createElement("div");
  row.className = "match-row";

  if (label) {
    const tag = document.createElement("span");
    tag.className = "match-order-tag";
    tag.textContent = label;
    row.appendChild(tag);
  }

  const team1Span = document.createElement("span");
  team1Span.className = "match-team";
  team1Span.textContent = team1 ? matchTeamLabel(team1) : (placeholders && placeholders[0]) || "À déterminer";
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
  team2Span.textContent = team2 ? matchTeamLabel(team2) : (placeholders && placeholders[1]) || "À déterminer";
  row.appendChild(team2Span);

  return row;
}

// Vainqueur/perdant d'un match tranché (il faut 2 sets gagnés) — null si pas encore joué.
function matchWinnerLoser(match) {
  const sets = (match && match.sets) || [];
  const wins1 = sets.filter((s) => s.score_team1 > s.score_team2).length;
  const wins2 = sets.filter((s) => s.score_team2 > s.score_team1).length;
  if (wins1 >= 2) return { winnerId: match.team1_id, loserId: match.team2_id };
  if (wins2 >= 2) return { winnerId: match.team2_id, loserId: match.team1_id };
  return null;
}

// Classement 1-2-3-4 d'une poule brésilienne : vainqueur/perdant du match des
// vainqueurs (places 1-2), puis vainqueur/perdant du match des perdants (3-4).
function computeBresilienneStandings(r2w, r2l, teamsById) {
  if (!r2w || !r2l) return null;
  const roundWinners = matchWinnerLoser(r2w);
  const roundLosers = matchWinnerLoser(r2l);
  if (!roundWinners || !roundLosers) return null;
  return [roundWinners.winnerId, roundWinners.loserId, roundLosers.winnerId, roundLosers.loserId].map(
    (id) => teamsById.get(id)
  );
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
    const standings = computeBresilienneStandings(r2w, r2l, teamsById);
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

// Les 8 croisements sont toujours affichés, même avant que les poules de qualif
// soient jouées — avec les placeholders fixes (ex: "2e Poule A") tant que l'équipe
// réelle n'est pas encore connue, pour que les joueurs voient le chemin complet.
function renderBarrages(teamsById, barrage1Matches, barrage2Matches) {
  barragesList.innerHTML = "";

  const bySlot = new Map([...barrage1Matches, ...barrage2Matches].map((m) => [m.slot, m]));
  const slots = ["qb1", "qb2", "qb3", "qb4", "qb5", "qb6", "qb7", "qb8"];

  const card = document.createElement("div");
  card.className = "pool-card";

  const barragesSection = createCollapsibleSection("Barrages de qualification");
  slots.forEach((slot) => {
    barragesSection.content.appendChild(
      renderMatchRow(bySlot.get(slot), teamsById, {
        label: QUALIF_BARRAGE_LABELS[slot],
        placeholders: QUALIF_BARRAGE_PLACEHOLDERS[slot],
      })
    );
  });
  card.appendChild(barragesSection.section);

  barragesList.appendChild(card);
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
    .map((match) => matchWinnerLoser(match))
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
  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .eq("category", currentCategory);

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", currentCategory)
    .in("phase", ["qualif_poule", "qualif_barrage1", "qualif_barrage2"]);

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
