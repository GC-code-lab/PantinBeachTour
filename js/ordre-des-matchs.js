const courtsInfo = document.getElementById("courts-info");
const courtsList = document.getElementById("courts-list");

// Les matchs de poule se jouent par TOUR : dans une poule de 4, le tour 1 (1v4 et 2v3),
// le tour 2 (1v3 et 2v4), le tour 3 (1v2 et 3v4) — les 2 matchs d'un même tour sont
// joués EN MÊME TEMPS, chacun sur un des 2 terrains de la catégorie (Hommes : 1 et 4 ;
// Femmes : 2 et 3 — le 1er terrain de la paire reçoit le 1er match du tour, le 2e
// terrain le 2e match). Une poule utilise donc les 2 terrains de sa catégorie pour la
// durée de ses 3 tours, puis c'est au tour de la poule suivante dans la file — les
// deux files (Hommes / Femmes) tournent en parallèle, indépendamment l'une de l'autre.
const GENDER_TERRAINS = { Hommes: [1, 4], Femmes: [2, 3] };
const POOL_ORDER = {
  Hommes: ["Poule A", "Poule B", "Poule D", "Poule C"],
  Femmes: ["Poule A", "Poule B", "Poule C", "Poule D"],
};

// Répartition des 4 terrains pour les phases finales (indépendante de l'ordre des
// poules ci-dessus) : Poule A + Poule C alimentent un même chemin du tableau, Poule B +
// Poule D l'autre — BRACKET_PROGRESSION (voir js/gestion.js) fait rejoindre qf-1/qf-4
// au vainqueur de Poule A/C, qf-2/qf-3 au vainqueur de Poule B/D. Il n'y a que 2 demies
// au total (sf-1, sf-2), chacune mélangeant forcément les deux chemins : par convention,
// une demi par terrain — sf-1 avec la finale, sf-2 avec la petite finale.
const COURTS = [
  {
    terrain: 1,
    category: "Hommes",
    phasesFinalesSlots: ["barrage-1", "barrage-4", "qf-1", "qf-4", "sf-1", "finale"],
  },
  {
    terrain: 2,
    category: "Femmes",
    phasesFinalesSlots: ["barrage-2", "barrage-3", "qf-2", "qf-3", "sf-2", "petite-finale"],
  },
  {
    terrain: 3,
    category: "Femmes",
    phasesFinalesSlots: ["barrage-1", "barrage-4", "qf-1", "qf-4", "sf-1", "finale"],
  },
  {
    terrain: 4,
    category: "Hommes",
    phasesFinalesSlots: ["barrage-2", "barrage-3", "qf-2", "qf-3", "sf-2", "petite-finale"],
  },
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
  return slot;
}

// Croisements connus à l'avance par le format du tournoi (indépendants des résultats),
// affichés tant que le vrai match/l'équipe correspondante n'existe pas encore — mêmes
// libellés que la page publique "Phases finales" (js/phases-finales.js).
const SLOT_PLACEHOLDERS = {
  "barrage-1": ["2e Poule C", "3e Poule B"],
  "barrage-2": ["2e Poule B", "3e Poule C"],
  "barrage-3": ["2e Poule D", "3e Poule A"],
  "barrage-4": ["2e Poule A", "3e Poule D"],
  "qf-1": ["1er Poule A", "Vainqueur Barrage 1"],
  "qf-2": ["1er Poule D", "Vainqueur Barrage 2"],
  "qf-3": ["1er Poule B", "Vainqueur Barrage 3"],
  "qf-4": ["1er Poule C", "Vainqueur Barrage 4"],
  "sf-1": ["TBD", "TBD"],
  "sf-2": ["TBD", "TBD"],
  finale: ["TBD", "TBD"],
  "petite-finale": ["TBD", "TBD"],
};

function slotTeamLabel(match, teamsById, slot, index) {
  const teamId = match ? (index === 0 ? match.team1_id : match.team2_id) : null;
  if (teamId) return teamLabel(teamId, teamsById);
  const placeholder = SLOT_PLACEHOLDERS[slot];
  return placeholder ? placeholder[index] : "À déterminer";
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

function teamLabel(teamId, teamsById) {
  if (!teamId) return "À déterminer";
  const team = teamsById.get(teamId);
  if (!team) return "?";
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
}

// Découpe les matchs d'une poule (déjà dans l'ordre de génération, donc méthode du
// cercle : 1v4,2v3,1v3,2v4,1v2,3v4) en tours de 2 matchs simultanés — le dernier tour
// d'une poule de 3 (round-robin à 3 matchs) n'a qu'un seul match, sans simultanéité
// possible (il reste sur le 1er terrain de la paire).
function chunkIntoRounds(matches) {
  const rounds = [];
  for (let i = 0; i < matches.length; i += 2) {
    rounds.push(matches.slice(i, i + 2));
  }
  return rounds;
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

    appendPhaseSection(card, "Poules", buildPoolRows(court, pools, poolMatches, teamsById));
    appendPhaseSection(
      card,
      "Phases finales",
      buildSlotRows(court.category, court.phasesFinalesSlots, bracketMatches, teamsById)
    );

    courtsList.appendChild(card);
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

// La liste des matchs de poule d'UN terrain : les poules de la catégorie (POOL_ORDER)
// alternent TOUR par tour — pas tous les tours de la poule A avant de passer à la
// poule B, mais tour 1 de A, tour 1 de B, tour 1 de D, tour 1 de C, puis tour 2 de A,
// tour 2 de B, etc. (1er terrain de la paire = 1er match du tour, 2e terrain = 2e
// match du tour).
function buildPoolRows(court, pools, poolMatches, teamsById) {
  const terrains = GENDER_TERRAINS[court.category];
  const terrainIndex = terrains.indexOf(court.terrain);

  const poolRounds = POOL_ORDER[court.category].map((poolLabel) => {
    const pool = pools.find((p) => p.category === court.category && p.label === poolLabel);
    if (!pool) return { poolLabel, rounds: [] };
    const matches = poolMatches.filter((match) => match.pool_id === pool.id);
    return { poolLabel, rounds: chunkIntoRounds(matches) };
  });

  const maxRounds = Math.max(0, ...poolRounds.map(({ rounds }) => rounds.length));

  const rows = [];
  for (let roundIndex = 0; roundIndex < maxRounds; roundIndex++) {
    poolRounds.forEach(({ poolLabel, rounds }) => {
      const match = rounds[roundIndex] && rounds[roundIndex][terrainIndex];
      if (!match) return;
      rows.push(renderMatchRow(`${poolLabel} · Tour ${roundIndex + 1}`, match, teamsById));
    });
  }

  return rows;
}

// Contrairement aux poules (où les équipes sont connues dès le tirage), les matchs de
// phases finales sont toujours affichés — avec les croisements connus à l'avance
// (SLOT_PLACEHOLDERS) tant que le vrai match n'existe pas encore côté admin.
function buildSlotRows(category, slots, bracketMatches, teamsById) {
  return slots.map((slot) => {
    const match = bracketMatches.find((m) => m.category === category && m.slot === slot);
    return renderMatchRow(slotLabel(slot), match, teamsById, slot);
  });
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

// `slot` n'est fourni que pour les matchs de phases finales : ça active l'affichage
// des croisements connus à l'avance (SLOT_PLACEHOLDERS) quand le match n'existe pas
// encore ou qu'une équipe n'est pas encore déterminée.
function renderMatchRow(label, match, teamsById, slot) {
  const row = document.createElement("div");
  row.className = match && match.status === "termine" ? "match-row match-row-done" : "match-row";

  const orderTag = document.createElement("span");
  orderTag.className = "match-order-tag";
  orderTag.textContent = label;
  row.appendChild(orderTag);

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

loadCourts();
