
/* ===== Extracted from original script.js, lines 5459-5478 ===== */
/* =====================================================
   INITIALISATION
===================================================== */

canvas.backgroundColor =
    "grey";

// Les transformations natives de Fabric (déplacement, redimensionnement,
// rotation) doivent être enregistrées à leur validation. Les déplacements
// pilotés par Fuze conservent leur propre commit sur mouse:up. La déduplication
// dans saveHistory évite les doubles instantanés pour les objets composites.
canvas.on("object:modified", () => {
    if (!restoringHistory) saveHistory();
});

setZoom(1);

saveHistory();

updateEmptyMessage();

updateStatus(
    "Prêt"
);

updateUndoRedoButtons();

