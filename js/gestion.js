const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((panel) => (panel.hidden = true));
    button.classList.add("active");
    document.getElementById(button.dataset.tab).hidden = false;
  });
});

// Catégorie actuellement affichée dans les onglets "Poules" et "Matchs & Résultats".
// Hommes et Femmes sont deux tournois indépendants (équipes, poules, matchs, tableau).
let currentCategory = "Hommes";
const categoryButtons = document.querySelectorAll(".category-button");

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentCategory));
    loadAdminData();
  });
});

const adminEmailDisplay = document.getElementById("admin-email-display");
const logoutButton = document.getElementById("logout-button");
const rolesSection = document.getElementById("roles-section");
const inscriptionTabButton = document.querySelector('.tab-button[data-tab="tab-inscription"]');
const poulesTabButton = document.querySelector('.tab-button[data-tab="tab-poules"]');

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

// Seuls les admins voient l'inscription, les têtes de série/poules, et la gestion des rôles.
// Les scorers n'ont accès qu'à Connexion (pour se déconnecter) et Matchs & Résultats.
// Un rôle inconnu/absent est traité comme le plus restrictif, par sécurité.
function applyRoleUI(role) {
  const isAdmin = role === "admin";
  inscriptionTabButton.hidden = !isAdmin;
  poulesTabButton.hidden = !isAdmin;
  rolesSection.hidden = !isAdmin;
  if (isAdmin) loadAccountsWithoutRole();
}

// Page protégée : sans session, retour direct à l'écran de connexion.
supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  if (!session) {
    window.location.href = "admin.html";
    return;
  }
  adminEmailDisplay.textContent = session.user.email;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();
  applyRoleUI(profile ? profile.role : null);

  loadAdminData();
});

const roleForm = document.getElementById("role-form");
const roleMessage = document.getElementById("role-message");
const roleEmailSelect = document.getElementById("role-email");
const rolesToggle = document.getElementById("roles-toggle");
const rolesList = document.getElementById("roles-list");

// Comptes créés (via "Créer un compte" sur l'écran de connexion) mais sans rôle
// assigné pour l'instant — c'est parmi eux qu'on choisit pour "Ajout de rôle".
async function loadAccountsWithoutRole() {
  const { data, error } = await supabaseClient.rpc("list_accounts_without_role");
  roleEmailSelect.innerHTML = "";

  if (error || !data || data.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Aucun compte sans rôle pour l'instant";
    roleEmailSelect.appendChild(option);
    roleEmailSelect.disabled = true;
    return;
  }

  roleEmailSelect.disabled = false;
  data.forEach((account) => {
    const option = document.createElement("option");
    option.value = account.email;
    option.textContent = account.email;
    roleEmailSelect.appendChild(option);
  });
}

roleForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = roleEmailSelect.value;
  if (!email) {
    alert("Aucun compte sans rôle à sélectionner.");
    return;
  }
  const role = roleForm.querySelector('input[name="role"]:checked').value;

  const { error } = await supabaseClient.rpc("assign_role", {
    target_email: email,
    target_role: role,
  });

  if (error) {
    roleMessage.textContent = "Erreur : " + error.message;
    roleMessage.style.color = "var(--color-coral)";
    return;
  }

  roleMessage.textContent = `Rôle "${role}" attribué à ${email}.`;
  roleMessage.style.color = "var(--color-ocean-dark)";

  loadAccountsWithoutRole();
  if (rolesToggle.getAttribute("aria-expanded") === "true") {
    loadRolesList();
  }
});

async function loadRolesList() {
  rolesList.innerHTML = "Chargement…";

  const { data, error } = await supabaseClient.rpc("list_role_accounts");

  if (error) {
    rolesList.textContent = "Erreur de chargement : " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    rolesList.textContent = "Aucun compte avec un rôle pour l'instant.";
    return;
  }

  rolesList.innerHTML = "";
  const list = document.createElement("ul");
  data.forEach((account) => {
    const item = document.createElement("li");
    item.textContent = `${account.email} — ${account.role}`;
    list.appendChild(item);
  });
  rolesList.appendChild(list);
}

rolesToggle.addEventListener("click", () => {
  const isOpen = rolesToggle.getAttribute("aria-expanded") === "true";
  rolesToggle.setAttribute("aria-expanded", String(!isOpen));
  rolesList.hidden = isOpen;
  if (!isOpen) loadRolesList();
});

const inscriptionForm = document.getElementById("inscription-form");
const inscriptionMessage = document.getElementById("inscription-message");

// Transforme la valeur d'un champ tout en gardant le curseur à sa place
// (sinon, réassigner .value renvoie le curseur en fin de champ à chaque frappe).
function transformInput(event, transform) {
  const el = event.target;
  const pos = el.selectionStart;
  el.value = transform(el.value);
  el.setSelectionRange(pos, pos);
}

const toUpper = (value) => value.toUpperCase();

// Majuscule en début de chaîne et après chaque espace/tiret (ex: "Thomas-Alexandre").
const toCapitalized = (value) =>
  value.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (match) => match.toUpperCase());

document.getElementById("player1-nom").addEventListener("input", (e) => transformInput(e, toUpper));
document.getElementById("player2-nom").addEventListener("input", (e) => transformInput(e, toUpper));
document.getElementById("player1-prenom").addEventListener("input", (e) => transformInput(e, toCapitalized));
document.getElementById("player2-prenom").addEventListener("input", (e) => transformInput(e, toCapitalized));

inscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const category = currentCategory;
  const player1Nom = document.getElementById("player1-nom").value;
  const player1Prenom = document.getElementById("player1-prenom").value;
  const player2Nom = document.getElementById("player2-nom").value;
  const player2Prenom = document.getElementById("player2-prenom").value;

  const team = {
    category,
    name: `${player1Nom}/${player2Nom}`,
    player1_nom: player1Nom,
    player1_prenom: player1Prenom,
    player2_nom: player2Nom,
    player2_prenom: player2Prenom,
  };

  const { error } = await supabaseClient.from("teams").insert(team);

  if (error) {
    inscriptionMessage.textContent = "Erreur : " + error.message;
    inscriptionMessage.style.color = "var(--color-coral)";
    return;
  }

  inscriptionMessage.textContent = "Équipe inscrite !";
  inscriptionMessage.style.color = "var(--color-ocean-dark)";
  inscriptionForm.reset();
  loadAdminData();
});

function formatTeamDetail(team) {
  return `${team.player1_prenom} ${team.player1_nom} / ${team.player2_prenom} ${team.player2_nom}`;
}

const poolsList = document.getElementById("pools-list");
const teamsList = document.getElementById("teams-list");
const teamsCount = document.getElementById("teams-count");
const selectAllTeams = document.getElementById("select-all-teams");
const deleteSelectedButton = document.getElementById("delete-selected-button");

const selectedTeamIds = new Set();
const seedingList = document.getElementById("seeding-list");
const generate12Button = document.getElementById("generate-12");
const generate16Button = document.getElementById("generate-16");
const generateMessage = document.getElementById("generate-message");

let seedTeams = [];
let allTeams = [];

// Le classement (glisser-déposer) est persisté en base dans teams.seed,
// donc il survit aux rechargements. Nouvelles équipes (seed = null) en dernier.
async function saveSeedOrder() {
  await Promise.all(
    seedTeams.map((team, index) =>
      supabaseClient.from("teams").update({ seed: index + 1 }).eq("id", team.id)
    )
  );
}

async function loadAdminData() {
  const { data: pools, error: poolsError } = await supabaseClient
    .from("pools")
    .select("*")
    .order("label");

  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .order("seed", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("phase", "poule")
    .order("id", { ascending: true });

  const { data: bracketMatches, error: bracketError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .in("phase", ["barrage", "quart", "demi", "petite_finale", "finale"])
    .order("slot");

  if (poolsError || teamsError || matchesError || bracketError) {
    poolsList.textContent = "Erreur de chargement des données.";
    return;
  }

  allTeams = teams;
  renderTeamsList(teams.filter((team) => team.category === currentCategory));

  const categoryPools = pools.filter((pool) => pool.category === currentCategory);
  const categoryTeams = teams.filter((team) => team.category === currentCategory);
  const categoryMatches = matches.filter((match) => match.category === currentCategory);
  const categoryBracketMatches = bracketMatches.filter((match) => match.category === currentCategory);

  renderPools(categoryPools, categoryTeams);
  renderGenerateControls(categoryTeams.length);
  renderMatchesTab(categoryPools, categoryTeams, categoryMatches);
  renderBracketTab(categoryPools, categoryTeams, categoryMatches, categoryBracketMatches);
  seedTeams = categoryTeams;
  renderSeedingList();
}

// Une suppression d'équipe invalide poules ET matchs de sa catégorie (clés étrangères
// vers teams/pools) : on repart de zéro, mais uniquement pour cette catégorie-là —
// supprimer une équipe hommes ne doit pas toucher aux poules/matchs femmes.
async function resetPools(category) {
  const { data: categoryPools } = await supabaseClient.from("pools").select("id").eq("category", category);
  const categoryPoolIds = (categoryPools || []).map((pool) => pool.id);

  if (categoryPoolIds.length > 0) {
    await supabaseClient.from("matches").delete().in("pool_id", categoryPoolIds);
  }
  // Les matchs de phases finales n'ont pas de pool_id, on les cible par catégorie.
  await supabaseClient.from("matches").delete().eq("category", category).is("pool_id", null);
  await supabaseClient.from("teams").update({ pool_id: null }).eq("category", category);
  await supabaseClient.from("pools").delete().eq("category", category);
}

function renderGenerateControls(count) {
  generate12Button.hidden = count !== 12;
  generate16Button.hidden = count !== 16;

  generateMessage.textContent =
    count === 12 || count === 16
      ? ""
      : `La catégorie ${currentCategory} doit compter 12 ou 16 équipes pour générer les poules (actuellement ${count}).`;
}

function renderTeamsList(teams) {
  teamsList.innerHTML = "";
  teamsCount.textContent = `${teams.length} équipe${teams.length > 1 ? "s" : ""} inscrite${teams.length > 1 ? "s" : ""}`;

  selectedTeamIds.clear();
  selectAllTeams.checked = false;

  if (teams.length === 0) {
    teamsList.textContent = "Aucune équipe inscrite pour l'instant.";
    return;
  }

  teams.forEach((team) => {
    const row = document.createElement("div");
    row.className = "team-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedTeamIds.add(team.id);
      } else {
        selectedTeamIds.delete(team.id);
        selectAllTeams.checked = false;
      }
    });
    row.appendChild(checkbox);

    const label = document.createElement("span");
    label.textContent = formatTeamDetail(team);
    row.appendChild(label);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-danger button-sm";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm(`Supprimer l'équipe "${team.name}" ? Cette action est irréversible.`);
      if (!confirmed) return;

      await resetPools(team.category);
      const { error } = await supabaseClient.from("teams").delete().eq("id", team.id);
      if (error) {
        alert("Erreur lors de la suppression : " + error.message);
        return;
      }
      loadAdminData();
    });
    row.appendChild(deleteButton);

    teamsList.appendChild(row);
  });
}

selectAllTeams.addEventListener("change", () => {
  teamsList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = selectAllTeams.checked;
    checkbox.dispatchEvent(new Event("change"));
  });
});

deleteSelectedButton.addEventListener("click", async () => {
  if (selectedTeamIds.size === 0) {
    alert("Aucune équipe sélectionnée.");
    return;
  }

  const confirmed = confirm(`Supprimer les ${selectedTeamIds.size} équipes sélectionnées ? Cette action est irréversible.`);
  if (!confirmed) return;

  const affectedCategories = new Set(
    allTeams.filter((team) => selectedTeamIds.has(team.id)).map((team) => team.category)
  );
  for (const category of affectedCategories) {
    await resetPools(category);
  }

  const { error } = await supabaseClient.from("teams").delete().in("id", [...selectedTeamIds]);
  if (error) {
    alert("Erreur lors de la suppression : " + error.message);
    return;
  }
  loadAdminData();
});

function renderPools(pools, teams) {
  poolsList.innerHTML = "";

  pools.forEach((pool) => {
    const teamsInPool = teams.filter((team) => team.pool_id === pool.id);

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

    poolsList.appendChild(card);
  });
}

// Classement par glisser-déposer : seedTeams[0] = tête de série n°1, etc.
function renderSeedingList() {
  seedingList.innerHTML = "";

  seedTeams.forEach((team, index) => {
    const item = document.createElement("li");
    item.className = "seed-item";
    item.draggable = true;
    item.dataset.index = index;
    item.textContent = formatTeamDetail(team);

    item.addEventListener("dragstart", () => {
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const fromIndex = Number(seedingList.querySelector(".dragging").dataset.index);
      const toIndex = Number(item.dataset.index);
      const [moved] = seedTeams.splice(fromIndex, 1);
      seedTeams.splice(toIndex, 0, moved);
      renderSeedingList();
      saveSeedOrder();
    });

    seedingList.appendChild(item);
  });
}

// Répartition en serpentin : tour aller (poule 1→N), tour retour (poule N→1), etc.
function snakeAssign(orderedTeams, poolCount) {
  const groups = Array.from({ length: poolCount }, () => []);
  const poolIndexesForward = [...Array(poolCount).keys()];
  const poolIndexesBackward = [...poolIndexesForward].reverse();

  let round = 0;
  let i = 0;
  while (i < orderedTeams.length) {
    const order = round % 2 === 0 ? poolIndexesForward : poolIndexesBackward;
    for (const poolIndex of order) {
      if (i >= orderedTeams.length) break;
      groups[poolIndex].push(orderedTeams[i]);
      i++;
    }
    round++;
  }

  return groups;
}

async function generatePools(teamCount) {
  if (seedTeams.length < teamCount) {
    alert(`Il faut au moins ${teamCount} équipes classées (catégorie ${currentCategory}) pour générer ce tableau.`);
    return;
  }

  const confirmed = confirm(
    `Générer 4 poules ${currentCategory} avec les ${teamCount} premières équipes du classement ? Les poules et matchs actuels de cette catégorie seront réinitialisés.`
  );
  if (!confirmed) return;

  const poolLabels = ["Poule A", "Poule B", "Poule C", "Poule D"];

  await resetPools(currentCategory);

  const poolByLabel = {};
  for (const label of poolLabels) {
    const { data } = await supabaseClient.from("pools").insert({ label, category: currentCategory }).select().single();
    poolByLabel[label] = data;
  }

  const topTeams = seedTeams.slice(0, teamCount);
  const groups = snakeAssign(topTeams, 4);

  // Les matchs de poule découlent directement de la composition des poules :
  // pas besoin d'une étape manuelle séparée, on les génère dans la foulée.
  const matchRows = [];

  for (let i = 0; i < poolLabels.length; i++) {
    const pool = poolByLabel[poolLabels[i]];
    const teamIds = groups[i].map((team) => team.id);
    if (teamIds.length > 0) {
      await supabaseClient.from("teams").update({ pool_id: pool.id }).in("id", teamIds);
    }
    poolRoundRobin(teamIds).forEach(([team1Id, team2Id]) => {
      matchRows.push({
        phase: "poule",
        category: currentCategory,
        pool_id: pool.id,
        team1_id: team1Id,
        team2_id: team2Id,
        status: "a_venir",
      });
    });
  }

  if (matchRows.length > 0) {
    await supabaseClient.from("matches").insert(matchRows);
  }

  loadAdminData();
}

generate12Button.addEventListener("click", () => generatePools(12));
generate16Button.addEventListener("click", () => generatePools(16));

const matchesInfo = document.getElementById("matches-info");
const matchesList = document.getElementById("matches-list");

// Round-robin d'une poule : pour 4 équipes, méthode du cercle classique
// (1v4, 2v3, 1v3, 2v4, 1v2, 3v4) ; pour 3 équipes, dans l'ordre 1v3, 2v3, 1v2.
// teamIds[0] = tête de série la plus haute de la poule, etc.
function poolRoundRobin(teamIds) {
  if (teamIds.length === 3) {
    return [
      [teamIds[0], teamIds[2]],
      [teamIds[1], teamIds[2]],
      [teamIds[0], teamIds[1]],
    ];
  }
  if (teamIds.length === 4) {
    return [
      [teamIds[0], teamIds[3]],
      [teamIds[1], teamIds[2]],
      [teamIds[0], teamIds[2]],
      [teamIds[1], teamIds[3]],
      [teamIds[0], teamIds[1]],
      [teamIds[2], teamIds[3]],
    ];
  }
  return [];
}

// Barrage/quart/demi gagné -> l'équipe gagnante est placée dans le match suivant du tableau.
// Les demies ont en plus une place "loser" : le perdant va en petite finale.
const BRACKET_PROGRESSION = {
  "barrage-1": { winner: { nextSlot: "qf-1", position: "team2_id" } },
  "barrage-2": { winner: { nextSlot: "qf-2", position: "team2_id" } },
  "barrage-3": { winner: { nextSlot: "qf-3", position: "team2_id" } },
  "barrage-4": { winner: { nextSlot: "qf-4", position: "team2_id" } },
  "qf-1": { winner: { nextSlot: "sf-1", position: "team1_id" } },
  "qf-2": { winner: { nextSlot: "sf-1", position: "team2_id" } },
  "qf-3": { winner: { nextSlot: "sf-2", position: "team1_id" } },
  "qf-4": { winner: { nextSlot: "sf-2", position: "team2_id" } },
  "sf-1": {
    winner: { nextSlot: "finale", position: "team1_id" },
    loser: { nextSlot: "petite-finale", position: "team1_id" },
  },
  "sf-2": {
    winner: { nextSlot: "finale", position: "team2_id" },
    loser: { nextSlot: "petite-finale", position: "team2_id" },
  },
};

function requiredSetWins(phase) {
  return phase === "poule" ? 1 : 2;
}

// Enregistre les sets saisis (les sets laissés vides sont ignorés), détermine si le match
// est terminé (une équipe a atteint le nombre de sets gagnants requis) et, si oui, propage
// le vainqueur — et pour les demies, aussi le perdant — dans le match suivant du tableau.
// Le filtre par catégorie sur les mises à jour est essentiel : sans lui, un match
// "qf-1" homme et un match "qf-1" femme (même slot, catégories différentes)
// s'écraseraient l'un l'autre.
async function saveMatchSets(match, enteredSets) {
  const existingBySetNumber = new Map((match.sets || []).map((s) => [s.set_number, s]));

  for (const { setNumber, score1, score2 } of enteredSets) {
    const existing = existingBySetNumber.get(setNumber);
    if (existing) {
      await supabaseClient
        .from("sets")
        .update({ score_team1: score1, score_team2: score2 })
        .eq("id", existing.id);
    } else {
      await supabaseClient
        .from("sets")
        .insert({ match_id: match.id, set_number: setNumber, score_team1: score1, score_team2: score2 });
    }
    draftScores.delete(`${match.id}-${setNumber}`);
  }

  const wins1 = enteredSets.filter((s) => s.score1 > s.score2).length;
  const wins2 = enteredSets.filter((s) => s.score2 > s.score1).length;
  const needed = requiredSetWins(match.phase);

  if (wins1 < needed && wins2 < needed) {
    // Match pas encore terminé (ex: seulement le 1er set d'un barrage) : on sauvegarde, c'est tout.
    loadAdminData();
    return;
  }

  await supabaseClient.from("matches").update({ status: "termine" }).eq("id", match.id);

  const winnerId = wins1 > wins2 ? match.team1_id : match.team2_id;
  const loserId = wins1 > wins2 ? match.team2_id : match.team1_id;

  const progression = BRACKET_PROGRESSION[match.slot];
  if (progression) {
    if (progression.winner) {
      await supabaseClient
        .from("matches")
        .update({ [progression.winner.position]: winnerId })
        .eq("slot", progression.winner.nextSlot)
        .eq("category", match.category);
    }
    if (progression.loser) {
      await supabaseClient
        .from("matches")
        .update({ [progression.loser.position]: loserId })
        .eq("slot", progression.loser.nextSlot)
        .eq("category", match.category);
    }
  }

  loadAdminData();
}

function teamLabel(teamId, teamsById) {
  if (!teamId) return "À déterminer";
  const team = teamsById.get(teamId);
  if (!team) return "?";
  return `${team.player1_prenom} ${team.player1_nom.charAt(0)}. / ${team.player2_prenom} ${team.player2_nom.charAt(0)}.`;
}

// Une paire de champs numériques pour un set (score équipe 1 - score équipe 2).
// Scores tapés mais pas encore enregistrés, gardés en mémoire le temps de la page :
// sans ça, enregistrer un match relance loadAdminData() et efface ce qui a été tapé
// dans les autres matchs pas encore sauvegardés.
const draftScores = new Map();

function buildScorePair(matchId, setNumber, existing) {
  const wrapper = document.createElement("div");
  wrapper.className = "match-score-form";

  const draftKey = `${matchId}-${setNumber}`;
  const draft = draftScores.get(draftKey);

  const input1 = document.createElement("input");
  input1.type = "number";
  input1.min = "0";
  if (existing) input1.value = existing.score_team1;
  else if (draft) input1.value = draft.score1;

  const separator = document.createElement("span");
  separator.textContent = "-";

  const input2 = document.createElement("input");
  input2.type = "number";
  input2.min = "0";
  if (existing) input2.value = existing.score_team2;
  else if (draft) input2.value = draft.score2;

  const saveDraft = () => {
    draftScores.set(draftKey, { score1: input1.value, score2: input2.value });
  };
  input1.addEventListener("input", saveDraft);
  input2.addEventListener("input", saveDraft);

  wrapper.appendChild(input1);
  wrapper.appendChild(separator);
  wrapper.appendChild(input2);

  return { wrapper, input1, input2 };
}

// Équipe qui a gagné un set d'après les deux champs (null si pas encore rempli/valide).
function setWinner(input1, input2) {
  if (input1.value === "" || input2.value === "") return null;
  const v1 = Number(input1.value);
  const v2 = Number(input2.value);
  if (!Number.isInteger(v1) || !Number.isInteger(v2) || v1 === v2) return null;
  return v1 > v2 ? 1 : 2;
}

// Lit les champs remplis (les sets laissés vides sont ignorés) et valide les scores.
// Retourne null (avec une alerte) si la saisie est invalide.
function collectEnteredSets(setInputs) {
  const enteredSets = [];
  for (const { setNumber, input1, input2 } of setInputs) {
    if (input1.value === "" && input2.value === "") continue;
    const score1 = Number(input1.value);
    const score2 = Number(input2.value);
    if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0 || score1 === score2) {
      alert("Merci d'entrer un score valide (et différent) pour les deux équipes.");
      return null;
    }
    enteredSets.push({ setNumber, score1, score2 });
  }
  if (enteredSets.length === 0) {
    alert("Merci d'entrer au moins un score de set.");
    return null;
  }
  return enteredSets;
}

// Une ligne de match, réutilisée pour les matchs de poule et le tableau final — toujours
// sur une seule ligne. Les matchs de poule ont 1 set ; les autres en ont 2, avec un 3e
// (tie-break) qui n'apparaît que si les deux premiers sets sont à 1-1.
// Tant que les deux équipes ne sont pas connues (barrage pas encore joué), on affiche
// juste "À déterminer" à la place du formulaire de score.
function createMatchRow(match, teamsById) {
  const bothTeamsKnown = Boolean(match.team1_id && match.team2_id);
  const isMultiSet = match.phase !== "poule";
  const setsByNumber = new Map((match.sets || []).map((s) => [s.set_number, s]));
  const setInputs = [];

  const row = document.createElement("div");
  row.className = "match-row";

  const team1Span = document.createElement("span");
  team1Span.className = "match-team";
  team1Span.textContent = teamLabel(match.team1_id, teamsById);

  if (!isMultiSet) {
    row.appendChild(team1Span);
  }

  // Pour les matchs à plusieurs sets : "équipes" à gauche, "scores + bouton" plaqués
  // tout à droite (via .match-actions, poussé par une marge auto sur le conteneur).
  const actions = isMultiSet ? document.createElement("div") : row;
  if (isMultiSet) actions.className = "match-actions";

  if (isMultiSet) {
    const teamsGroup = document.createElement("div");
    teamsGroup.className = "match-teams";
    teamsGroup.appendChild(team1Span);

    const vs = document.createElement("span");
    vs.className = "match-vs";
    vs.textContent = "vs";
    teamsGroup.appendChild(vs);

    const team2Span = document.createElement("span");
    team2Span.className = "match-team team2";
    team2Span.textContent = teamLabel(match.team2_id, teamsById);
    teamsGroup.appendChild(team2Span);

    row.appendChild(teamsGroup);
  }

  if (bothTeamsKnown && !isMultiSet) {
    const pair = buildScorePair(match.id, 1, setsByNumber.get(1));
    actions.appendChild(pair.wrapper);
    setInputs.push({ setNumber: 1, input1: pair.input1, input2: pair.input2 });
  } else if (bothTeamsKnown && isMultiSet) {
    const setsWrap = document.createElement("div");
    setsWrap.className = "match-sets-inline";

    const pair1 = buildScorePair(match.id, 1, setsByNumber.get(1));
    const pair2 = buildScorePair(match.id, 2, setsByNumber.get(2));
    const pair3 = buildScorePair(match.id, 3, setsByNumber.get(3));

    setsWrap.appendChild(pair1.wrapper);
    setsWrap.appendChild(pair2.wrapper);
    setsWrap.appendChild(pair3.wrapper);
    actions.appendChild(setsWrap);

    setInputs.push({ setNumber: 1, input1: pair1.input1, input2: pair1.input2 });
    setInputs.push({ setNumber: 2, input1: pair2.input1, input2: pair2.input2 });
    setInputs.push({ setNumber: 3, input1: pair3.input1, input2: pair3.input2 });

    const updateTieBreakVisibility = () => {
      const winner1 = setWinner(pair1.input1, pair1.input2);
      const winner2 = setWinner(pair2.input1, pair2.input2);
      pair3.wrapper.hidden = !(winner1 && winner2 && winner1 !== winner2);
    };
    [pair1.input1, pair1.input2, pair2.input1, pair2.input2].forEach((input) => {
      input.addEventListener("input", updateTieBreakVisibility);
    });
    updateTieBreakVisibility();
  } else {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "À déterminer";
    actions.appendChild(badge);
  }

  if (!isMultiSet) {
    const team2Span = document.createElement("span");
    team2Span.className = "match-team team2";
    team2Span.textContent = teamLabel(match.team2_id, teamsById);
    row.appendChild(team2Span);
  }

  if (bothTeamsKnown) {
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "button button-sm";
    saveButton.textContent = "Enregistrer";
    saveButton.addEventListener("click", () => {
      const enteredSets = collectEnteredSets(setInputs);
      if (enteredSets) saveMatchSets(match, enteredSets);
    });
    actions.appendChild(saveButton);
  }

  if (isMultiSet) row.appendChild(actions);

  return row;
}

// Un groupe de matchs repliable (poule, ou tour du tableau final) : replié par
// défaut, avec juste le titre + une flèche ; un clic révèle les matchs à l'intérieur.
function createCollapsibleGroup(title) {
  const group = document.createElement("div");
  group.className = "matches-group";

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

  group.appendChild(header);
  group.appendChild(content);

  return { group, content };
}

function renderMatchesTab(pools, teams, matches) {
  matchesList.innerHTML = "";

  if (pools.length === 0) {
    matchesInfo.textContent = "Génère d'abord les poules dans l'onglet précédent.";
    return;
  }

  matchesInfo.textContent = matches.length === 0 ? "Aucun match généré pour l'instant." : "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));

  pools.forEach((pool) => {
    const poolMatches = matches.filter((match) => match.pool_id === pool.id);
    if (poolMatches.length === 0) return;

    const { group, content } = createCollapsibleGroup(pool.label);

    poolMatches.forEach((match) => {
      content.appendChild(createMatchRow(match, teamsById));
    });

    matchesList.appendChild(group);
  });
}

const bracketInfo = document.getElementById("bracket-info");
const generateBracketButton = document.getElementById("generate-bracket-button");
const bracketList = document.getElementById("bracket-list");

// Petite finale et finale regroupées dans un seul onglet "Finales" (pas besoin de deux).
const BRACKET_GROUPS = [
  { label: "Barrages", phases: ["barrage"] },
  { label: "Quarts de finale", phases: ["quart"] },
  { label: "Demi-finales", phases: ["demi"] },
  { label: "Finales", phases: ["petite_finale", "finale"] },
];

// Classe les équipes d'une poule par victoires, puis par différence de points
// marqués/encaissés sur les matchs de poule en cas d'égalité.
function computePoolStandings(pool, teams, poolMatches) {
  const stats = new Map(
    teams
      .filter((team) => team.pool_id === pool.id)
      .map((team) => [team.id, { team, wins: 0, diff: 0 }])
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
      } else {
        stats2.wins += 1;
      }
    });

  return [...stats.values()]
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff)
    .map((s) => s.team);
}

generateBracketButton.addEventListener("click", async () => {
  try {
    const { data: pools, error: poolsError } = await supabaseClient
      .from("pools")
      .select("*")
      .eq("category", currentCategory)
      .order("label");
    if (poolsError) throw poolsError;

    const { data: teams, error: teamsError } = await supabaseClient
      .from("teams")
      .select("*")
      .eq("category", currentCategory);
    if (teamsError) throw teamsError;

    const { data: poolMatches, error: poolMatchesError } = await supabaseClient
      .from("matches")
      .select("*, sets(*)")
      .eq("phase", "poule")
      .eq("category", currentCategory);
    if (poolMatchesError) throw poolMatchesError;

    if (!pools || pools.length !== 4) {
      alert("Il faut générer les 4 poules avant de créer le tableau des phases finales.");
      return;
    }

    const missingScore = poolMatches.some((match) => !match.sets || match.sets.length === 0);
    if (missingScore) {
      alert("Tous les matchs de poule doivent avoir un score avant de générer le tableau des phases finales.");
      return;
    }

    const confirmed = confirm(
      `Générer le tableau des phases finales ${currentCategory} ? Le tableau existant pour cette catégorie sera remplacé.`
    );
    if (!confirmed) return;

    const standings = {};
    pools.forEach((pool) => {
      standings[pool.label] = computePoolStandings(pool, teams, poolMatches);
    });

    for (const label of ["Poule A", "Poule B", "Poule C", "Poule D"]) {
      if (!standings[label] || standings[label].length < 3) {
        alert(`Erreur : la poule "${label}" n'a pas 3 équipes classées. Vérifie les poules et les matchs de poule.`);
        return;
      }
    }

    const first = (label) => standings[label][0].id;
    const second = (label) => standings[label][1].id;
    const third = (label) => standings[label][2].id;

    const { error: deleteError } = await supabaseClient
      .from("matches")
      .delete()
      .eq("category", currentCategory)
      .in("phase", ["barrage", "quart", "demi", "petite_finale", "finale"]);
    if (deleteError) throw deleteError;

    const rows = [
      { phase: "barrage", slot: "barrage-1", category: currentCategory, team1_id: second("Poule C"), team2_id: third("Poule B"), status: "a_venir" },
      { phase: "barrage", slot: "barrage-2", category: currentCategory, team1_id: second("Poule B"), team2_id: third("Poule C"), status: "a_venir" },
      { phase: "barrage", slot: "barrage-3", category: currentCategory, team1_id: second("Poule D"), team2_id: third("Poule A"), status: "a_venir" },
      { phase: "barrage", slot: "barrage-4", category: currentCategory, team1_id: second("Poule A"), team2_id: third("Poule D"), status: "a_venir" },
      { phase: "quart", slot: "qf-1", category: currentCategory, team1_id: first("Poule A"), team2_id: null, status: "a_venir" },
      { phase: "quart", slot: "qf-2", category: currentCategory, team1_id: first("Poule D"), team2_id: null, status: "a_venir" },
      { phase: "quart", slot: "qf-3", category: currentCategory, team1_id: first("Poule B"), team2_id: null, status: "a_venir" },
      { phase: "quart", slot: "qf-4", category: currentCategory, team1_id: first("Poule C"), team2_id: null, status: "a_venir" },
      { phase: "demi", slot: "sf-1", category: currentCategory, team1_id: null, team2_id: null, status: "a_venir" },
      { phase: "demi", slot: "sf-2", category: currentCategory, team1_id: null, team2_id: null, status: "a_venir" },
      { phase: "petite_finale", slot: "petite-finale", category: currentCategory, team1_id: null, team2_id: null, status: "a_venir" },
      { phase: "finale", slot: "finale", category: currentCategory, team1_id: null, team2_id: null, status: "a_venir" },
    ];

    const { error: insertError } = await supabaseClient.from("matches").insert(rows);
    if (insertError) throw insertError;

    loadAdminData();
  } catch (error) {
    alert("Erreur lors de la génération du tableau : " + error.message);
  }
});

function renderBracketTab(pools, teams, poolMatches, bracketMatches) {
  bracketList.innerHTML = "";

  const poolMatchesMissingScore = pools.length === 4 && poolMatches.some((match) => !match.sets || match.sets.length === 0);

  if (pools.length !== 4) {
    bracketInfo.textContent = "Génère d'abord les poules.";
    generateBracketButton.hidden = true;
    return;
  }

  if (poolMatchesMissingScore) {
    bracketInfo.textContent = "Termine tous les matchs de poule avant de générer le tableau final.";
    generateBracketButton.hidden = true;
    return;
  }

  generateBracketButton.hidden = false;
  bracketInfo.textContent = bracketMatches.length === 0 ? "Aucun tableau généré pour l'instant." : "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));

  BRACKET_GROUPS.forEach(({ label, phases }) => {
    const groupMatches = phases.flatMap((phase) => bracketMatches.filter((match) => match.phase === phase));
    if (groupMatches.length === 0) return;

    const { group, content } = createCollapsibleGroup(label);

    groupMatches.forEach((match) => {
      content.appendChild(createMatchRow(match, teamsById));
    });

    bracketList.appendChild(group);
  });
}
