const archivesInfo = document.getElementById("archives-info");
const archivesList = document.getElementById("archives-list");

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

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

    archivesList.appendChild(section);
  });
}

loadArchives();
