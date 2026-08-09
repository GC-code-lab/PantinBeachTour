const poolsList = document.getElementById("pools-list");
const categoryButtons = document.querySelectorAll(".category-button");

let currentCategory = "Hommes";

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentCategory));
    loadPools();
  });
});

async function loadPools() {
  const { data: pools, error: poolsError } = await supabaseClient
    .from("pools")
    .select("*")
    .eq("category", currentCategory)
    .order("label");

  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .eq("category", currentCategory)
    .order("seed", { ascending: true, nullsFirst: false });

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("phase", "poule")
    .eq("category", currentCategory)
    .order("id", { ascending: true });

  if (poolsError || teamsError || matchesError) {
    poolsList.textContent = "Erreur de chargement des poules.";
    return;
  }

  if (pools.length === 0) {
    poolsList.textContent = "Les poules seront affichées ici dès que le tirage sera fait.";
    return;
  }

  renderPools(pools, teams, matches);
}

function formatTeamDetail(team) {
  return `${team.player1_prenom} ${team.player1_nom} / ${team.player2_prenom} ${team.player2_nom}`;
}

function renderPools(pools, teams, matches) {
  poolsList.innerHTML = "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));

  pools.forEach((pool) => {
    const teamsInPool = teams.filter((team) => team.pool_id === pool.id);
    const poolMatches = matches.filter((match) => match.pool_id === pool.id);

    const card = document.createElement("div");
    card.className = "pool-card";

    const title = document.createElement("h3");
    title.textContent = pool.label;
    card.appendChild(title);

    const list = document.createElement("ul");
    if (teamsInPool.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "Aucune équipe pour l'instant";
      list.appendChild(empty);
    } else {
      teamsInPool.forEach((team) => {
        const item = document.createElement("li");
        item.textContent = formatTeamDetail(team);
        list.appendChild(item);
      });
    }
    card.appendChild(list);

    const header = document.createElement("button");
    header.type = "button";
    header.className = "pool-card-header";
    header.setAttribute("aria-expanded", "false");

    const labelSpan = document.createElement("span");
    labelSpan.textContent = "Matchs et résultats";
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

    if (poolMatches.length === 0) {
      const matchesNote = document.createElement("p");
      matchesNote.className = "form-message";
      matchesNote.textContent = "Matchs et résultats à venir.";
      content.appendChild(matchesNote);
    } else {
      poolMatches.forEach((match) => {
        content.appendChild(renderMatchRow(match, teamsById));
      });
    }

    card.appendChild(header);
    card.appendChild(content);
    poolsList.appendChild(card);
  });
}

function matchTeamLabel(team) {
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
}

function renderMatchRow(match, teamsById) {
  const team1 = teamsById.get(match.team1_id);
  const team2 = teamsById.get(match.team2_id);
  const existingSet = match.sets && match.sets[0];

  const row = document.createElement("div");
  row.className = "match-row";

  const team1Span = document.createElement("span");
  team1Span.className = "match-team";
  team1Span.textContent = matchTeamLabel(team1);
  row.appendChild(team1Span);

  if (existingSet) {
    const score = document.createElement("span");
    score.className = "match-score";
    score.textContent = `${existingSet.score_team1} - ${existingSet.score_team2}`;
    row.appendChild(score);
  } else {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "À venir";
    row.appendChild(badge);
  }

  const team2Span = document.createElement("span");
  team2Span.className = "match-team team2";
  team2Span.textContent = matchTeamLabel(team2);
  row.appendChild(team2Span);

  return row;
}

loadPools();
