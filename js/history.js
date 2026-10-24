
/* ===== Extracted from original script.js, lines 522-684 ===== */
/* =====================================================
   HISTORIQUE
===================================================== */

const SERIALIZED_PROPERTIES = [

    "arrowType",

    "x1",
    "y1",

    "x2",
    "y2",

    "arrowColor",
    "arrowStrokeWidth",
    "fuzeTool",
    "blurType",
    "blurRadius",
    "fuzeBorderId",
    "fuzeBorderOwnerId",

];


function serializeCanvas() {

    return JSON.stringify(
        canvas.toObject(
            SERIALIZED_PROPERTIES
        )
    );
}


function saveHistory() {

    if (restoringHistory) {
        return;
    }

    const state =
        serializeCanvas();

    if (
        historyIndex <
        history.length - 1
    ) {

        history =
            history.slice(
                0,
                historyIndex + 1
            );
    }

    history.push(state);

    historyIndex =
        history.length - 1;

    updateUndoRedoButtons();
}


function restoreHistoryState(
    state
) {

    editingText = null;
    editingTextChanged = false;
    restoringHistory = true;

    hideArrowHandles();

    canvas.loadFromJSON(state)
        .then(() => {

            restoringHistory = false;

            canvas.renderAll();

            updateEmptyMessage();
            updateUndoRedoButtons();

            const active =
                canvas.getActiveObject();

            if (
                active &&
                isFancyArrow(active)
            ) {

                editingArrow =
                    active;

                showArrowHandles(
                    active
                );

            } else {

                editingArrow = null;

                hideArrowHandles();
            }
        })
        .catch(error => {

            restoringHistory = false;

            console.error(
                "Erreur restauration historique :",
                error
            );
        });
}


function undo() {

    if (historyIndex <= 0) {
        return;
    }

    historyIndex--;

    restoreHistoryState(
        history[historyIndex]
    );
}


function redo() {

    if (
        historyIndex >=
        history.length - 1
    ) {
        return;
    }

    historyIndex++;

    restoreHistoryState(
        history[historyIndex]
    );
}


function updateUndoRedoButtons() {

    document.getElementById(
        "undoButton"
    ).disabled =
        historyIndex <= 0;

    document.getElementById(
        "redoButton"
    ).disabled =
        historyIndex >=
        history.length - 1;
}


