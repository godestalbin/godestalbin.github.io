
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

    // Ouvrir / enregistrer un document Fuze.
    if (event.ctrlKey && event.shiftKey && !event.altKey && key === "o") {
        event.preventDefault();
        chooseFuzeFile();
        return;
    }

    if (event.ctrlKey && event.shiftKey && !event.altKey && key === "s") {
        event.preventDefault();
        saveFuzeFile();
        return;
    }

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

    // Flèche simple : Shift+A.
    if (!event.ctrlKey && !event.altKey && !event.metaKey && event.shiftKey && key === "a") {
        event.preventDefault();
        setTool("simpleArrow");
        document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
        return;
    }

    // Sélection rapide des outils : uniquement sans modificateur.
    if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        const toolByKey = {
            s: "select",
            t: "text",
            n: "number",
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

// Masquer temporairement les poignées pendant le déplacement clavier.
// Le délai est réinitialisé à chaque répétition de touche : les poignées
// ne réapparaissent qu'une fois le déplacement terminé.
let arrowHandlesRestoreTimer = null;
const ARROW_HANDLES_RESTORE_DELAY = 400;

function temporarilyHideArrowHandlesForKeyboardMove() {
    const activeObject = canvas.getActiveObject();

    if (
        !activeObject ||
        (activeObject.arrowType !== "simple" && activeObject.arrowType !== "fancy") ||
        editingArrow !== activeObject
    ) {
        return;
    }

    if (arrowHandlesRestoreTimer !== null) {
        clearTimeout(arrowHandlesRestoreTimer);
        arrowHandlesRestoreTimer = null;
    }

    hideArrowHandles();

    const arrow = activeObject;
    arrowHandlesRestoreTimer = setTimeout(() => {
        arrowHandlesRestoreTimer = null;

        // Ne réafficher les poignées que si cette même flèche est toujours
        // sélectionnée et en cours d'édition.
        if (canvas.getActiveObject() === arrow && editingArrow === arrow) {
            showArrowHandles(arrow);
        }
    }, ARROW_HANDLES_RESTORE_DELAY);
}


function moveSelectedObjectsByKeyboard(dx, dy) {

    const selection = getSelectedObjectAndBorder();

    if (!selection || !selection.objects.length) {
        return false;
    }

    // Déplacer ensemble l'image et sa bordure éventuelle.
    // Pour une sélection multiple Fabric.js, l'objet actif est
    // l'ActiveSelection : modifier sa position déplace tous ses objets.
    selection.objects.forEach(object => {
        const previousLeft = object.left || 0;
        const previousTop = object.top || 0;

        object.set({
            left: previousLeft + dx,
            top: previousTop + dy
        });
        object.setCoords();

        // Le déplacement clavier ne déclenche pas les événements Fabric
        // object:moving. Les flèches utilisent cet événement pour mettre à
        // jour leurs coordonnées et repositionner leurs poignées.
        if (object.arrowType === "simple" || object.arrowType === "fancy") {
            object.__previousLeft = previousLeft;
            object.__previousTop = previousTop;

            canvas.fire("object:moving", { target: object });

            delete object.__previousLeft;
            delete object.__previousTop;
        }
    });

    canvas.requestRenderAll();
    saveHistory();

    return true;
}


document.addEventListener("keydown", event => {

    const target = event.target;

    // Ne pas intercepter les flèches dans les champs ou pendant
    // l'édition directe d'un texte Fabric.js.
    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
        (editingText && editingText.isEditing)
    ) {
        return;
    }

    // Ctrl + flèche : modifier le z-index.
    if (
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
        if (!canvas.getActiveObject()) {
            return;
        }

        event.preventDefault();

        if (event.key === "ArrowUp") {
            bringSelectedObjectForward();
        } else {
            sendSelectedObjectBackward();
        }

        return;
    }

    // Flèches seules : déplacement précis d'un pixel.
    if (
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey
    ) {
        const movements = {
            ArrowUp: [0, -1],
            ArrowRight: [1, 0],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0]
        };

        const movement = movements[event.key];

        if (!movement || !canvas.getActiveObject()) {
            return;
        }

        event.preventDefault();
        temporarilyHideArrowHandlesForKeyboardMove();
        moveSelectedObjectsByKeyboard(movement[0], movement[1]);
    }
});
