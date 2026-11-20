// Rendu du tableau à élimination directe (barrages -> quarts -> demies -> finale +
// petite finale), partagé entre la page publique "Main Draw" (onglet Phases Finales,
// données en direct depuis Supabase) et la page "Palmarès" (données figées d'un
// tournoi archivé). Les deux appelants fournissent juste `teams`/`matches` en
// mémoire. Les croisements viennent de js/tournoi-commun.js.

const BRACKET_BOX_WIDTH = 220;
const BRACKET_BOX_HEIGHT = 67;
const BRACKET_ITEM_GAP = 20;
const BRACKET_COL_GAP = 60;
const BRACKET_PETITE_FINALE_GAP = 40;

const BRACKET_ROUNDS = [
  { phase: "barrage", label: "Barrages", slots: ["barrage-2", "barrage-1", "barrage-4", "barrage-3"] },
  { phase: "quart", label: "Quarts de finale", slots: ["qf-1", "qf-2", "qf-3", "qf-4"] },
  { phase: "demi", label: "Demi-finales", slots: ["sf-1", "sf-2"] },
  { phase: "finale", label: "Finales", slots: ["finale"] },
];

const BRACKET_BASE_HEIGHT = 4 * BRACKET_BOX_HEIGHT + 3 * BRACKET_ITEM_GAP;
// La finale est centrée sur BRACKET_BASE_HEIGHT / 2 ; il faut assez de place sous
// elle pour la petite finale (même colonne, sans décaler la boîte de la finale).
const BRACKET_TREE_HEIGHT = Math.max(
  BRACKET_BASE_HEIGHT,
  BRACKET_BASE_HEIGHT / 2 + BRACKET_BOX_HEIGHT / 2 + BRACKET_PETITE_FINALE_GAP + BRACKET_BOX_HEIGHT
);

function bracketTeamLabel(teamId, teamsById) {
  if (!teamId) return "À déterminer";
  return formatTeamShort(teamsById.get(teamId));
}

// Centre vertical (en px) de l'élément k (0-indexé) dans une colonne où les
// éléments sont empilés, chacun de hauteur BRACKET_BOX_HEIGHT séparés de BRACKET_ITEM_GAP.
function bracketStackedCenterY(k) {
  const top = k * (BRACKET_BOX_HEIGHT + BRACKET_ITEM_GAP);
  return top + BRACKET_BOX_HEIGHT / 2;
}

// Centre vertical d'un match du tableau, calculé à partir de sa position dans son
// tour : barrages/quarts sont alignés 1 pour 1 (même position) ; demies/finale sont
// positionnées exactement au milieu de leurs deux matchs "sources" du tour précédent.
function bracketComputeCenters() {
  const centers = {};

  BRACKET_ROUNDS[0].slots.forEach((slot, k) => {
    centers[slot] = bracketStackedCenterY(k);
  });
  BRACKET_ROUNDS[1].slots.forEach((slot, k) => {
    centers[slot] = bracketStackedCenterY(k);
  });

  const quarts = BRACKET_ROUNDS[1].slots;
  BRACKET_ROUNDS[2].slots.forEach((slot, k) => {
    centers[slot] = (centers[quarts[2 * k]] + centers[quarts[2 * k + 1]]) / 2;
  });

  const demis = BRACKET_ROUNDS[2].slots;
  centers[BRACKET_ROUNDS[3].slots[0]] = (centers[demis[0]] + centers[demis[1]]) / 2;

  return centers;
}

// Tant que l'équipe réelle n'est pas connue : le croisement fixé par le format si la
// place vient d'un classement de poule ("2e Poule C"), sinon juste "TBD" (afficher
// "Vainqueur Quart 1" partout surchargerait le dessin pour une évidence).
function bracketSlotTeamLabel(match, teamsById, slot, index) {
  const teamId = match ? (index === 0 ? match.team1_id : match.team2_id) : null;
  if (teamId) return bracketTeamLabel(teamId, teamsById);
  const entrant = (MAINDRAW_BRACKET_ENTRANTS[slot] || [])[index];
  return entrant ? entrantLabel(entrant) : "TBD";
}

function createBracketMatchBox(match, teamsById, x, y, slot) {
  const box = document.createElement("div");
  box.className = "bracket-match";
  box.style.left = `${x}px`;
  box.style.width = `${BRACKET_BOX_WIDTH}px`;
  box.style.top = `${y}px`;

  const team1 = document.createElement("div");
  team1.className = "bracket-team";
  team1.textContent = bracketSlotTeamLabel(match, teamsById, slot, 0);
  box.appendChild(team1);

  const team2 = document.createElement("div");
  team2.className = "bracket-team";
  team2.textContent = bracketSlotTeamLabel(match, teamsById, slot, 1);
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

function renderBracketPodium(container, matchBySlot, teamsById) {
  const finaleResult = matchResult(matchBySlot.get("finale"));
  const petiteFinaleResult = matchResult(matchBySlot.get("petite-finale"));

  const first = finaleResult ? bracketTeamLabel(finaleResult.winnerId, teamsById) : "?";
  const second = finaleResult ? bracketTeamLabel(finaleResult.loserId, teamsById) : "?";
  const third = petiteFinaleResult ? bracketTeamLabel(petiteFinaleResult.winnerId, teamsById) : "?";

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

  container.appendChild(podium);
}

// Trace une ligne droite (segment SVG) entre deux points.
function bracketSvgLine(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", "bracket-connector");
  return line;
}

// Rend le tableau complet (tree + podium) dans `container`. `teams`/`matches` sont
// de simples tableaux en mémoire (mêmes colonnes qu'un `select("*, sets(*)")`
// Supabase) — direct depuis une requête live, ou depuis un snapshot JSON archivé.
function renderBracket(container, teams, matches) {
  container.innerHTML = "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const matchBySlot = new Map(matches.map((match) => [match.slot, match]));
  const centers = bracketComputeCenters();

  const totalWidth = BRACKET_ROUNDS.length * BRACKET_BOX_WIDTH + (BRACKET_ROUNDS.length - 1) * BRACKET_COL_GAP;

  const scroller = document.createElement("div");
  scroller.className = "bracket-scroller";

  const titles = document.createElement("div");
  titles.className = "bracket-titles";
  titles.style.width = `${totalWidth}px`;
  BRACKET_ROUNDS.forEach((round, i) => {
    const title = document.createElement("span");
    title.style.left = `${i * (BRACKET_BOX_WIDTH + BRACKET_COL_GAP)}px`;
    title.style.width = `${BRACKET_BOX_WIDTH}px`;
    title.textContent = round.label;
    titles.appendChild(title);
  });
  scroller.appendChild(titles);

  const tree = document.createElement("div");
  tree.className = "bracket-tree";
  tree.style.width = `${totalWidth}px`;
  tree.style.height = `${BRACKET_TREE_HEIGHT}px`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", totalWidth);
  svg.setAttribute("height", BRACKET_TREE_HEIGHT);
  svg.classList.add("bracket-connectors");

  BRACKET_ROUNDS.forEach((round, i) => {
    const x = i * (BRACKET_BOX_WIDTH + BRACKET_COL_GAP);

    round.slots.forEach((slot) => {
      const y = centers[slot] - BRACKET_BOX_HEIGHT / 2;
      const match = matchBySlot.get(slot);
      tree.appendChild(createBracketMatchBox(match, teamsById, x, y, slot));
    });

    if (i === BRACKET_ROUNDS.length - 1) return;

    const nextRound = BRACKET_ROUNDS[i + 1];
    const boxRight = x + BRACKET_BOX_WIDTH;
    const nextBoxLeft = boxRight + BRACKET_COL_GAP;
    const midX = boxRight + BRACKET_COL_GAP / 2;

    if (round.slots.length === nextRound.slots.length) {
      // Barrages -> quarts : alignement 1 pour 1, ligne droite.
      round.slots.forEach((slot) => {
        const y = centers[slot];
        svg.appendChild(bracketSvgLine(boxRight, y, nextBoxLeft, y));
      });
    } else {
      // Quarts -> demies, demies -> finale : fusion de deux matchs en un.
      nextRound.slots.forEach((nextSlot, k) => {
        const y1 = centers[round.slots[2 * k]];
        const y2 = centers[round.slots[2 * k + 1]];
        const yMid = centers[nextSlot];
        svg.appendChild(bracketSvgLine(boxRight, y1, midX, y1));
        svg.appendChild(bracketSvgLine(boxRight, y2, midX, y2));
        svg.appendChild(bracketSvgLine(midX, y1, midX, y2));
        svg.appendChild(bracketSvgLine(midX, yMid, nextBoxLeft, yMid));
      });
    }
  });

  const petiteFinale = matchBySlot.get("petite-finale");
  const finaleX = (BRACKET_ROUNDS.length - 1) * (BRACKET_BOX_WIDTH + BRACKET_COL_GAP);
  const finaleCenterY = centers[BRACKET_ROUNDS[3].slots[0]];
  const petiteFinaleY = finaleCenterY + BRACKET_BOX_HEIGHT / 2 + BRACKET_PETITE_FINALE_GAP;
  tree.appendChild(createBracketMatchBox(petiteFinale, teamsById, finaleX, petiteFinaleY, "petite-finale"));

  tree.appendChild(svg);
  scroller.appendChild(tree);
  container.appendChild(scroller);

  renderBracketPodium(container, matchBySlot, teamsById);
}
