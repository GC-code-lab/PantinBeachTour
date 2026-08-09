const bracket = document.getElementById("bracket");

// Géométrie du tableau, en pixels — tout est positionné en absolu à partir de ces
// constantes (pas de mise en page flexbox approximative) pour que les lignes de
// connexion tombent exactement sur les boîtes de match.
const BOX_WIDTH = 220;
const BOX_HEIGHT = 67;
const ITEM_GAP = 20;
const COL_GAP = 60;
const PETITE_FINALE_GAP = 40;

const ROUNDS = [
  { phase: "barrage", label: "Barrages", slots: ["barrage-1", "barrage-2", "barrage-3", "barrage-4"] },
  { phase: "quart", label: "Quarts de finale", slots: ["qf-1", "qf-2", "qf-3", "qf-4"] },
  { phase: "demi", label: "Demi-finales", slots: ["sf-1", "sf-2"] },
  { phase: "finale", label: "Finales", slots: ["finale"] },
];

const BASE_HEIGHT = 4 * BOX_HEIGHT + 3 * ITEM_GAP;
// La finale est centrée sur BASE_HEIGHT / 2 ; il faut assez de place sous elle
// pour la petite finale (même colonne, sans décaler la boîte de la finale).
const TREE_HEIGHT = Math.max(
  BASE_HEIGHT,
  BASE_HEIGHT / 2 + BOX_HEIGHT / 2 + PETITE_FINALE_GAP + BOX_HEIGHT
);

const categoryButtons = document.querySelectorAll(".category-button");
let currentCategory = "Hommes";

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentCategory));
    loadBracket();
  });
});

async function loadBracket() {
  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .eq("category", currentCategory);

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", currentCategory)
    .in("phase", ["barrage", "quart", "demi", "petite_finale", "finale"]);

  if (teamsError || matchesError) {
    bracket.textContent = "Erreur de chargement du tableau.";
    return;
  }

  renderBracket(teams, matches);
}

function teamLabel(teamId, teamsById) {
  if (!teamId) return "À déterminer";
  const team = teamsById.get(teamId);
  if (!team) return "?";
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
}

function formatSetsScore(sets) {
  return sets
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => `${set.score_team1}-${set.score_team2}`)
    .join(" / ");
}

// Centre vertical (en px) de l'élément k (0-indexé) dans une colonne où les
// éléments sont empilés, chacun de hauteur BOX_HEIGHT séparés de ITEM_GAP.
function stackedCenterY(k) {
  const top = k * (BOX_HEIGHT + ITEM_GAP);
  return top + BOX_HEIGHT / 2;
}

// Centre vertical d'un match du tableau, calculé à partir de sa position dans son
// tour : barrages/quarts sont alignés 1 pour 1 (même position) ; demies/finale sont
// positionnées exactement au milieu de leurs deux matchs "sources" du tour précédent.
function computeCenters() {
  const centers = {};

  ROUNDS[0].slots.forEach((slot, k) => {
    centers[slot] = stackedCenterY(k);
  });
  ROUNDS[1].slots.forEach((slot, k) => {
    centers[slot] = stackedCenterY(k);
  });

  const quarts = ROUNDS[1].slots;
  ROUNDS[2].slots.forEach((slot, k) => {
    centers[slot] = (centers[quarts[2 * k]] + centers[quarts[2 * k + 1]]) / 2;
  });

  const demis = ROUNDS[2].slots;
  centers[ROUNDS[3].slots[0]] = (centers[demis[0]] + centers[demis[1]]) / 2;

  return centers;
}

function createMatchBox(match, teamsById, x, y) {
  const box = document.createElement("div");
  box.className = "bracket-match";
  box.style.left = `${x}px`;
  box.style.width = `${BOX_WIDTH}px`;
  box.style.top = `${y}px`;

  const team1 = document.createElement("div");
  team1.className = "bracket-team";
  team1.textContent = teamLabel(match ? match.team1_id : null, teamsById);
  box.appendChild(team1);

  const team2 = document.createElement("div");
  team2.className = "bracket-team";
  team2.textContent = teamLabel(match ? match.team2_id : null, teamsById);
  box.appendChild(team2);

  const sets = match && match.sets ? match.sets : [];
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

// Vainqueur/perdant d'un match d'après ses sets (il faut 2 sets gagnés, comme
// partout ailleurs pour les matchs à élimination). Retourne null si pas encore décidé.
function matchResult(match) {
  const sets = (match && match.sets) || [];
  const wins1 = sets.filter((s) => s.score_team1 > s.score_team2).length;
  const wins2 = sets.filter((s) => s.score_team2 > s.score_team1).length;
  if (wins1 >= 2) return { winnerId: match.team1_id, loserId: match.team2_id };
  if (wins2 >= 2) return { winnerId: match.team2_id, loserId: match.team1_id };
  return null;
}

function renderPodium(matchBySlot, teamsById) {
  const finaleResult = matchResult(matchBySlot.get("finale"));
  const petiteFinaleResult = matchResult(matchBySlot.get("petite-finale"));

  const first = finaleResult ? teamLabel(finaleResult.winnerId, teamsById) : "?";
  const second = finaleResult ? teamLabel(finaleResult.loserId, teamsById) : "?";
  const third = petiteFinaleResult ? teamLabel(petiteFinaleResult.winnerId, teamsById) : "?";

  const podium = document.createElement("div");
  podium.className = "podium";

  [
    { place: "podium-second", medal: "🥈", label: "2e", name: second },
    { place: "podium-first", medal: "🥇", label: "1er", name: first },
    { place: "podium-third", medal: "🥉", label: "3e", name: third },
  ].forEach(({ place, medal, label, name }) => {
    const step = document.createElement("div");
    step.className = `podium-step ${place}`;

    const medalSpan = document.createElement("div");
    medalSpan.className = "podium-medal";
    medalSpan.textContent = medal;
    step.appendChild(medalSpan);

    const nameDiv = document.createElement("div");
    nameDiv.className = "podium-name";
    nameDiv.textContent = name;
    step.appendChild(nameDiv);

    const bar = document.createElement("div");
    bar.className = "podium-bar";
    bar.textContent = label;
    step.appendChild(bar);

    podium.appendChild(step);
  });

  bracket.appendChild(podium);
}

// Trace une ligne droite (segment SVG) entre deux points.
function svgLine(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", "bracket-connector");
  return line;
}

function renderBracket(teams, matches) {
  bracket.innerHTML = "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const matchBySlot = new Map(matches.map((match) => [match.slot, match]));
  const centers = computeCenters();

  const totalWidth = ROUNDS.length * BOX_WIDTH + (ROUNDS.length - 1) * COL_GAP;

  const scroller = document.createElement("div");
  scroller.className = "bracket-scroller";

  const titles = document.createElement("div");
  titles.className = "bracket-titles";
  titles.style.width = `${totalWidth}px`;
  ROUNDS.forEach((round, i) => {
    const title = document.createElement("span");
    title.style.left = `${i * (BOX_WIDTH + COL_GAP)}px`;
    title.style.width = `${BOX_WIDTH}px`;
    title.textContent = round.label;
    titles.appendChild(title);
  });
  scroller.appendChild(titles);

  const tree = document.createElement("div");
  tree.className = "bracket-tree";
  tree.style.width = `${totalWidth}px`;
  tree.style.height = `${TREE_HEIGHT}px`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", totalWidth);
  svg.setAttribute("height", TREE_HEIGHT);
  svg.classList.add("bracket-connectors");

  ROUNDS.forEach((round, i) => {
    const x = i * (BOX_WIDTH + COL_GAP);

    round.slots.forEach((slot) => {
      const y = centers[slot] - BOX_HEIGHT / 2;
      const match = matchBySlot.get(slot);
      tree.appendChild(createMatchBox(match, teamsById, x, y));
    });

    if (i === ROUNDS.length - 1) return;

    const nextRound = ROUNDS[i + 1];
    const boxRight = x + BOX_WIDTH;
    const nextBoxLeft = boxRight + COL_GAP;
    const midX = boxRight + COL_GAP / 2;

    if (round.slots.length === nextRound.slots.length) {
      // Barrages -> quarts : alignement 1 pour 1, ligne droite.
      round.slots.forEach((slot) => {
        const y = centers[slot];
        svg.appendChild(svgLine(boxRight, y, nextBoxLeft, y));
      });
    } else {
      // Quarts -> demies, demies -> finale : fusion de deux matchs en un.
      nextRound.slots.forEach((nextSlot, k) => {
        const y1 = centers[round.slots[2 * k]];
        const y2 = centers[round.slots[2 * k + 1]];
        const yMid = centers[nextSlot];
        svg.appendChild(svgLine(boxRight, y1, midX, y1));
        svg.appendChild(svgLine(boxRight, y2, midX, y2));
        svg.appendChild(svgLine(midX, y1, midX, y2));
        svg.appendChild(svgLine(midX, yMid, nextBoxLeft, yMid));
      });
    }
  });

  const petiteFinale = matchBySlot.get("petite-finale");
  const finaleX = (ROUNDS.length - 1) * (BOX_WIDTH + COL_GAP);
  const finaleCenterY = centers[ROUNDS[3].slots[0]];
  const petiteFinaleY = finaleCenterY + BOX_HEIGHT / 2 + PETITE_FINALE_GAP;
  tree.appendChild(createMatchBox(petiteFinale, teamsById, finaleX, petiteFinaleY));

  tree.appendChild(svg);
  scroller.appendChild(tree);
  bracket.appendChild(scroller);

  renderPodium(matchBySlot, teamsById);
}

loadBracket();
