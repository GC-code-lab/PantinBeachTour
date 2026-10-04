// Les 2 "sections" de la page (Gestion du tournoi / Connexion) sont choisies
// depuis le menu "⚙" du bandeau commun (voir js/nav.js), pas depuis cette page :
// un lien classique vers gestion.html (section par défaut) ou gestion.html#compte.
// On lit juste le hash au chargement, et on réagit s'il change sans rechargement
// (ex: on est déjà sur gestion.html et on reclique "Connexion" dans le menu).
function applySectionFromHash() {
  const showCompte = window.location.hash === "#compte";
  document.getElementById("section-gestion").hidden = showCompte;
  document.getElementById("section-compte").hidden = !showCompte;
}
applySectionFromHash();
window.addEventListener("hashchange", applySectionFromHash);

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

// Seul ce compte peut supprimer un compte ou déclasser un autre admin (aussi
// vérifié côté serveur dans assign_role/delete_account — ceci n'est qu'un
// confort d'affichage, pas la vraie barrière de sécurité).
const SUPER_ADMIN_EMAIL = "gabriel.cohen.1997@gmail.com";
let currentUserEmail = null;

const adminEmailDisplay = document.getElementById("admin-email-display");
const logoutButton = document.getElementById("logout-button");
const rolesSection = document.getElementById("roles-section");
const inscriptionTabButton = document.querySelector('.tab-button[data-tab="tab-inscription"]');
const poulesTabButton = document.querySelector('.tab-button[data-tab="tab-poules"]');
const matchsTabButton = document.querySelector('.tab-button[data-tab="tab-matchs"]');
const formuleTabButton = document.querySelector('.tab-button[data-tab="tab-formule"]');

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

// Seuls les admins voient l'inscription, les têtes de série/poules, et la gestion des rôles.
// Scorer ET admin voient Matchs & Résultats. Un compte sans rôle (créé mais pas encore
// assigné) ne voit RIEN de tout ça — juste l'onglet Connexion, comme un visiteur non connecté.
// Le bouton "Sauvegarde du tournoi" (Palmarès) est réservé aux admins, comme les
// autres actions structurantes du site (inscriptions, poules) — un scorer ne le voit
// jamais, même une fois le tournoi terminé.
//
// Avant même le rôle : tant qu'aucune formule n'a été choisie pour le tournoi, seuls
// les onglets "Connexion" et "Formule" existent — Inscription/Poules/Matchs restent
// cachés même pour un admin. Choisir une formule (voir plus bas) fait apparaître le
// reste d'un coup : c'est ce choix qui "ouvre" la gestion du tournoi.
let isAdminRole = false;
let hasAccessRole = false;

function applyTabVisibility() {
  const formatChosen = currentFormat !== null;
  inscriptionTabButton.hidden = !(isAdminRole && formatChosen);
  poulesTabButton.hidden = !(isAdminRole && formatChosen);
  matchsTabButton.hidden = !(hasAccessRole && formatChosen);
  formuleTabButton.hidden = !isAdminRole;
}

function applyRoleUI(role) {
  const isAdmin = role === "admin";
  isAdminRole = isAdmin;
  hasAccessRole = role === "admin" || role === "scorer";
  rolesSection.hidden = !isAdmin;
  applyTabVisibility();
  if (isAdmin) {
    loadAccountsList();
    loadSignupCodes();
  }
}

// Page protégée : sans session, retour direct à l'écran de connexion.
supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  if (!session) {
    window.location.href = "admin.html";
    return;
  }
  adminEmailDisplay.textContent = session.user.email;
  currentUserEmail = session.user.email;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();
  applyRoleUI(profile ? profile.role : null);

  loadTournamentFormats();
  loadAdminData();
});

// Formule du tournoi (12, 16, ou 12-quali16 pour l'instant — d'autres formules
// pourront s'ajouter plus tard). Une seule formule pour tout le tournoi, Hommes
// et Femmes confondus. `currentFormat === null` tant qu'aucune formule n'a encore
// été choisie (table `tournament_formats` vide) : c'est cet état qui garde les
// onglets Inscription/Poules/Matchs cachés, voir applyTabVisibility ci-dessus.
const formatButtons = document.querySelectorAll(".format-card");
const formatMessage = document.getElementById("format-message");
let currentFormat = null;

async function loadTournamentFormats() {
  const { data, error } = await supabaseClient.from("tournament_formats").select("*").maybeSingle();
  if (error || !data) return;

  currentFormat = data.format;
  renderFormatButtons();
  applyTabVisibility();
}

function renderFormatButtons() {
  formatButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.format === currentFormat);
  });
}

formatButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const format = button.dataset.format;
    if (format === currentFormat) return;

    // Bloqué dès qu'un score existe (n'importe quelle catégorie/phase) : au-delà de
    // ce point, changer de formule n'aurait plus de sens (le tournoi est en cours).
    const { count: setsCount, error: setsError } = await supabaseClient
      .from("sets")
      .select("id", { count: "exact", head: true });

    if (setsError) {
      formatMessage.textContent = "Erreur : " + setsError.message;
      formatMessage.style.color = "var(--color-coral)";
      return;
    }

    if (setsCount > 0) {
      alert("Impossible de changer de formule : des scores ont déjà été saisis pour ce tournoi.");
      return;
    }

    // Pas de score encore : on peut changer de formule librement. Les poules/matchs
    // des deux catégories sont réinitialisés (ils dépendent du nombre d'équipes
    // attendu par la formule), mais les équipes déjà inscrites restent — pas besoin
    // de les réinscrire après coup. resetPools ne touche jamais à la table `teams`.
    if (currentFormat !== null) {
      const confirmed = confirm(
        "Changer de formule réinitialise les poules et matchs en cours, pour les deux catégories. Les équipes déjà inscrites restent, mais il faudra régénérer les poules. Continuer ?"
      );
      if (!confirmed) return;

      await resetPools("Hommes");
      await resetPools("Femmes");
    }

    const { error } = await supabaseClient
      .from("tournament_formats")
      .upsert({ id: 1, format });

    if (error) {
      formatMessage.textContent = "Erreur : " + error.message;
      formatMessage.style.color = "var(--color-coral)";
      return;
    }

    currentFormat = format;
    renderFormatButtons();
    applyTabVisibility();
    formatMessage.textContent = "Formule enregistrée.";
    formatMessage.style.color = "var(--color-ocean-dark)";
    loadAdminData();
  });
});

const accountsList = document.getElementById("accounts-list");

// Liste unique de tous les comptes (avec ou sans rôle) avec, pour chacun, le
// contrôle pour attribuer/changer son rôle directement. Un compte déjà admin
// est affiché comme un badge fixe : impossible de le rétrograder depuis cette
// interface, sauf pour SUPER_ADMIN_EMAIL qui peut aussi tout supprimer.
// L'RPC assign_role/delete_account refait les mêmes vérifications côté
// serveur : ceci n'est qu'un affichage, pas la vraie barrière de sécurité.
async function loadAccountsList() {
  accountsList.innerHTML = "Chargement…";

  const { data, error } = await supabaseClient.rpc("list_all_accounts");

  if (error) {
    accountsList.textContent = "Erreur de chargement : " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    accountsList.textContent = "Aucun compte pour l'instant.";
    return;
  }

  const isSuperAdmin = currentUserEmail === SUPER_ADMIN_EMAIL;

  // Le compte principal reste toujours tout en haut et toujours admin, sans
  // bouton pour le changer (même pour lui-même) — assign_role le refuse aussi
  // côté serveur, donc ce n'est pas seulement caché à l'affichage.
  const sortedAccounts = [...data].sort((a, b) => {
    if (a.email === SUPER_ADMIN_EMAIL) return -1;
    if (b.email === SUPER_ADMIN_EMAIL) return 1;
    return a.email.localeCompare(b.email);
  });

  accountsList.innerHTML = "";
  sortedAccounts.forEach((account) => {
    const row = document.createElement("div");
    row.className = "team-row";

    const emailSpan = document.createElement("span");
    emailSpan.textContent = account.email;
    row.appendChild(emailSpan);

    const isLockedAdmin = account.email === SUPER_ADMIN_EMAIL || (account.role === "admin" && !isSuperAdmin);

    if (isLockedAdmin) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = account.email === SUPER_ADMIN_EMAIL ? "Propriétaire" : "Admin";
      row.appendChild(badge);
    } else {
      if (!account.role) {
        const noneBadge = document.createElement("span");
        noneBadge.className = "badge";
        noneBadge.textContent = "Aucun rôle";
        row.appendChild(noneBadge);
      }

      const toggle = document.createElement("div");
      toggle.className = "role-toggle";

      const options = [
        { value: "scorer", label: "Scorer" },
        { value: "admin", label: "Admin" },
      ];

      options.forEach((option) => {
        const isActive = account.role === option.value;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "category-button" + (isActive ? " active" : "");
        button.textContent = option.label;
        // Cliquer sur le rôle déjà actif le retire (remove_role) ; cliquer sur
        // l'autre l'attribue (assign_role) — un seul clic pour changer ou enlever.
        button.addEventListener("click", async () => {
          const { error: roleError } = isActive
            ? await supabaseClient.rpc("remove_role", { target_email: account.email })
            : await supabaseClient.rpc("assign_role", {
                target_email: account.email,
                target_role: option.value,
              });
          if (roleError) {
            alert("Erreur : " + roleError.message);
            return;
          }
          loadAccountsList();
        });
        toggle.appendChild(button);
      });

      row.appendChild(toggle);
    }

    if (isSuperAdmin && account.email !== currentUserEmail) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "button button-sm button-danger";
      deleteButton.textContent = "Supprimer";
      deleteButton.addEventListener("click", async () => {
        if (!confirm(`Supprimer le compte ${account.email} ? Action irréversible.`)) return;
        const { error: deleteError } = await supabaseClient.rpc("delete_account", {
          target_email: account.email,
        });
        if (deleteError) {
          alert("Erreur : " + deleteError.message);
          return;
        }
        loadAccountsList();
      });
      row.appendChild(deleteButton);
    }

    accountsList.appendChild(row);
  });
}

const codesForm = document.getElementById("codes-form");
const codesMessage = document.getElementById("codes-message");
const adminCodeInput = document.getElementById("admin-code");
const scorerCodeInput = document.getElementById("scorer-code");

async function loadSignupCodes() {
  const { data, error } = await supabaseClient.from("signup_codes").select("*");
  if (error || !data) return;

  const byRole = Object.fromEntries(data.map((row) => [row.role, row.code]));
  adminCodeInput.value = byRole.admin || "";
  scorerCodeInput.value = byRole.scorer || "";
}

codesForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const rows = [
    { role: "admin", code: adminCodeInput.value.trim() },
    { role: "scorer", code: scorerCodeInput.value.trim() },
  ];

  const { error } = await supabaseClient.from("signup_codes").upsert(rows);

  if (error) {
    codesMessage.textContent = "Erreur : " + error.message;
    codesMessage.style.color = "var(--color-coral)";
    return;
  }

  codesMessage.textContent = "Codes enregistrés.";
  codesMessage.style.color = "var(--color-ocean-dark)";
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
  const teamPointsValue = document.getElementById("team-points").value;

  const team = {
    category,
    name: `${player1Nom}/${player2Nom}`,
    player1_nom: player1Nom,
    player1_prenom: player1Prenom,
    player2_nom: player2Nom,
    player2_prenom: player2Prenom,
    points: Number(teamPointsValue),
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

function teamPoints(team) {
  return Number(team.points || 0);
}

function formatTeamDetailWithPoints(team) {
  return `${formatTeamDetail(team)} — ${teamPoints(team)} pts`;
}

// Import en masse : l'admin colle un JSON (obtenu en demandant à un chat IA de lire
// une capture d'écran du tableau de classement) plutôt que de retaper équipe par
// équipe. On prévisualise avant d'écrire en base, pour pouvoir corriger une erreur
// de lecture (nom coupé, points mal lus) avant confirmation.
const importToggle = document.getElementById("import-toggle");
const importContent = document.getElementById("import-content");

importToggle.addEventListener("click", () => {
  const isOpen = importToggle.getAttribute("aria-expanded") === "true";
  importToggle.setAttribute("aria-expanded", String(!isOpen));
  importContent.hidden = isOpen;
});

const IMPORT_PROMPT_TEXT =
  'Extrais chaque équipe de ce tableau (2 joueurs par équipe) en JSON, format : ' +
  '[{"player1_nom":"...", "player1_prenom":"...", "player2_nom":"...", "player2_prenom":"...", "points":...}, ...]. ' +
  "Un objet par équipe. Pour \"points\", utilise les points TECHNIQUE (pas les points d'inscription — " +
  "s'il y a deux colonnes de points dans le tableau, prends bien la colonne \"technique\"). " +
  "Réponds uniquement avec le JSON, rien d'autre.";

const importPromptText = document.getElementById("import-prompt-text");
const importCopyButton = document.getElementById("import-copy-button");
importPromptText.textContent = IMPORT_PROMPT_TEXT;

importCopyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(IMPORT_PROMPT_TEXT);
  const original = importCopyButton.textContent;
  importCopyButton.textContent = "Copié !";
  setTimeout(() => {
    importCopyButton.textContent = original;
  }, 1500);
});

const importJsonInput = document.getElementById("import-json-input");
const importPreviewButton = document.getElementById("import-preview-button");
const importMessage = document.getElementById("import-message");
const importPreview = document.getElementById("import-preview");
const importPreviewCount = document.getElementById("import-preview-count");
const importPreviewList = document.getElementById("import-preview-list");
const importConfirmButton = document.getElementById("import-confirm-button");
const importCancelButton = document.getElementById("import-cancel-button");
const importCategoryLabel = document.getElementById("import-category-label");

let pendingImportTeams = [];

function resetImportPreview() {
  pendingImportTeams = [];
  importPreview.hidden = true;
  importPreviewList.innerHTML = "";
}

importPreviewButton.addEventListener("click", () => {
  resetImportPreview();
  importMessage.textContent = "";

  let parsed;
  try {
    parsed = JSON.parse(importJsonInput.value);
  } catch (e) {
    importMessage.textContent = "JSON invalide — vérifie que tu as bien collé la réponse complète.";
    importMessage.style.color = "var(--color-coral)";
    return;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    importMessage.textContent = "Le JSON doit être une liste d'équipes non vide.";
    importMessage.style.color = "var(--color-coral)";
    return;
  }

  const requiredFields = ["player1_nom", "player1_prenom", "player2_nom", "player2_prenom"];
  const missingFieldRow = parsed.findIndex(
    (row) => !requiredFields.every((field) => typeof row[field] === "string" && row[field].trim() !== "")
  );
  if (missingFieldRow !== -1) {
    importMessage.textContent = `Équipe n°${missingFieldRow + 1} : nom ou prénom manquant dans le JSON.`;
    importMessage.style.color = "var(--color-coral)";
    return;
  }

  pendingImportTeams = parsed.map((row) => ({
    category: currentCategory,
    name: `${toUpper(row.player1_nom)}/${toUpper(row.player2_nom)}`,
    player1_nom: toUpper(row.player1_nom),
    player1_prenom: toCapitalized(row.player1_prenom),
    player2_nom: toUpper(row.player2_nom),
    player2_prenom: toCapitalized(row.player2_prenom),
    points: Number(row.points) || 0,
  }));

  importPreviewCount.textContent = pendingImportTeams.length;
  pendingImportTeams.forEach((team) => {
    const row = document.createElement("div");
    row.className = "team-row";
    const label = document.createElement("span");
    label.textContent = formatTeamDetailWithPoints(team);
    row.appendChild(label);
    importPreviewList.appendChild(row);
  });
  importPreview.hidden = false;
});

importCancelButton.addEventListener("click", () => {
  resetImportPreview();
  importMessage.textContent = "";
});

importConfirmButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.from("teams").insert(pendingImportTeams);

  if (error) {
    importMessage.textContent = "Erreur : " + error.message;
    importMessage.style.color = "var(--color-coral)";
    return;
  }

  importMessage.textContent = `${pendingImportTeams.length} équipes importées !`;
  importMessage.style.color = "var(--color-ocean-dark)";
  importJsonInput.value = "";
  resetImportPreview();
  loadAdminData();
});

const poolsList = document.getElementById("pools-list");
const teamsList = document.getElementById("teams-list");
const teamsCount = document.getElementById("teams-count");
const selectAllTeams = document.getElementById("select-all-teams");
const deleteSelectedButton = document.getElementById("delete-selected-button");

const selectedTeamIds = new Set();
const seedingList = document.getElementById("seeding-list");
const generate12Button = document.getElementById("generate-12");
const generate16Button = document.getElementById("generate-16");
const generateQualifPoolsButton = document.getElementById("generate-qualif-pools-button");
const generateMessage = document.getElementById("generate-message");
const qualifSeedPreview = document.getElementById("qualif-seed-preview");

let seedTeams = [];
let allTeams = [];

// Tant qu'aucun classement manuel n'a encore été fait pour la catégorie (tous les
// teams.seed sont null), l'ordre par défaut des têtes de série vient des points
// de la paire (décroissant). Dès qu'un classement manuel existe, on le respecte
// tel quel (nouvelles équipes ajoutées en dernier, à ajuster à la main).
function defaultSeedOrder(teams) {
  const hasManualSeed = teams.some((team) => team.seed != null);
  if (hasManualSeed) return teams;

  return teams.slice().sort((a, b) => {
    const diff = teamPoints(b) - teamPoints(a);
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

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
  importCategoryLabel.textContent = currentCategory;

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

  const { data: qualifMatches, error: qualifError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .in("phase", ["qualif_poule", "qualif_barrage1", "qualif_barrage2"]);

  if (poolsError || teamsError || matchesError || bracketError || qualifError) {
    poolsList.textContent = "Erreur de chargement des données.";
    return;
  }

  allTeams = teams;
  renderTeamsList(teams.filter((team) => team.category === currentCategory));

  const categoryPools = pools.filter((pool) => pool.category === currentCategory);
  const categoryTeams = teams.filter((team) => team.category === currentCategory);
  const categoryMatches = matches.filter((match) => match.category === currentCategory);
  const categoryBracketMatches = bracketMatches.filter((match) => match.category === currentCategory);
  const categoryQualifMatches = qualifMatches.filter((match) => match.category === currentCategory);

  renderPools(categoryPools, categoryTeams);
  seedTeams = defaultSeedOrder(categoryTeams);
  renderSeedingList();
  renderGenerateControls(categoryTeams.length);
  renderQualifSection(categoryTeams, categoryQualifMatches);
  renderMatchesTab(categoryPools, categoryTeams, categoryMatches);
  renderBracketTab(categoryPools, categoryTeams, categoryMatches, categoryBracketMatches);

  // Indépendant de currentCategory : le bouton "Sauvegarde du tournoi" exige que
  // les DEUX catégories soient terminées, pas seulement celle affichée.
  updateArchiveSection(teams, matches, bracketMatches);
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

// Version "chirurgicale" de resetPools, réservée à la formule "12-quali16" :
// ne touche qu'au Maindraw (pools "Poule A-D" + leurs matchs), jamais aux matchs
// de qualif (phase qualif_*, pool_id toujours null) — pour pouvoir régénérer le
// Maindraw sans perdre l'historique des qualifs déjà jouées.
async function resetMaindraw(category) {
  const { data: categoryPools } = await supabaseClient.from("pools").select("id").eq("category", category);
  const categoryPoolIds = (categoryPools || []).map((pool) => pool.id);

  if (categoryPoolIds.length > 0) {
    await supabaseClient.from("matches").delete().in("pool_id", categoryPoolIds);
  }
  await supabaseClient
    .from("matches")
    .delete()
    .eq("category", category)
    .is("pool_id", null)
    .in("phase", ["barrage", "quart", "demi", "petite_finale", "finale"]);
  await supabaseClient.from("teams").update({ pool_id: null }).eq("category", category);
  await supabaseClient.from("pools").delete().eq("category", category);
}

// Supprime uniquement les matchs de qualif (les équipes n'ont jamais de pool_id
// pendant les qualifs dans ce format — voir generateQualifPools).
async function resetQualif(category) {
  await supabaseClient
    .from("matches")
    .delete()
    .eq("category", category)
    .in("phase", ["qualif_poule", "qualif_barrage1", "qualif_barrage2"]);
}

function renderGenerateControls(count) {
  const isQuali16 = currentFormat === "12-quali16";

  generate12Button.hidden = isQuali16 || count !== 12;
  generate16Button.hidden = isQuali16 || count !== 16;
  generateQualifPoolsButton.hidden = !isQuali16 || count !== 24;
  qualifSeedPreview.hidden = !isQuali16;

  if (isQuali16) {
    generateMessage.textContent =
      count === 24 ? "" : `La catégorie ${currentCategory} doit compter 24 équipes pour générer les poules de qualification (actuellement ${count}).`;
    renderQualifSeedPreview();
  } else {
    generateMessage.textContent = "";
  }
}

// Aperçu informatif (pas d'écriture en base) : qui serait "direct" en Maindraw
// (les 8 meilleures têtes de série) et qui jouerait les qualifs (les 16 suivantes),
// d'après le classement actuel — recalculé à chaque rendu, jamais persisté tel quel.
function renderQualifSeedPreview() {
  qualifSeedPreview.innerHTML = "";

  const direct = seedTeams.slice(0, 8);
  const qualif = seedTeams.slice(8, 24);

  const makeList = (title, teams) => {
    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = title;
    wrap.appendChild(heading);
    const list = document.createElement("ul");
    teams.forEach((team) => {
      const item = document.createElement("li");
      item.textContent = formatTeamDetailWithPoints(team);
      list.appendChild(item);
    });
    wrap.appendChild(list);
    return wrap;
  };

  qualifSeedPreview.appendChild(makeList(`Direct Maindraw (${direct.length}/8)`, direct));
  qualifSeedPreview.appendChild(makeList(`Qualifications (${qualif.length}/16)`, qualif));
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

  const sortedTeams = teams.slice().sort((a, b) => teamPoints(b) - teamPoints(a));

  sortedTeams.forEach((team) => {
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
    label.textContent = formatTeamDetailWithPoints(team);
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

function moveSeed(fromIndex, toIndex) {
  const [moved] = seedTeams.splice(fromIndex, 1);
  seedTeams.splice(toIndex, 0, moved);
  renderSeedingList();
  saveSeedOrder();
}

// Classement : seedTeams[0] = tête de série n°1, etc. Réordonnable au glisser-déposer
// (souris, desktop) ou aux boutons ▲▼ (le drag-and-drop HTML5 ne marche quasiment
// jamais au toucher sur mobile — Safari iOS notamment ne le supporte pas du tout).
function renderSeedingList() {
  seedingList.innerHTML = "";

  seedTeams.forEach((team, index) => {
    const item = document.createElement("li");
    item.className = "seed-item";
    item.draggable = true;
    item.dataset.index = index;

    const label = document.createElement("span");
    label.textContent = formatTeamDetailWithPoints(team);
    item.appendChild(label);

    const controls = document.createElement("div");
    controls.className = "seed-controls";

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "seed-move-button";
    upButton.textContent = "▲";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveSeed(index, index - 1));
    controls.appendChild(upButton);

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "seed-move-button";
    downButton.textContent = "▼";
    downButton.disabled = index === seedTeams.length - 1;
    downButton.addEventListener("click", () => moveSeed(index, index + 1));
    controls.appendChild(downButton);

    item.appendChild(controls);

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
      moveSeed(fromIndex, toIndex);
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

// Crée les 4 "Poule A-D" (Maindraw) à partir d'une liste d'équipes déjà
// ordonnée (tête de série la plus haute en premier), les répartit en serpentin,
// assigne pool_id, et génère les matchs de poule (méthode du cercle). Partagé
// entre generatePools (formules 12/16 classiques) et generateMaindrawFromQualif
// (formule "12-quali16", une fois les qualifs terminées).
async function createMaindrawPoolsAndMatches(teamsInOrder, category) {
  const poolLabels = ["Poule A", "Poule B", "Poule C", "Poule D"];
  const groups = snakeAssign(teamsInOrder, 4);
  const matchRows = [];

  for (let i = 0; i < poolLabels.length; i++) {
    const { data: pool, error: poolError } = await supabaseClient
      .from("pools")
      .insert({ label: poolLabels[i], category })
      .select()
      .single();
    if (poolError) {
      alert("Erreur lors de la création des poules : " + poolError.message);
      return;
    }

    const teamIds = groups[i].map((team) => team.id);
    if (teamIds.length > 0) {
      const { error: assignError } = await supabaseClient
        .from("teams")
        .update({ pool_id: pool.id })
        .in("id", teamIds);
      if (assignError) {
        alert("Erreur lors de l'affectation des équipes aux poules : " + assignError.message);
        return;
      }
    }
    poolRoundRobin(teamIds).forEach(([team1Id, team2Id]) => {
      matchRows.push({
        phase: "poule",
        category,
        pool_id: pool.id,
        team1_id: team1Id,
        team2_id: team2Id,
        status: "a_venir",
      });
    });
  }

  if (matchRows.length > 0) {
    const { error: matchesError } = await supabaseClient.from("matches").insert(matchRows);
    if (matchesError) {
      alert("Erreur lors de la génération des matchs de poule : " + matchesError.message);
    }
  }
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

  await resetPools(currentCategory);
  await createMaindrawPoolsAndMatches(seedTeams.slice(0, teamCount), currentCategory);
  loadAdminData();
}

generate12Button.addEventListener("click", () => generatePools(12));
generate16Button.addEventListener("click", () => generatePools(16));

// Vainqueur/perdant d'un match tranché (il faut 2 sets gagnés) — utilisé pour
// dépouiller les qualifs (poules brésiliennes et barrages de qualif).
function matchWinnerLoser(match) {
  const sets = (match && match.sets) || [];
  const wins1 = sets.filter((s) => s.score_team1 > s.score_team2).length;
  const wins2 = sets.filter((s) => s.score_team2 > s.score_team1).length;
  if (wins1 > wins2) return { winnerId: match.team1_id, loserId: match.team2_id };
  return { winnerId: match.team2_id, loserId: match.team1_id };
}

// Formule "12-quali16" — étape 1 : les 24 équipes classées sont scindées en 8
// "direct Maindraw" (têtes de série 1-8) et 16 "qualifs" (9-24). Les 16 de qualif
// sont réparties en serpentin dans 4 poules brésiliennes (A-D) : tour 1 = 1v4 et
// 2v3, tour 2 (vainqueurs entre eux / perdants entre eux) créé en même temps,
// équipes à null, rempli automatiquement via BRACKET_PROGRESSION quand le tour 1
// est noté. Contrairement au Maindraw, ces poules de qualif ne sont pas des
// lignes de la table `pools` ni posées sur teams.pool_id — seules les 4 lettres
// (encodées dans le `slot`) portent le regroupement, pour ne jamais interférer
// avec les contrôles qui comptent "4 poules" côté Maindraw (generateBracketButton).
async function generateQualifPools() {
  if (seedTeams.length < 24) {
    alert(`Il faut au moins 24 équipes classées (catégorie ${currentCategory}) pour générer les poules de qualification.`);
    return;
  }

  const confirmed = confirm(
    `Générer les poules de qualification ${currentCategory} avec les 16 équipes de qualification (les 8 meilleures têtes de série vont direct en Maindraw) ? Les qualifications et le Maindraw actuels de cette catégorie seront réinitialisés.`
  );
  if (!confirmed) return;

  await resetQualif(currentCategory);
  await resetMaindraw(currentCategory);

  const top24 = seedTeams.slice(0, 24);
  const qualifTeams = top24.slice(8, 24);
  const groups = snakeAssign(qualifTeams, 4);
  const letters = ["A", "B", "C", "D"];

  const matchRows = [];
  letters.forEach((letter, i) => {
    const teams = groups[i];
    matchRows.push({ phase: "qualif_poule", slot: `q${letter}-r1-1`, category: currentCategory, team1_id: teams[0].id, team2_id: teams[3].id, status: "a_venir" });
    matchRows.push({ phase: "qualif_poule", slot: `q${letter}-r1-2`, category: currentCategory, team1_id: teams[1].id, team2_id: teams[2].id, status: "a_venir" });
    matchRows.push({ phase: "qualif_poule", slot: `q${letter}-r2-w`, category: currentCategory, team1_id: null, team2_id: null, status: "a_venir" });
    matchRows.push({ phase: "qualif_poule", slot: `q${letter}-r2-l`, category: currentCategory, team1_id: null, team2_id: null, status: "a_venir" });
  });

  const { error: insertError } = await supabaseClient.from("matches").insert(matchRows);
  if (insertError) {
    alert("Erreur lors de la génération des poules de qualification : " + insertError.message);
    return;
  }
  loadAdminData();
}

generateQualifPoolsButton.addEventListener("click", generateQualifPools);

// Formule "12-quali16" — étape 2 : une fois les 16 matchs de poule brésilienne
// notés, le classement 1-2-3-4 de chaque poule qualif se lit directement sur le
// tour 2 (vainqueur du match des vainqueurs = 1er, perdant de ce match = 2e,
// vainqueur du match des perdants = 3e, perdant de ce match = 4e — un bracket
// brésilienne est toujours tranché, pas besoin de différentiel de points).
async function generateQualifBarrages() {
  const { data: pouleMatches, error } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", currentCategory)
    .eq("phase", "qualif_poule");
  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  if (!pouleMatches || pouleMatches.length !== 16 || pouleMatches.some((m) => !m.sets || m.sets.length === 0)) {
    alert("Tous les matchs des poules de qualification (tour 1 et tour 2) doivent avoir un score.");
    return;
  }

  const bySlot = new Map(pouleMatches.map((m) => [m.slot, m]));
  const standings = {};
  ["A", "B", "C", "D"].forEach((letter) => {
    const roundWinners = matchWinnerLoser(bySlot.get(`q${letter}-r2-w`));
    const roundLosers = matchWinnerLoser(bySlot.get(`q${letter}-r2-l`));
    standings[letter] = [roundWinners.winnerId, roundWinners.loserId, roundLosers.winnerId, roundLosers.loserId];
  });

  const confirmed = confirm(
    `Générer les barrages de qualification ${currentCategory} ? Les barrages de qualification existants pour cette catégorie seront remplacés.`
  );
  if (!confirmed) return;

  await supabaseClient
    .from("matches")
    .delete()
    .eq("category", currentCategory)
    .in("phase", ["qualif_barrage1", "qualif_barrage2"]);

  const first = (letter) => standings[letter][0];
  const second = (letter) => standings[letter][1];
  const third = (letter) => standings[letter][2];

  const rows = [
    { phase: "qualif_barrage1", slot: "qb1", category: currentCategory, team1_id: second("A"), team2_id: third("C"), status: "a_venir" },
    { phase: "qualif_barrage1", slot: "qb2", category: currentCategory, team1_id: second("B"), team2_id: third("D"), status: "a_venir" },
    { phase: "qualif_barrage1", slot: "qb3", category: currentCategory, team1_id: second("C"), team2_id: third("A"), status: "a_venir" },
    { phase: "qualif_barrage1", slot: "qb4", category: currentCategory, team1_id: second("D"), team2_id: third("B"), status: "a_venir" },
    { phase: "qualif_barrage2", slot: "qb5", category: currentCategory, team1_id: first("A"), team2_id: null, status: "a_venir" },
    { phase: "qualif_barrage2", slot: "qb6", category: currentCategory, team1_id: first("B"), team2_id: null, status: "a_venir" },
    { phase: "qualif_barrage2", slot: "qb7", category: currentCategory, team1_id: first("C"), team2_id: null, status: "a_venir" },
    { phase: "qualif_barrage2", slot: "qb8", category: currentCategory, team1_id: first("D"), team2_id: null, status: "a_venir" },
  ];

  const { error: insertError } = await supabaseClient.from("matches").insert(rows);
  if (insertError) {
    alert("Erreur lors de la génération des barrages de qualification : " + insertError.message);
    return;
  }
  loadAdminData();
}

// Formule "12-quali16" — étape 3 : une fois les 4 barrages du 2e tour (qb5-qb8)
// notés, leurs vainqueurs sont les 4 qualifiés. Avec les 8 équipes "direct" (têtes
// de série 1-8, recalculées depuis le classement actuel), ça fait les 12 équipes
// du Maindraw — reclassées par POINTS (pas par tête de série) puis réparties en
// serpentin, exactement comme generatePools.
async function generateMaindrawFromQualif() {
  const { data: barrage2Matches, error } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", currentCategory)
    .eq("phase", "qualif_barrage2");
  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  if (!barrage2Matches || barrage2Matches.length !== 4 || barrage2Matches.some((m) => !m.sets || m.sets.length === 0)) {
    alert("Les 4 barrages de qualification (2e tour) doivent tous avoir un score.");
    return;
  }

  const qualifierIds = barrage2Matches.map((match) => matchWinnerLoser(match).winnerId);

  const { data: qualifierTeams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .in("id", qualifierIds);
  if (teamsError) {
    alert("Erreur : " + teamsError.message);
    return;
  }

  const directTeams = seedTeams.slice(0, 8);
  const maindrawTeams = [...directTeams, ...qualifierTeams].sort((a, b) => {
    const diff = teamPoints(b) - teamPoints(a);
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at);
  });

  const confirmed = confirm(
    `Générer les 4 poules du Maindraw ${currentCategory} avec les 8 équipes direct + les 4 équipes qualifiées ? Les poules du Maindraw existantes pour cette catégorie seront remplacées.`
  );
  if (!confirmed) return;

  await resetMaindraw(currentCategory);
  await createMaindrawPoolsAndMatches(maindrawTeams, currentCategory);
  loadAdminData();
}

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

  // Formule "12-quali16" : poules de qualif en poule brésilienne (tour 1 = 1v4/2v3,
  // tour 2 = vainqueurs entre eux pour les places 1-2, perdants entre eux pour 3-4),
  // puis 2 tours de barrages de qualif (voir generateQualifBarrages).
  "qA-r1-1": { winner: { nextSlot: "qA-r2-w", position: "team1_id" }, loser: { nextSlot: "qA-r2-l", position: "team1_id" } },
  "qA-r1-2": { winner: { nextSlot: "qA-r2-w", position: "team2_id" }, loser: { nextSlot: "qA-r2-l", position: "team2_id" } },
  "qB-r1-1": { winner: { nextSlot: "qB-r2-w", position: "team1_id" }, loser: { nextSlot: "qB-r2-l", position: "team1_id" } },
  "qB-r1-2": { winner: { nextSlot: "qB-r2-w", position: "team2_id" }, loser: { nextSlot: "qB-r2-l", position: "team2_id" } },
  "qC-r1-1": { winner: { nextSlot: "qC-r2-w", position: "team1_id" }, loser: { nextSlot: "qC-r2-l", position: "team1_id" } },
  "qC-r1-2": { winner: { nextSlot: "qC-r2-w", position: "team2_id" }, loser: { nextSlot: "qC-r2-l", position: "team2_id" } },
  "qD-r1-1": { winner: { nextSlot: "qD-r2-w", position: "team1_id" }, loser: { nextSlot: "qD-r2-l", position: "team1_id" } },
  "qD-r1-2": { winner: { nextSlot: "qD-r2-w", position: "team2_id" }, loser: { nextSlot: "qD-r2-l", position: "team2_id" } },
  "qb1": { winner: { nextSlot: "qb6", position: "team2_id" } },
  "qb2": { winner: { nextSlot: "qb5", position: "team2_id" } },
  "qb3": { winner: { nextSlot: "qb8", position: "team2_id" } },
  "qb4": { winner: { nextSlot: "qb7", position: "team2_id" } },
};

function requiredSetWins(phase) {
  return phase === "poule" ? 1 : 2;
}

// Points à atteindre pour gagner un set donné, selon la phase (règles du tournoi,
// voir section 7 du GUIDE.md) : poule = 21 ; barrage = 15 (tie-break 11) ;
// quart/demi/petite finale/finale = 21 (tie-break 15) — SAUF en formule
// "12-quali16", où tout le Maindraw (hors poules) se joue en 15 (tie-break 11),
// comme les qualifs (poules brésiliennes et barrages de qualif, toujours 15/11).
function setTargetPoints(phase, setNumber) {
  if (phase === "poule") return 21;
  if (phase === "barrage" || phase.startsWith("qualif_")) return setNumber === 3 ? 11 : 15;
  if (currentFormat === "12-quali16") return setNumber === 3 ? 11 : 15;
  return setNumber === 3 ? 15 : 21;
}

// Un set est gagné dès que le vainqueur atteint la cible ET mène par au moins 2 points.
// Au-delà de la cible (prolongation), le score final ne peut être qu'exactement +2
// (le set s'arrête à la première occasion où l'écart de 2 points est atteint).
function isValidSetScore(target, score1, score2) {
  const winner = Math.max(score1, score2);
  const loser = Math.min(score1, score2);
  if (winner < target) return false;
  if (winner - loser < 2) return false;
  if (winner > target && winner - loser !== 2) return false;
  return true;
}

// Vide le score d'un match déjà joué (tous les champs effacés puis "Enregistrer") :
// supprime ses sets et le remet "a_venir". Si ce match avait déjà fait avancer une
// équipe au tour suivant (BRACKET_PROGRESSION), ça défait aussi cette propagation —
// sauf si le match suivant a déjà été joué avec cette équipe, auquel cas on bloque
// (il faut d'abord effacer SON score, en remontant le tableau pas à pas).
async function clearMatchSets(match) {
  const progression = BRACKET_PROGRESSION[match.slot];
  const nextSlots = progression
    ? [progression.winner, progression.loser].filter(Boolean).map((p) => p.nextSlot)
    : [];

  if (nextSlots.length > 0) {
    const { data: nextMatches, error } = await supabaseClient
      .from("matches")
      .select("*, sets(*)")
      .eq("category", match.category)
      .in("slot", nextSlots);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    const alreadyPlayed = (nextMatches || []).some((m) => m.sets && m.sets.length > 0);
    if (alreadyPlayed) {
      alert(
        "Impossible d'effacer ce score : le match suivant a déjà été joué avec l'équipe issue de ce match. Efface d'abord son score à lui."
      );
      return;
    }
  }

  await supabaseClient.from("sets").delete().eq("match_id", match.id);
  await supabaseClient.from("matches").update({ status: "a_venir" }).eq("id", match.id);

  if (progression) {
    if (progression.winner) {
      await supabaseClient
        .from("matches")
        .update({ [progression.winner.position]: null })
        .eq("slot", progression.winner.nextSlot)
        .eq("category", match.category);
    }
    if (progression.loser) {
      await supabaseClient
        .from("matches")
        .update({ [progression.loser.position]: null })
        .eq("slot", progression.loser.nextSlot)
        .eq("category", match.category);
    }
  }

  [1, 2, 3].forEach((setNumber) => draftScores.delete(`${match.id}-${setNumber}`));
  loadAdminData();
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

  // Le brouillon (ce que l'utilisateur vient de taper) doit primer sur la valeur
  // déjà enregistrée : sinon, corriger le score d'un match déjà noté se fait
  // écraser par l'ancienne valeur dès qu'un autre match est enregistré à côté.
  const input1 = document.createElement("input");
  input1.type = "number";
  input1.min = "0";
  if (draft) input1.value = draft.score1;
  else if (existing) input1.value = existing.score_team1;

  const separator = document.createElement("span");
  separator.textContent = "-";

  const input2 = document.createElement("input");
  input2.type = "number";
  input2.min = "0";
  if (draft) input2.value = draft.score2;
  else if (existing) input2.value = existing.score_team2;

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
function collectEnteredSets(setInputs, phase) {
  const enteredSets = [];
  for (const { setNumber, input1, input2 } of setInputs) {
    if (input1.value === "" && input2.value === "") continue;
    const score1 = Number(input1.value);
    const score2 = Number(input2.value);
    if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0 || score1 === score2) {
      alert("Merci d'entrer un score valide (et différent) pour les deux équipes.");
      return null;
    }
    const target = setTargetPoints(phase, setNumber);
    if (!isValidSetScore(target, score1, score2)) {
      alert(`Score invalide pour le set ${setNumber} : il faut ${target} points et 2 points d'écart minimum.`);
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
// juste "À déterminer" à la place du formulaire de score — sauf si `options.placeholders`
// fournit un texte plus précis (ex: "Vainqueur du Barrage 2") pour ce match précis.
// `options.label` ajoute en plus une étiquette devant le match (ex: "Barrage 3"),
// utile quand il faut pouvoir citer un match précis par son numéro (barrages de qualif).
function createMatchRow(match, teamsById, options = {}) {
  const { label, placeholders = {} } = options;
  const bothTeamsKnown = Boolean(match.team1_id && match.team2_id);
  const isMultiSet = match.phase !== "poule";
  const setsByNumber = new Map((match.sets || []).map((s) => [s.set_number, s]));
  const setInputs = [];
  const team1Label = match.team1_id ? teamLabel(match.team1_id, teamsById) : placeholders.team1 || "À déterminer";
  const team2Label = match.team2_id ? teamLabel(match.team2_id, teamsById) : placeholders.team2 || "À déterminer";

  const row = document.createElement("div");
  row.className = match.status === "termine" ? "match-row match-row-done" : "match-row";

  if (label) {
    const orderTag = document.createElement("span");
    orderTag.className = "match-order-tag";
    orderTag.textContent = label;
    row.appendChild(orderTag);
  }

  const team1Span = document.createElement("span");
  team1Span.className = "match-team";
  team1Span.textContent = team1Label;

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
    team2Span.textContent = team2Label;
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
    team2Span.textContent = team2Label;
    row.appendChild(team2Span);
  }

  if (bothTeamsKnown) {
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "button button-sm";
    saveButton.textContent = "Enregistrer";
    saveButton.addEventListener("click", () => {
      // Désactivé dès le clic : sans ça, un double-clic (ou un clic avant la fin du
      // rechargement précédent) relance saveMatchSets avec le même match.sets périmé,
      // qui ne voit pas encore le set tout juste créé et en RE-insère un en double au
      // lieu de le mettre à jour. Le bouton est de toute façon remplacé à chaque
      // loadAdminData(), donc pas besoin de le réactiver à la main après coup.
      if (saveButton.disabled) return;

      // Tous les champs vidés sur un match qui avait déjà un score : au lieu de
      // bloquer avec "entrer un score valide", on efface le score existant.
      const allEmpty = setInputs.every(({ input1, input2 }) => input1.value === "" && input2.value === "");
      if (allEmpty && match.sets && match.sets.length > 0) {
        saveButton.disabled = true;
        clearMatchSets(match);
        return;
      }

      const enteredSets = collectEnteredSets(setInputs, match.phase);
      if (!enteredSets) return;
      saveButton.disabled = true;
      saveMatchSets(match, enteredSets);
    });
    actions.appendChild(saveButton);
  }

  if (isMultiSet) row.appendChild(actions);

  return row;
}

// Un groupe de matchs repliable (poule, ou tour du tableau final) : replié par
// défaut, avec juste le titre + une flèche ; un clic révèle les matchs à l'intérieur.
// Le tableau final et les matchs de poule sont entièrement reconstruits après chaque
// enregistrement (loadAdminData) : on retient donc quels groupes sont ouverts, par clé
// stable, pour ne pas les refermer sous le nez de l'utilisateur à chaque sauvegarde.
const openGroups = new Set();

function createCollapsibleGroup(title, groupKey) {
  const group = document.createElement("div");
  group.className = "matches-group";

  const isOpen = openGroups.has(groupKey);

  const header = document.createElement("button");
  header.type = "button";
  header.className = "pool-card-header";
  header.setAttribute("aria-expanded", String(isOpen));

  const labelSpan = document.createElement("span");
  labelSpan.textContent = title;
  header.appendChild(labelSpan);

  const chevron = document.createElement("span");
  chevron.className = "pool-card-chevron";
  chevron.textContent = "▾";
  header.appendChild(chevron);

  const content = document.createElement("div");
  content.className = "pool-card-content";
  content.hidden = !isOpen;

  header.addEventListener("click", () => {
    const nowOpen = header.getAttribute("aria-expanded") !== "true";
    header.setAttribute("aria-expanded", String(nowOpen));
    content.hidden = !nowOpen;
    if (nowOpen) openGroups.add(groupKey);
    else openGroups.delete(groupKey);
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

    const { group, content } = createCollapsibleGroup(pool.label, `poule-${currentCategory}-${pool.id}`);

    poolMatches.forEach((match) => {
      content.appendChild(createMatchRow(match, teamsById));
    });

    matchesList.appendChild(group);
  });
}

// --- Formule "12-quali16" : section "Qualifications" de l'onglet Matchs & Résultats ---

// Numéro affiché devant chaque barrage de qualif (slot qb1..qb8 -> "Barrage 1".."Barrage 8"),
// et texte de remplacement pour l'équipe pas encore connue d'un match du 2e tour (qb5-qb8) :
// au lieu d'un "À déterminer" générique, on dit explicitement quel barrage il faut suivre
// pour savoir qui on affrontera (le croisement est fixé dans generateQualifBarrages).
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
  qb5: { team2: "Vainqueur du Barrage 2" },
  qb6: { team2: "Vainqueur du Barrage 1" },
  qb7: { team2: "Vainqueur du Barrage 4" },
  qb8: { team2: "Vainqueur du Barrage 3" },
};

const qualifSection = document.getElementById("qualif-section");
const qualifInfo = document.getElementById("qualif-info");
const qualifPoolsList = document.getElementById("qualif-pools-list");
const generateQualifBarragesButton = document.getElementById("generate-qualif-barrages-button");
const qualifBarragesList = document.getElementById("qualif-barrages-list");
const generateMaindrawButton = document.getElementById("generate-maindraw-button");

function renderQualifSection(teams, qualifMatches) {
  const isQuali16 = currentFormat === "12-quali16";
  qualifSection.hidden = !isQuali16;
  if (!isQuali16) return;

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const pouleMatches = qualifMatches.filter((m) => m.phase === "qualif_poule");
  const barrage1Matches = qualifMatches.filter((m) => m.phase === "qualif_barrage1");
  const barrage2Matches = qualifMatches.filter((m) => m.phase === "qualif_barrage2");

  qualifInfo.textContent =
    pouleMatches.length === 0 ? "Génère d'abord les poules de qualification dans l'onglet précédent." : "";

  qualifPoolsList.innerHTML = "";
  const pouleBySlot = new Map(pouleMatches.map((m) => [m.slot, m]));
  ["A", "B", "C", "D"].forEach((letter) => {
    const slots = [`q${letter}-r1-1`, `q${letter}-r1-2`, `q${letter}-r2-w`, `q${letter}-r2-l`];
    const groupMatches = slots.map((slot) => pouleBySlot.get(slot)).filter(Boolean);
    if (groupMatches.length === 0) return;

    const { group, content } = createCollapsibleGroup(`Poule Qualif ${letter}`, `qualif-${currentCategory}-${letter}`);
    groupMatches.forEach((match) => content.appendChild(createMatchRow(match, teamsById)));
    qualifPoolsList.appendChild(group);
  });

  const pouleMissingScore = pouleMatches.length !== 16 || pouleMatches.some((m) => !m.sets || m.sets.length === 0);
  generateQualifBarragesButton.hidden = pouleMissingScore;

  qualifBarragesList.innerHTML = "";
  const barrageBySlot = new Map([...barrage1Matches, ...barrage2Matches].map((m) => [m.slot, m]));
  const barrageSlots = ["qb1", "qb2", "qb3", "qb4", "qb5", "qb6", "qb7", "qb8"];
  const allBarrages = barrageSlots.map((slot) => barrageBySlot.get(slot)).filter(Boolean);
  if (allBarrages.length > 0) {
    const { group, content } = createCollapsibleGroup("Barrages de qualification", `qualif-barrages-${currentCategory}`);
    allBarrages.forEach((match) => {
      content.appendChild(
        createMatchRow(match, teamsById, {
          label: QUALIF_BARRAGE_LABELS[match.slot],
          placeholders: QUALIF_BARRAGE_PLACEHOLDERS[match.slot],
        })
      );
    });
    qualifBarragesList.appendChild(group);
  }

  const barrage2MissingScore = barrage2Matches.length !== 4 || barrage2Matches.some((m) => !m.sets || m.sets.length === 0);
  generateMaindrawButton.hidden = barrage2MissingScore;
}

generateQualifBarragesButton.addEventListener("click", generateQualifBarrages);
generateMaindrawButton.addEventListener("click", generateMaindrawFromQualif);

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

// Classe les équipes d'une poule par victoires ; en cas d'égalité de victoires entre
// plusieurs équipes (2 à égalité, ou "triangulaire" à 3 dans une poule de 4), l'ordre
// de départage est : 1) pointaverage UNIQUEMENT sur les matchs joués entre les
// équipes à égalité, 2) si toujours égal, pointaverage face à la ou les équipes HORS
// du groupe (la "4e équipe"), 3) si toujours égal, rang de tête de série.
function computePoolStandings(pool, teams, poolMatches, seedRankByTeamId) {
  const poolTeams = teams.filter((team) => team.pool_id === pool.id);
  const teamsInPoolMatches = poolMatches.filter((match) => match.pool_id === pool.id);

  const wins = new Map(poolTeams.map((team) => [team.id, 0]));
  teamsInPoolMatches.forEach((match) => {
    const set = match.sets && match.sets[0];
    if (!set || !wins.has(match.team1_id) || !wins.has(match.team2_id)) return;
    const winnerId = set.score_team1 > set.score_team2 ? match.team1_id : match.team2_id;
    wins.set(winnerId, wins.get(winnerId) + 1);
  });

  const groupsByWins = new Map();
  poolTeams.forEach((team) => {
    const winCount = wins.get(team.id);
    if (!groupsByWins.has(winCount)) groupsByWins.set(winCount, []);
    groupsByWins.get(winCount).push(team);
  });

  const ranked = [];
  [...groupsByWins.keys()]
    .sort((a, b) => b - a)
    .forEach((winCount) => {
      const group = groupsByWins.get(winCount);
      if (group.length === 1) {
        ranked.push(group[0]);
        return;
      }

      const groupIds = new Set(group.map((team) => team.id));
      const subDiff = new Map(group.map((team) => [team.id, 0]));
      const externalDiff = new Map(group.map((team) => [team.id, 0]));

      teamsInPoolMatches.forEach((match) => {
        const set = match.sets && match.sets[0];
        if (!set) return;
        const inGroup1 = groupIds.has(match.team1_id);
        const inGroup2 = groupIds.has(match.team2_id);
        if (inGroup1 && inGroup2) {
          subDiff.set(match.team1_id, subDiff.get(match.team1_id) + (set.score_team1 - set.score_team2));
          subDiff.set(match.team2_id, subDiff.get(match.team2_id) + (set.score_team2 - set.score_team1));
        } else if (inGroup1) {
          externalDiff.set(match.team1_id, externalDiff.get(match.team1_id) + (set.score_team1 - set.score_team2));
        } else if (inGroup2) {
          externalDiff.set(match.team2_id, externalDiff.get(match.team2_id) + (set.score_team2 - set.score_team1));
        }
      });

      const sortedGroup = group.slice().sort((a, b) => {
        const sub = subDiff.get(b.id) - subDiff.get(a.id);
        if (sub !== 0) return sub;
        const ext = externalDiff.get(b.id) - externalDiff.get(a.id);
        if (ext !== 0) return ext;
        return seedRankByTeamId.get(a.id) - seedRankByTeamId.get(b.id);
      });
      ranked.push(...sortedGroup);
    });

  return ranked;
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

    const seedRankByTeamId = new Map(defaultSeedOrder(teams).map((team, index) => [team.id, index + 1]));
    const standings = {};
    pools.forEach((pool) => {
      standings[pool.label] = computePoolStandings(pool, teams, poolMatches, seedRankByTeamId);
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

    const { group, content } = createCollapsibleGroup(label, `bracket-${currentCategory}-${label}`);

    groupMatches.forEach((match) => {
      content.appendChild(createMatchRow(match, teamsById));
    });

    bracketList.appendChild(group);
  });
}

// --- Sauvegarde du tournoi dans le Palmarès ---

const archiveSection = document.getElementById("archive-section");
const archiveOpenButton = document.getElementById("archive-open-button");
const archiveForm = document.getElementById("archive-form");
const archiveNameInput = document.getElementById("archive-name");
const archiveMonthSelect = document.getElementById("archive-month");
const archiveYearInput = document.getElementById("archive-year");
const archiveCancelButton = document.getElementById("archive-cancel-button");
const archiveMessage = document.getElementById("archive-message");

const ARCHIVE_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

ARCHIVE_MOIS.forEach((label, index) => {
  const option = document.createElement("option");
  option.value = String(index + 1);
  option.textContent = label;
  archiveMonthSelect.appendChild(option);
});

// Dernières données chargées (toutes catégories confondues), pour construire le
// snapshot au clic sur "Confirmer" sans refaire de requêtes.
let latestTeamsForArchive = [];
let latestBracketMatchesForArchive = [];

// Un match de poule ou de phase finale est "terminé" (status === "termine") dès
// qu'il a assez de sets gagnés — voir requiredSetWins/saveMatchSets plus haut.
function isCategoryComplete(category, poolMatches, bracketMatches) {
  const catPoolMatches = poolMatches.filter((match) => match.category === category);
  const catBracketMatches = bracketMatches.filter((match) => match.category === category);
  if (catPoolMatches.length === 0 || catBracketMatches.length === 0) return false;

  const hasFinale = catBracketMatches.some((match) => match.phase === "finale");
  const hasPetiteFinale = catBracketMatches.some((match) => match.phase === "petite_finale");
  if (!hasFinale || !hasPetiteFinale) return false;

  return (
    catPoolMatches.every((match) => match.status === "termine") &&
    catBracketMatches.every((match) => match.status === "termine")
  );
}

function updateArchiveSection(teams, poolMatches, bracketMatches) {
  const bothCategoriesComplete = ["Hommes", "Femmes"].every((category) =>
    isCategoryComplete(category, poolMatches, bracketMatches)
  );

  archiveSection.hidden = !(isAdminRole && bothCategoriesComplete);
  latestTeamsForArchive = teams;
  latestBracketMatchesForArchive = bracketMatches;
}

archiveOpenButton.addEventListener("click", () => {
  const now = new Date();
  archiveYearInput.value = now.getFullYear();
  archiveMonthSelect.value = String(now.getMonth() + 1);
  archiveMessage.textContent = "";
  archiveForm.hidden = false;
  archiveOpenButton.hidden = true;
});

archiveCancelButton.addEventListener("click", () => {
  archiveForm.hidden = true;
  archiveOpenButton.hidden = false;
  archiveMessage.textContent = "";
});

// Snapshot figé, indépendant des tables live teams/matches/pools : ces dernières
// seront vidées avant le prochain tournoi, donc le Palmarès doit tout stocker
// lui-même (équipes + matchs de phases finales avec leurs sets), pas juste des ids.
function buildTournamentSnapshot() {
  const categories = {};
  ["Hommes", "Femmes"].forEach((category) => {
    categories[category] = {
      teams: latestTeamsForArchive.filter((team) => team.category === category),
      matches: latestBracketMatchesForArchive.filter((match) => match.category === category),
    };
  });
  return { categories };
}

archiveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  archiveMessage.textContent = "Sauvegarde en cours…";

  const { error } = await supabaseClient.from("tournament_archives").insert({
    name: archiveNameInput.value.trim(),
    month: Number(archiveMonthSelect.value),
    year: Number(archiveYearInput.value),
    data: buildTournamentSnapshot(),
  });

  if (error) {
    archiveMessage.textContent = "Erreur : " + error.message;
    return;
  }

  archiveMessage.textContent = "Tournoi sauvegardé dans le Palmarès ✅";
  archiveForm.hidden = true;
  archiveOpenButton.hidden = false;
});
