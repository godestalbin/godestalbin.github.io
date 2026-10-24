
/* ===== Extracted from original script.js, lines 5008-5157 ===== */
/* =====================================================
   ORDRE DES ÉLÉMENTS
===================================================== */


function getSelectedObjectAndBorder() {
    const object = canvas.getActiveObject();

    if (!object) {
        return null;
    }

    const objects = canvas.getObjects();

    // Si la bordure est sélectionnée, retrouver son image.
    let image = object;

    if (object.fuzeBorderOwnerId) {
        image = objects.find(
            obj => obj.fuzeBorderId === object.fuzeBorderOwnerId
        );

        if (!image) {
            return { objects: [object] };
        }
    }

    // Retrouver la bordure associée à l'image.
    const border = image.fuzeBorderId
        ? objects.find(
            obj => obj.fuzeBorderOwnerId === image.fuzeBorderId
        )
        : null;

    return {
        objects: border ? [image, border] : [object]
    };
}



function getSelectedObjectsForZOrder() {
    const selected = canvas.getActiveObject();

    if (!selected) {
        return null;
    }

    const objects = canvas.getObjects();

    // Si la bordure est sélectionnée, retrouver son image.
    let image = selected;

    if (selected.fuzeBorderOwnerId) {
        image = objects.find(
            obj => obj.fuzeBorderId === selected.fuzeBorderOwnerId
        );

        if (!image) {
            return [selected];
        }
    }

    // Retrouver la bordure de l'image.
    const border = image.fuzeBorderId
        ? objects.find(
            obj => obj.fuzeBorderOwnerId === image.fuzeBorderId
        )
        : null;

    // L'image doit rester juste en dessous de sa bordure.
    return border ? [image, border] : [selected];
}



function moveSelectedObjectsInZOrder(direction) {
    const selectedGroup = getSelectedObjectsForZOrder();

    if (!selectedGroup) {
        return;
    }

    const objects = canvas.getObjects();

    function getFrameGroup(object) {
        let image = object;

        // Si l'objet est la bordure, retrouver son image.
        if (object.fuzeBorderOwnerId) {
            image = objects.find(
                obj => obj.fuzeBorderId === object.fuzeBorderOwnerId
            );

            if (!image) {
                return [object];
            }
        }

        // Retrouver la bordure de l'image.
        const border = image.fuzeBorderId
            ? objects.find(
                obj => obj.fuzeBorderOwnerId === image.fuzeBorderId
            )
            : null;

        return (border ? [image, border] : [image]).sort(
            (a, b) => objects.indexOf(a) - objects.indexOf(b)
        );
    }

    const group = [...new Set(selectedGroup)].sort(
        (a, b) => objects.indexOf(a) - objects.indexOf(b)
    );

    if (group.some(obj => !objects.includes(obj))) {
        return;
    }

    const firstIndex = Math.min(
        ...group.map(obj => objects.indexOf(obj))
    );

    const lastIndex = Math.max(
        ...group.map(obj => objects.indexOf(obj))
    );

    // Trouver le cadre immédiatement voisin.
    const neighborIndex = direction === "up"
        ? lastIndex + 1
        : firstIndex - 1;

    if (neighborIndex < 0 || neighborIndex >= objects.length) {
        return;
    }

    const neighborGroup = getFrameGroup(objects[neighborIndex]);

    // Ne pas déplacer un groupe par rapport à lui-même.
    if (neighborGroup.some(obj => group.includes(obj))) {
        return;
    }

    // Retirer les deux groupes de la pile.
    const movingObjects = new Set([...group, ...neighborGroup]);

    const remaining = objects.filter(
        obj => !movingObjects.has(obj)
    );

    // Calculer la position de réinsertion.
    const allIndices = [...group, ...neighborGroup].map(
        obj => objects.indexOf(obj)
    );

    const insertIndex = objects
        .slice(0, Math.min(...allIndices))
        .filter(obj => !movingObjects.has(obj))
        .length;

    // Les groupes sont échangés en une seule pression.
    const newOrder = direction === "up"
        ? [...neighborGroup, ...group]
        : [...group, ...neighborGroup];

    remaining.splice(insertIndex, 0, ...newOrder);

    newOrder.forEach((obj, index) => {
        canvas.moveObjectTo(obj, remaining.indexOf(obj));
    });

    canvas.requestRenderAll();
    saveHistory();
}



function bringSelectedObjectForward() {
    moveSelectedObjectsInZOrder("up");
}


function sendSelectedObjectBackward() {
    moveSelectedObjectsInZOrder("down");
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

    // Bordure : action sur l’image actuellement sélectionnée.
    if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && key === "o") {
        event.preventDefault();
        addBorderToSelectedImage();
        document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
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

