// Les 3 "sections" de la page (Gestion du tournoi / Amélioration du site / Connexion)
// sont choisies depuis le menu "⚙" du bandeau commun (voir js/nav.js), pas depuis
// cette page : un lien classique vers gestion.html (section par défaut),
// gestion.html#feedback ou gestion.html#compte. On lit juste le hash au chargement,
// et on réagit s'il change sans rechargement (ex: on est déjà sur gestion.html et on
// reclique une autre destination dans le menu).
const GESTION_SECTIONS_BY_HASH = {
  "#feedback": "section-feedback",
  "#compte": "section-compte",
};

function applySectionFromHash() {
  const activeId = GESTION_SECTIONS_BY_HASH[window.location.hash] || "section-gestion";
  ["section-gestion", "section-feedback", "section-compte"].forEach((id) => {
    document.getElementById(id).hidden = id !== activeId;
  });
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

  // L'onglet affiché ne doit jamais être un onglet caché (ex: un scorer arrivait sur
  // "Formule", dont seul le bouton était caché, pas le contenu) : on bascule sur le
  // premier onglet visible. Aucun onglet visible (compte sans rôle) -> rien d'affiché.
  const activeButton = document.querySelector(".tab-button.active");
  if (!activeButton || activeButton.hidden) {
    const firstVisible = [...tabButtons].find((b) => !b.hidden);
    if (firstVisible) {
      firstVisible.click();
    } else {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanels.forEach((panel) => (panel.hidden = true));
    }
  }
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
    loadFeedbackList();
  }
}

// --- Amélioration du site : boîte à suggestions pour admins/scorers ---
// N'importe quel admin ou scorer peut envoyer un message (table `site_feedback`,
// policy RLS "insert" ouverte à ces deux rôles). Seuls les admins voient la liste
// des retours reçus (policy RLS "select" réservée aux admins) — un scorer peut
// écrire mais pas relire ce que les autres ont envoyé, comme une boîte à idées.
const feedbackForm = document.getElementById("feedback-form");
const feedbackMessageInput = document.getElementById("feedback-message");
const feedbackFormMessage = document.getElementById("feedback-form-message");
const feedbackListSection = document.getElementById("feedback-list-section");
const feedbackList = document.getElementById("feedback-list");

feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = feedbackMessageInput.value.trim();
  if (!message) return;

  const { error } = await supabaseClient
    .from("site_feedback")
    .insert({ message, author_email: currentUserEmail });

  if (error) {
    feedbackFormMessage.textContent = "Erreur : " + error.message;
    feedbackFormMessage.style.color = "var(--color-coral)";
    return;
  }

  feedbackForm.reset();
  feedbackFormMessage.textContent = "Merci, c'est envoyé !";
  feedbackFormMessage.style.color = "var(--color-ocean-dark)";
  if (isAdminRole) loadFeedbackList();
});

function formatFeedbackDate(isoString) {
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadFeedbackList() {
  feedbackListSection.hidden = false;
  feedbackList.textContent = "Chargement…";

  const { data, error } = await supabaseClient
    .from("site_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    feedbackList.textContent = "Erreur de chargement : " + error.message;
    return;
  }

  feedbackList.innerHTML = "";

  if (data.length === 0) {
    feedbackList.textContent = "Aucun retour pour l'instant.";
    return;
  }

  data.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "pool-card";

    const message = document.createElement("p");
    message.textContent = entry.message;
    card.appendChild(message);

    const meta = document.createElement("p");
    meta.className = "form-message";
    meta.textContent = `${entry.author_email} — ${formatFeedbackDate(entry.created_at)}`;
    card.appendChild(meta);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-danger button-sm";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", async () => {
      if (!confirm("Supprimer ce message ?")) return;
      const { error: deleteError } = await supabaseClient.from("site_feedback").delete().eq("id", entry.id);
      if (deleteError) {
        alert("Erreur : " + deleteError.message);
        return;
      }
      loadFeedbackList();
    });
    card.appendChild(deleteButton);

    feedbackList.appendChild(card);
  });
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
// Formule + réglages d'horaires (ligne unique de tournament_formats, complétée par
// les valeurs par défaut de TIMING_DEFAULTS — voir js/tournoi-commun.js).
let tournamentSettings = { ...TIMING_DEFAULTS, format: null };

async function loadTournamentFormats() {
  tournamentSettings = await fetchTournamentSettings();
  currentFormat = tournamentSettings.format;
  renderFormatButtons();
  applyTabVisibility();
  renderTimingForm();
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
    const hadFormat = currentFormat !== null;
    if (hadFormat) {
      const confirmed = confirm(
        "Changer de formule réinitialise les poules et matchs en cours, pour les deux catégories. Les équipes déjà inscrites restent, mais il faudra régénérer les poules. Continuer ?"
      );
      if (!confirmed) return;
    }

    // La formule est enregistrée AVANT de vider les poules : si l'enregistrement est
    // refusé, on s'arrête là sans avoir rien effacé.
    const { error } = await supabaseClient
      .from("tournament_formats")
      .upsert({ id: 1, format });

    if (error) {
      formatMessage.textContent = "Erreur : " + error.message;
      formatMessage.style.color = "var(--color-coral)";
      return;
    }

    if (hadFormat) {
      await resetPools("Hommes");
      await resetPools("Femmes");
    }

    currentFormat = format;
    tournamentSettings.format = format;
    renderFormatButtons();
    applyTabVisibility();
    renderTimingForm();
    formatMessage.textContent = "Formule enregistrée.";
    formatMessage.style.color = "var(--color-ocean-dark)";
    loadAdminData();
  });
});

// --- Horaires (onglet Formule) ---
// Heure de début de chaque journée + durée d'un match selon son format. Les heures
// affichées dans "Ordre des matchs" et "Suivi d'équipe" en sont calculées (voir
// buildSchedules dans js/tournoi-commun.js). Case décochée : ordre de passage seul.
const timingSection = document.getElementById("timing-section");
const timingForm = document.getElementById("timing-form");
const timingFields = document.getElementById("timing-fields");
const timingMessage = document.getElementById("timing-message");
const timingSummary = document.getElementById("timing-summary");
const timingInputs = {
  show_timing: document.getElementById("timing-show"),
  saturday_start: document.getElementById("timing-saturday"),
  sunday_start: document.getElementById("timing-sunday"),
  duration_1x21: document.getElementById("timing-1x21"),
  duration_2x15: document.getElementById("timing-2x15"),
  duration_2x21: document.getElementById("timing-2x21"),
};

// "9:00" / "09:00:00" -> "09:00" (format attendu par <input type="time">)
function toTimeInputValue(value) {
  const minutes = parseClock(value);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function readTimingForm() {
  return {
    show_timing: timingInputs.show_timing.checked,
    saturday_start: timingInputs.saturday_start.value,
    sunday_start: timingInputs.sunday_start.value,
    duration_1x21: Number(timingInputs.duration_1x21.value),
    duration_2x15: Number(timingInputs.duration_2x15.value),
    duration_2x21: Number(timingInputs.duration_2x21.value),
  };
}

// Champs utiles selon la formule + fin de journée prévue, recalculée à chaque frappe.
function updateTimingPreview() {
  const isQuali16 = currentFormat === "12-quali16";
  const values = readTimingForm();
  timingFields.hidden = !values.show_timing;
  document.getElementById("timing-saturday-field").hidden = !isQuali16;
  // En formule "12-quali16", aucun match ne se joue en 2 sets à 21.
  document.getElementById("timing-2x21-field").hidden = isQuali16;
  document.getElementById("timing-sunday-label").textContent = isQuali16 ? "Début dimanche" : "Début du tournoi";

  const schedules = buildSchedules({ ...values, show_timing: true, format: currentFormat });
  const parts = [];
  if (isQuali16) parts.push(`samedi vers ${schedules.qualif.endTime}`);
  parts.push(`${isQuali16 ? "dimanche " : ""}vers ${schedules.maindraw.endTime}`);
  timingSummary.textContent = `Fin prévue : ${parts.join(" · ")}.`;
}

function renderTimingForm() {
  timingSection.hidden = currentFormat === null;
  if (currentFormat === null) return;
  timingInputs.show_timing.checked = Boolean(tournamentSettings.show_timing);
  timingInputs.saturday_start.value = toTimeInputValue(tournamentSettings.saturday_start);
  timingInputs.sunday_start.value = toTimeInputValue(tournamentSettings.sunday_start);
  ["duration_1x21", "duration_2x15", "duration_2x21"].forEach((key) => {
    timingInputs[key].value = tournamentSettings[key];
  });
  updateTimingPreview();
}

Object.values(timingInputs).forEach((input) => input.addEventListener("input", updateTimingPreview));

timingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = readTimingForm();

  const { error } = await supabaseClient.from("tournament_formats").update(values).eq("id", 1);

  if (error) {
    const missingColumns = /column/i.test(error.message);
    timingMessage.textContent =
      "Erreur : " + error.message + (missingColumns ? " — la requête SQL des horaires a-t-elle été lancée dans Supabase ?" : "");
    timingMessage.style.color = "var(--color-coral)";
    return;
  }

  tournamentSettings = { ...tournamentSettings, ...values };
  timingMessage.textContent = "Horaires enregistrés.";
  timingMessage.style.color = "var(--color-ocean-dark)";
});

const accountsList = document.getElementById("accounts-list");

// Liste unique de tous les comptes (avec ou sans rôle) avec, pour chacun, le
// contrôle pour attribuer/changer son rôle directement. Un compte déjà admin
// est affiché comme un badge fixe : impossible de le rétrograder depuis cette
// interface, sauf pour le compte Propriétaire (voir fetchOwnerEmail), qui peut aussi
// tout supprimer.
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

  const ownerEmail = await fetchOwnerEmail();
  const isSuperAdmin = Boolean(ownerEmail) && currentUserEmail === ownerEmail;

  // Le compte principal reste toujours tout en haut et toujours admin, sans
  // bouton pour le changer (même pour lui-même) — assign_role le refuse aussi
  // côté serveur, donc ce n'est pas seulement caché à l'affichage.
  const sortedAccounts = [...data].sort((a, b) => {
    if (a.email === ownerEmail) return -1;
    if (b.email === ownerEmail) return 1;
    return a.email.localeCompare(b.email);
  });

  accountsList.innerHTML = "";
  sortedAccounts.forEach((account) => {
    const row = document.createElement("div");
    row.className = "team-row";

    const emailSpan = document.createElement("span");
    emailSpan.textContent = account.email;
    row.appendChild(emailSpan);

    const isLockedAdmin = account.email === ownerEmail || (account.role === "admin" && !isSuperAdmin);

    if (isLockedAdmin) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = account.email === ownerEmail ? "Propriétaire" : "Admin";
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

  const [
    { data: pools, error: poolsError },
    { data: teams, error: teamsError },
    { data: matches, error: matchesError },
    { data: bracketMatches, error: bracketError },
    { data: qualifMatches, error: qualifError },
  ] = await Promise.all([
    supabaseClient.from("pools").select("*").order("label"),
    supabaseClient
      .from("teams")
      .select("*")
      .order("seed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabaseClient.from("matches").select("*, sets(*)").eq("phase", "poule").order("id", { ascending: true }),
    supabaseClient.from("matches").select("*, sets(*)").in("phase", PHASES_MAINDRAW_BRACKET).order("slot"),
    supabaseClient.from("matches").select("*, sets(*)").in("phase", PHASES_QUALIF),
  ]);

  if (poolsError || teamsError || matchesError || bracketError || qualifError) {
    poolsList.textContent = "Erreur de chargement des données.";
    return;
  }

  allTeams = teams;
  categoriesWithMatches = new Set(
    [...pools, ...matches, ...bracketMatches, ...qualifMatches].map((row) => row.category)
  );
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
    .in("phase", PHASES_MAINDRAW_BRACKET);
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
    .in("phase", PHASES_QUALIF);
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

// Supprimer une équipe remet à zéro les poules/matchs/scores de sa catégorie (voir
// resetPools) : on le dit clairement dans la confirmation quand il y a quelque chose à perdre.
let categoriesWithMatches = new Set();

function resetWarning(category) {
  return categoriesWithMatches.has(category)
    ? `\n\n⚠️ Les poules, matchs et scores ${category} déjà générés seront effacés (il faudra les régénérer).`
    : "";
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
      const confirmed = confirm(
        `Supprimer l'équipe "${team.name}" ?${resetWarning(team.category)} Cette action est irréversible.`
      );
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

  const affectedCategories = new Set(
    allTeams.filter((team) => selectedTeamIds.has(team.id)).map((team) => team.category)
  );
  const warnings = [...affectedCategories].map(resetWarning).join("");
  const confirmed = confirm(
    `Supprimer les ${selectedTeamIds.size} équipes sélectionnées ?${warnings} Cette action est irréversible.`
  );
  if (!confirmed) return;
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
      const dragged = seedingList.querySelector(".dragging");
      if (!dragged) return;
      const fromIndex = Number(dragged.dataset.index);
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

  // "Tranché" et pas juste "a un score" : un match en 2 sets gagnants avec un seul
  // set saisi n'a pas encore de vainqueur.
  if (!pouleMatches || pouleMatches.length !== 16 || pouleMatches.some((m) => !matchResult(m))) {
    alert("Tous les matchs des poules de qualification (tour 1 et tour 2) doivent être terminés.");
    return;
  }

  const bySlot = new Map(pouleMatches.map((m) => [m.slot, m]));
  const standings = {};
  ["A", "B", "C", "D"].forEach((letter) => {
    standings[letter] = computeBresilienneStandings(letter, bySlot);
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

  // Croisements : QUALIF_BARRAGE_ENTRANTS (js/tournoi-commun.js).
  const rows = Object.entries(QUALIF_BARRAGE_ENTRANTS).map(([slot, entrants]) => ({
    phase: Number(slot.slice(2)) <= 4 ? "qualif_barrage1" : "qualif_barrage2",
    slot,
    category: currentCategory,
    team1_id: entrants[0] ? standings[entrants[0].pool][entrants[0].rank - 1] : null,
    team2_id: entrants[1] ? standings[entrants[1].pool][entrants[1].rank - 1] : null,
    status: "a_venir",
  }));

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

  if (!barrage2Matches || barrage2Matches.length !== 4 || barrage2Matches.some((m) => !matchResult(m))) {
    alert("Les 4 barrages de qualification (2e tour) doivent tous être terminés.");
    return;
  }

  const qualifierIds = barrage2Matches.map((match) => matchResult(match).winnerId);

  const { data: qualifierTeams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .in("id", qualifierIds);
  if (teamsError) {
    alert("Erreur : " + teamsError.message);
    return;
  }

  const directTeams = seedTeams.slice(0, 8);
  const maindrawTeams = [...directTeams, ...qualifierTeams].sort(compareByPoints);

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

// La propagation des vainqueurs (BRACKET_PROGRESSION) et requiredSetWins sont
// définis dans js/tournoi-commun.js.

// Points à atteindre pour gagner un set donné, selon la phase (règles du tournoi,
// voir section 8 du GUIDE.md) : poule = 21 ; barrage = 15 (tie-break 11) ;
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

// Les équipes qu'un match a fait avancer au tour suivant (BRACKET_PROGRESSION) ne
// peuvent être retirées/remplacées que si ce match suivant n'a pas encore été joué.
// Sinon on bloque : il faut d'abord effacer le score du match suivant, en remontant
// le tableau pas à pas. Retourne true si on peut y toucher.
async function canChangePropagation(match) {
  const progression = BRACKET_PROGRESSION[match.slot];
  if (!progression) return true;
  const nextSlots = [progression.winner, progression.loser].filter(Boolean).map((p) => p.nextSlot);

  const { data: nextMatches, error } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", match.category)
    .in("slot", nextSlots);
  if (error) {
    alert("Erreur : " + error.message);
    return false;
  }
  if ((nextMatches || []).some((m) => m.sets && m.sets.length > 0)) {
    alert(
      "Impossible : le match suivant a déjà été joué avec l'équipe issue de ce match. Efface d'abord son score à lui."
    );
    return false;
  }
  return true;
}

// Place le vainqueur (et pour les demies/poules de qualif, le perdant) dans le match
// suivant — ou vide ces places si `result` est null. Le filtre par catégorie est
// essentiel : un "qf-1" Hommes et un "qf-1" Femmes ont le même slot.
async function applyPropagation(match, result) {
  const progression = BRACKET_PROGRESSION[match.slot];
  if (!progression) return;
  for (const outcome of ["winner", "loser"]) {
    const target = progression[outcome];
    if (!target) continue;
    const teamId = result ? (outcome === "winner" ? result.winnerId : result.loserId) : null;
    await supabaseClient
      .from("matches")
      .update({ [target.position]: teamId })
      .eq("slot", target.nextSlot)
      .eq("category", match.category);
  }
}

function forgetDrafts(match) {
  [1, 2, 3].forEach((setNumber) => draftScores.delete(`${match.id}-${setNumber}`));
}

// Vide le score d'un match (tous les champs effacés puis "Enregistrer") : supprime
// ses sets, le remet "a_venir", et défait l'éventuelle propagation au tour suivant.
// Retourne false si l'action a été bloquée.
async function clearMatchSets(match) {
  if (matchResult(match) && !(await canChangePropagation(match))) return false;

  await supabaseClient.from("sets").delete().eq("match_id", match.id);
  await supabaseClient.from("matches").update({ status: "a_venir" }).eq("id", match.id);
  if (matchResult(match)) await applyPropagation(match, null);

  forgetDrafts(match);
  loadAdminData();
  return true;
}

// Enregistre les sets saisis. Les sets enregistrés auparavant mais plus saisis
// (ex: un tie-break devenu inutile après correction d'un score en 2-0) sont
// supprimés. Le statut du match et la propagation au tour suivant suivent le
// nouveau résultat : si le vainqueur change (ou si le match n'est plus tranché),
// l'ancienne propagation est défaite — bloqué si le match suivant a déjà été joué.
// Retourne false si l'action a été bloquée.
async function saveMatchSets(match, enteredSets) {
  const previous = matchResult(match);
  const next = matchResult({
    ...match,
    sets: enteredSets.map(({ setNumber, score1, score2 }) => ({
      set_number: setNumber,
      score_team1: score1,
      score_team2: score2,
    })),
  });
  const resultChanged =
    Boolean(previous) !== Boolean(next) || (previous && next && previous.winnerId !== next.winnerId);

  if (previous && resultChanged && !(await canChangePropagation(match))) return false;

  const enteredNumbers = new Set(enteredSets.map((s) => s.setNumber));
  const staleSetIds = (match.sets || []).filter((s) => !enteredNumbers.has(s.set_number)).map((s) => s.id);
  if (staleSetIds.length > 0) {
    await supabaseClient.from("sets").delete().in("id", staleSetIds);
  }

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
  }

  await supabaseClient
    .from("matches")
    .update({ status: next ? "termine" : "a_venir" })
    .eq("id", match.id);

  if (resultChanged) await applyPropagation(match, next);

  forgetDrafts(match);
  loadAdminData();
  return true;
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
// Tant que les deux équipes ne sont pas connues (tour précédent pas encore joué), pas
// de formulaire de score, et l'équipe manquante est décrite par son croisement
// ("Vainqueur Barrage 2", "Vainqueur du Barrage 1" pour les barrages de qualif).
// `options.label` ajoute une étiquette devant le match (ex: "Barrage 3"), utile quand
// il faut pouvoir citer un match précis par son numéro (barrages de qualif).
function adminSlotPlaceholder(slot, index) {
  if (!slot) return "À déterminer";
  if (slot.startsWith("qb")) {
    return slotPlaceholder(slot, index, { sourceLabel: (source) => `du Barrage ${source.slice(2)}` });
  }
  return slotPlaceholder(slot, index);
}

function createMatchRow(match, teamsById, options = {}) {
  const { label } = options;
  const bothTeamsKnown = Boolean(match.team1_id && match.team2_id);
  const isMultiSet = match.phase !== "poule";
  const setsByNumber = new Map((match.sets || []).map((s) => [s.set_number, s]));
  const setInputs = [];
  const team1Label = match.team1_id ? teamLabel(match.team1_id, teamsById) : adminSlotPlaceholder(match.slot, 0);
  const team2Label = match.team2_id ? teamLabel(match.team2_id, teamsById) : adminSlotPlaceholder(match.slot, 1);

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
    setInputs.push({ setNumber: 1, ...pair });
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

    setInputs.push({ setNumber: 1, ...pair1 });
    setInputs.push({ setNumber: 2, ...pair2 });
    setInputs.push({ setNumber: 3, ...pair3 });

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
    saveButton.addEventListener("click", async () => {
      // Désactivé dès le clic : sans ça, un double-clic (ou un clic avant la fin du
      // rechargement précédent) relance saveMatchSets avec le même match.sets périmé,
      // qui ne voit pas encore le set tout juste créé et en RE-insère un en double au
      // lieu de le mettre à jour. Le bouton est remplacé à chaque loadAdminData() ;
      // on ne le réactive à la main que si l'action a été bloquée.
      if (saveButton.disabled) return;

      // Le tie-break caché (sets à 2-0) est ignoré, même s'il contient encore une
      // ancienne valeur : sinon il serait ré-enregistré comme un 3e set fantôme.
      const visibleInputs = setInputs.filter(({ wrapper }) => !wrapper.hidden);

      // Tous les champs vidés sur un match qui avait déjà un score : au lieu de
      // bloquer avec "entrer un score valide", on efface le score existant.
      const allEmpty = visibleInputs.every(({ input1, input2 }) => input1.value === "" && input2.value === "");
      let action;
      if (allEmpty && match.sets && match.sets.length > 0) {
        action = () => clearMatchSets(match);
      } else {
        const enteredSets = collectEnteredSets(visibleInputs, match.phase);
        if (!enteredSets) return;
        action = () => saveMatchSets(match, enteredSets);
      }

      saveButton.disabled = true;
      const done = await action();
      if (!done) saveButton.disabled = false;
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

  const pouleMissingScore = pouleMatches.length !== 16 || pouleMatches.some((m) => !matchResult(m));
  generateQualifBarragesButton.hidden = pouleMissingScore;

  qualifBarragesList.innerHTML = "";
  const barrageBySlot = new Map([...barrage1Matches, ...barrage2Matches].map((m) => [m.slot, m]));
  const barrageSlots = ["qb1", "qb2", "qb3", "qb4", "qb5", "qb6", "qb7", "qb8"];
  const allBarrages = barrageSlots.map((slot) => barrageBySlot.get(slot)).filter(Boolean);
  if (allBarrages.length > 0) {
    const { group, content } = createCollapsibleGroup("Barrages de qualification", `qualif-barrages-${currentCategory}`);
    allBarrages.forEach((match) => {
      content.appendChild(
        createMatchRow(match, teamsById, { label: `Barrage ${match.slot.slice(2)}` })
      );
    });
    qualifBarragesList.appendChild(group);
  }

  const barrage2MissingScore = barrage2Matches.length !== 4 || barrage2Matches.some((m) => !matchResult(m));
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

// Classement de poule (computePoolStandings) : js/tournoi-commun.js, le même que
// celui affiché sur la page publique.

generateBracketButton.addEventListener("click", async () => {
  try {
    const { data: pools, error: poolsError } = await supabaseClient
      .from("pools")
      .select("*")
      .eq("category", currentCategory)
      .order("label");
    if (poolsError) throw poolsError;

    // Trié comme partout ailleurs : defaultSeedOrder en a besoin pour que le rang de
    // tête de série (dernier critère de départage) soit le même que côté public.
    const { data: teams, error: teamsError } = await supabaseClient
      .from("teams")
      .select("*")
      .eq("category", currentCategory)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
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

    const missingScore = poolMatches.some((match) => !matchResult(match));
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
      const teamsInPool = teams.filter((team) => team.pool_id === pool.id);
      standings[pool.label] = computePoolStandings(pool, teamsInPool, poolMatches, seedRankByTeamId).map((row) => row.team);
    });

    for (const label of ["Poule A", "Poule B", "Poule C", "Poule D"]) {
      if (!standings[label] || standings[label].length < 3) {
        alert(`Erreur : la poule "${label}" n'a pas 3 équipes classées. Vérifie les poules et les matchs de poule.`);
        return;
      }
    }

    const { error: deleteError } = await supabaseClient
      .from("matches")
      .delete()
      .eq("category", currentCategory)
      .in("phase", PHASES_MAINDRAW_BRACKET);
    if (deleteError) throw deleteError;

    // Croisements : MAINDRAW_BRACKET_ENTRANTS (js/tournoi-commun.js).
    const teamIdFor = (entrant) => (entrant ? standings[`Poule ${entrant.pool}`][entrant.rank - 1].id : null);
    const rows = Object.entries(MAINDRAW_BRACKET_ENTRANTS).map(([slot, entrants]) => ({
      phase: MAINDRAW_BRACKET_PHASES[slot],
      slot,
      category: currentCategory,
      team1_id: teamIdFor(entrants[0]),
      team2_id: teamIdFor(entrants[1]),
      status: "a_venir",
    }));

    const { error: insertError } = await supabaseClient.from("matches").insert(rows);
    if (insertError) throw insertError;

    loadAdminData();
  } catch (error) {
    alert("Erreur lors de la génération du tableau : " + error.message);
  }
});

function renderBracketTab(pools, teams, poolMatches, bracketMatches) {
  bracketList.innerHTML = "";

  const poolMatchesMissingScore = pools.length === 4 && poolMatches.some((match) => !matchResult(match));

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
