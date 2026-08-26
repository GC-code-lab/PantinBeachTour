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

function formatTeamNames(team) {
  return `${team.player1_nom} / ${team.player2_nom}`;
}

function teamPoints(team) {
  return Number(team.points || 0);
}

// Même logique que côté admin (js/gestion.js) : tant qu'aucun classement manuel n'a
// été fait (teams.seed tous null), l'ordre par défaut des têtes de série vient des
// points de la paire — c'est ce qui sert de dernier critère de départage public.
function defaultSeedOrder(teams) {
  const hasManualSeed = teams.some((team) => team.seed != null);
  if (hasManualSeed) return teams;

  return teams.slice().sort((a, b) => {
    const diff = teamPoints(b) - teamPoints(a);
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

// Classement d'une poule : victoires, puis différence de points, puis tête de série
// (numéro de rang, 1 = meilleure tête de série) — c'est ce dernier critère qui fait
// l'ordre tant qu'aucun match n'a encore de score.
function computePoolStandings(pool, teamsInPool, poolMatches, seedRankByTeamId) {
  const stats = new Map(
    teamsInPool.map((team) => [team.id, { team, wins: 0, losses: 0, diff: 0 }])
  );

  poolMatches
    .filter((match) => match.pool_id === pool.id)
    .forEach((match) => {
      const set = match.sets && match.sets[0];
      const stats1 = stats.get(match.team1_id);
      const stats2 = stats.get(match.team2_id);
      if (!set || !stats1 || !stats2) return;

      stats1.diff += set.score_team1 - set.score_team2;
      stats2.diff += set.score_team2 - set.score_team1;
      if (set.score_team1 > set.score_team2) {
        stats1.wins += 1;
        stats2.losses += 1;
      } else {
        stats2.wins += 1;
        stats1.losses += 1;
      }
    });

  return [...stats.values()].sort((a, b) => {
    return (
      b.wins - a.wins ||
      b.diff - a.diff ||
      seedRankByTeamId.get(a.team.id) - seedRankByTeamId.get(b.team.id)
    );
  });
}

function renderStandingsTable(standings, seedRankByTeamId) {
  const wrapper = document.createElement("div");
  wrapper.className = "standings-table-wrapper";

  const table = document.createElement("table");
  table.className = "standings-table";

  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>Rang</th><th>Équipe</th><th>V</th><th>D</th><th>Diff</th><th>Tête de série</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  standings.forEach((s, index) => {
    const row = document.createElement("tr");
    const diffLabel = s.diff > 0 ? `+${s.diff}` : `${s.diff}`;
    row.innerHTML = `<td>${index + 1}</td><td>${formatTeamNames(s.team)}</td><td>${s.wins}</td><td>${s.losses}</td><td>${diffLabel}</td><td>n°${seedRankByTeamId.get(s.team.id)}</td>`;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);

  return wrapper;
}

function renderPools(pools, teams, matches) {
  poolsList.innerHTML = "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const seedRankByTeamId = new Map(defaultSeedOrder(teams).map((team, index) => [team.id, index + 1]));

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

    const matches1 = createCollapsibleSection("Matchs et résultats");
    if (poolMatches.length === 0) {
      const matchesNote = document.createElement("p");
      matchesNote.className = "form-message";
      matchesNote.textContent = "Matchs et résultats à venir.";
      matches1.content.appendChild(matchesNote);
    } else {
      poolMatches.forEach((match) => {
        matches1.content.appendChild(renderMatchRow(match, teamsById));
      });
    }
    card.appendChild(matches1.section);

    const standings = createCollapsibleSection("Classement");
    const standingsRows = computePoolStandings(pool, teamsInPool, poolMatches, seedRankByTeamId);
    if (standingsRows.length === 0) {
      const standingsNote = document.createElement("p");
      standingsNote.className = "form-message";
      standingsNote.textContent = "Classement à venir.";
      standings.content.appendChild(standingsNote);
    } else {
      standings.content.appendChild(renderStandingsTable(standingsRows, seedRankByTeamId));
    }
    card.appendChild(standings.section);

    poolsList.appendChild(card);
  });
}

// Un bouton-titre repliable + son contenu, utilisé pour "Matchs et résultats" et
// "Classement" sous chaque poule (replié par défaut).
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
