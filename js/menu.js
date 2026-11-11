/* Un seul menu de la barre d'outils peut rester ouvert à la fois. */
document.querySelectorAll(".toolbar-menu").forEach(menu => {
    menu.addEventListener("toggle", () => {
        if (!menu.open) return;
        document.querySelectorAll(".toolbar-menu[open]").forEach(otherMenu => {
            if (otherMenu !== menu) otherMenu.open = false;
        });
    });
});
