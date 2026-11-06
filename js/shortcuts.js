
/* ===== Extracted from original script.js, lines 5008-5157 ===== */
/* =====================================================
   ORDRE DES ÉLÉMENTS
===================================================== */

function bringSelectedObjectForward() {

    const object =
        canvas.getActiveObject();

    if (!object) {
        return;
    }


    const objects =
        canvas.getObjects();

    const index =
        objects.indexOf(object);


    /*
       Déjà tout devant.
    */
    if (
        index < 0 ||
        index >= objects.length - 1
    ) {
        return;
    }


    /*
       Monter d'un niveau.
    */
    canvas.bringObjectForward(
        object
    );


    canvas.renderAll();

    saveHistory();
}


function sendSelectedObjectBackward() {

    const object =
        canvas.getActiveObject();

    if (!object) {
        return;
    }


    const objects =
        canvas.getObjects();

    const index =
        objects.indexOf(object);


    /*
       Déjà tout derrière.
    */
    if (
        index <= 0
    ) {
        return;
    }


    /*
       Descendre d'un niveau.
    */
    canvas.sendObjectBackwards(
        object
    );


    canvas.renderAll();

    saveHistory();
}    

/* =====================================================
   MENUS FILE / EDIT
===================================================== */

document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "open-image") imageInput.click();
        if (action === "copy-png") document.getElementById("copyPngButton").click();
        if (action === "save-png") document.getElementById("downloadPngButton").click();
        if (action === "clear-panel") document.getElementById("clearButton").click();
        document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
    });
});

document.addEventListener("click", event => {
    if (!event.target.closest(".toolbar-menu")) {
        document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
    }
});

/* =====================================================
   BOUTONS OUTILS
===================================================== */

document
    .querySelectorAll(
        "[data-tool]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                setTool(
                    button.dataset.tool
                );
                document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
            }
        );
    });


document
    .getElementById(
        "undoButton"
    )
    .addEventListener(
        "click",
        undo
    );


document
    .getElementById(
        "redoButton"
    )
    .addEventListener(
        "click",
        redo
    );



/* ===== Extracted from original script.js, lines 5158-5386 ===== */
/* =====================================================
   CLAVIER
===================================================== */

document.addEventListener("keydown", event => {

    /* =================================================
       UNDO
    ================================================= */

    if (
        event.ctrlKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "z"
    ) {

        event.preventDefault();

        if (
            editingText &&
            editingText.isEditing
        ) {

            editingText.exitEditing();

            requestAnimationFrame(() => {
                undo();
            });

        } else {

            undo();
        }

        return;
    }


    /* =================================================
       REDO
    ================================================= */

    if (
        (
            event.ctrlKey &&
            event.key.toLowerCase() === "y"
        )
        ||
        (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "z"
        )
    ) {

        event.preventDefault();

        if (
            editingText &&
            editingText.isEditing
        ) {

            editingText.exitEditing();

            requestAnimationFrame(() => {
                redo();
            });

        } else {

            redo();
        }

        return;
    }


    /* =================================================
       NE PAS INTERCEPTER LES CHAMPS HTML
    ================================================= */

    const target = event.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
    ) {
        return;
    }


    /* =================================================
       RACCOURCIS FUZE
    ================================================= */

    const key = event.key.toLowerCase();

    // Actions de fichier : raccourcis choisis pour éviter les commandes Chrome.
    if (event.ctrlKey && !event.shiftKey && !event.altKey && key === "o") {
        event.preventDefault();
        imageInput.click();
        return;
    }

    if (event.ctrlKey && !event.shiftKey && !event.altKey && key === "s") {
        event.preventDefault();
        document.getElementById("downloadPngButton").click();
        return;
    }

    if (event.ctrlKey && event.altKey && !event.shiftKey && key === "c") {
        event.preventDefault();
        document.getElementById("copyPngButton").click();
        return;
    }

    if (event.ctrlKey && event.altKey && !event.shiftKey && key === "backspace") {
        event.preventDefault();
        document.getElementById("clearButton").click();
        return;
    }

    // Sélection rapide des outils : uniquement sans modificateur.
    if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        const toolByKey = {
            s: "select",
            t: "text",
            a: "arrow",
            r: "rectangle",
            c: "circle",
            f: "felt",
            h: "highlight",
            b: "blur"
        };
        if (toolByKey[key]) {
            event.preventDefault();
            setTool(toolByKey[key]);
            document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
            return;
        }
    }

    /* =================================================
       SUPPRESSION
    ================================================= */

    if (
        event.key === "Delete" ||
        event.key === "Backspace"
    ) {

        const activeObject =
            canvas.getActiveObject();

        if (activeObject) {

            canvas.remove(activeObject);
            canvas.discardActiveObject();

            canvas.requestRenderAll();

            saveHistory();

            updateEmptyMessage();
        }

        return;
    }
});

document.addEventListener(
    "keydown",
    event => {

        /*
           Ne pas intercepter les flèches lorsqu'on
           écrit dans un champ texte.
        */

        const target =
            event.target;

        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target.isContentEditable
        ) {
            return;
        }


        /*
           Flèche du haut :
           monter l'objet d'un niveau.
        */

        if (
            event.key === "ArrowUp"
        ) {

            event.preventDefault();

            bringSelectedObjectForward();

            return;
        }


        /*
           Flèche du bas :
           descendre l'objet d'un niveau.
        */

        if (
            event.key === "ArrowDown"
        ) {

            event.preventDefault();

            sendSelectedObjectBackward();

            return;
        }

    }
);

