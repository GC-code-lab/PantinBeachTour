// Bascule entre les sous-onglets "Poule" / "Phases Finales" de la page Main Draw
// (fusion de ce qui était avant deux pages séparées, index.html et
// phases-finales.html) — ne touche à aucune logique de rendu, seulement à quel
// panneau est visible. Le tableau des phases finales a besoin d'un <main> sans
// limite de largeur (voir .bracket-wide dans css/style.css) : appliquée/retirée
// ici selon l'onglet actif, pour ne pas l'imposer en permanence au sous-onglet Poule.
const mainDrawTabButtons = document.querySelectorAll(".tab-button[data-subtab]");
const mainDrawTabPanels = {
  poule: document.getElementById("subtab-poule"),
  "phases-finales": document.getElementById("subtab-phases-finales"),
};
const mainDrawMain = document.querySelector("main.container");

mainDrawTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.subtab;
    mainDrawTabButtons.forEach((b) => b.classList.toggle("active", b === button));
    Object.entries(mainDrawTabPanels).forEach(([key, panel]) => {
      panel.hidden = key !== tab;
    });
    mainDrawMain.classList.toggle("bracket-wide", tab === "phases-finales");
  });
});
