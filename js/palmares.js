const archivesInfo = document.getElementById("archives-info");
const archivesList = document.getElementById("archives-list");

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Seul le compte principal (voir SUPER_ADMIN_EMAIL dans gestion.js) peut supprimer
// un tournoi du Palmarès — un tournoi archivé n'a normalement pas vocation à être
// retiré, ce bouton n'est là que pour rattraper une erreur de sauvegarde. Vérifié
// aussi côté serveur dans delete_tournament_archive : ceci n'est qu'un affichage.
const SUPER_ADMIN_EMAIL = "gabriel.cohen.1997@gmail.com";
let isOwner = false;

async function loadArchives() {
  const { data: archives, error } = await supabaseClient
    .from("tournament_archives")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    archivesInfo.textContent = "Erreur de chargement du palmarès.";
    return;
  }

  if (archives.length === 0) {
    archivesInfo.textContent = "Aucun tournoi sauvegardé pour l'instant.";
    archivesList.innerHTML = "";
    return;
  }

  archivesInfo.textContent = "";
  renderArchives(archives);
}

async function deleteArchive(archive) {
  const confirmed = confirm(
    `Supprimer "${archive.name} — ${MOIS[archive.month - 1]} ${archive.year}" du Palmarès ? Action irréversible.`
  );
  if (!confirmed) return;

  const { error } = await supabaseClient.rpc("delete_tournament_archive", {
    archive_id: archive.id,
  });

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  loadArchives();
}

// Même pattern que js/ordre-des-matchs.js / js/poules.js : un bouton-titre repliable
// + son contenu (replié par défaut).
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

function createNote(text) {
  const note = document.createElement("p");
  note.className = "form-message";
  note.textContent = text;
  return note;
}

function renderArchives(archives) {
  archivesList.innerHTML = "";

  archives.forEach((archive) => {
    const title = `${archive.name} — ${MOIS[archive.month - 1]} ${archive.year}`;
    const { section, content } = createCollapsibleSection(title);

    const categoryToggle = document.createElement("div");
    categoryToggle.className = "category-toggle";

    const bracketContainer = document.createElement("div");

    let selectedCategory = "Hommes";

    function renderSelectedCategory() {
      const categoryData = archive.data && archive.data.categories && archive.data.categories[selectedCategory];
      bracketContainer.innerHTML = "";
      if (!categoryData || !categoryData.matches || categoryData.matches.length === 0) {
        bracketContainer.appendChild(createNote("Pas de données pour cette catégorie."));
        return;
      }
      renderBracket(bracketContainer, categoryData.teams, categoryData.matches);
    }

    ["Hommes", "Femmes"].forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-button" + (category === selectedCategory ? " active" : "");
      button.textContent = category;
      button.addEventListener("click", () => {
        selectedCategory = category;
        categoryToggle.querySelectorAll(".category-button").forEach((b) => {
          b.classList.toggle("active", b.textContent === category);
        });
        renderSelectedCategory();
      });
      categoryToggle.appendChild(button);
    });

    content.appendChild(categoryToggle);
    content.appendChild(bracketContainer);
    renderSelectedCategory();

    if (isOwner) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "button button-sm button-danger";
      deleteButton.textContent = "Supprimer ce tournoi";
      deleteButton.addEventListener("click", () => deleteArchive(archive));
      content.appendChild(deleteButton);
    }

    archivesList.appendChild(section);
  });
}

// Page publique (pas de garde de session comme gestion.html) : on lit juste la
// session courante, si elle existe, pour savoir s'il faut afficher le bouton
// "Supprimer" réservé au compte principal.
supabaseClient.auth.onAuthStateChange((_event, session) => {
  isOwner = Boolean(session && session.user.email === SUPER_ADMIN_EMAIL);
  loadArchives();
});
