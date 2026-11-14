
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
   COPIER / COLLER DES OBJETS
===================================================== */

let fuzeObjectClipboard = null;
let fuzePasteCount = 0;

function getClipboardSourceObjects() {
    const active = canvas.getActiveObject();
    if (!active) return [];

    const selected = active.type === "activeselection"
        ? active.getObjects()
        : [active];

    const objects = canvas.getObjects();
    const result = [...selected];

    // Une bordure d'image fait partie de l'objet copié.
    selected.forEach(object => {
        if (object.fuzeBorderId) {
            const border = objects.find(
                item => item.fuzeBorderOwnerId === object.fuzeBorderId
            );
            if (border && !result.includes(border)) result.push(border);
        }
    });

    return result.sort(
        (a, b) => objects.indexOf(a) - objects.indexOf(b)
    );
}

async function copySelectedObjects() {
    const selected = getClipboardSourceObjects();
    if (!selected.length) return;

    try {
        // ActiveSelection place temporairement ses objets dans le repère du
        // groupe. La désélection les remet dans le repère du canvas avant clone.
        const hadMultipleSelection = canvas.getActiveObject()?.type === "activeselection";
        if (hadMultipleSelection) canvas.discardActiveObject();

        try {
            // Les objets sont clonés en mémoire : le presse-papiers reste
            // indépendant des originaux et des collages ultérieurs.
            fuzeObjectClipboard = await Promise.all(
                selected.map(object => object.clone(SERIALIZED_PROPERTIES))
            );
        } finally {
            // Restaurer exactement la sélection source après la copie.
            if (hadMultipleSelection) {
                canvas.setActiveObject(new fabric.ActiveSelection(selected, { canvas }));
                canvas.requestRenderAll();
            }
        }
        fuzePasteCount = 0;
        updateStatus(selected.length > 1
            ? `${selected.length} objets copiés`
            : "Objet copié");
    } catch (error) {
        console.error("Erreur lors de la copie des objets :", error);
        updateStatus("Impossible de copier les objets");
    }
}

async function pasteCopiedObjects() {
    if (!fuzeObjectClipboard?.length) return;

    try {
        const pasted = await Promise.all(
            fuzeObjectClipboard.map(object =>
                object.clone(SERIALIZED_PROPERTIES)
            )
        );

        // Centrer la copie (ou la sélection complète) sous le pointeur.
        // Les coordonnées sont dans le repère du canvas : zoom et déplacement
        // de la vue sont donc pris en compte.
        const pastePoint = getCanvasPastePoint();
        pasted.forEach(object => object.setCoords());
        const bounds = pasted.map(object => object.getBoundingRect());
        const minLeft = Math.min(...bounds.map(rect => rect.left));
        const minTop = Math.min(...bounds.map(rect => rect.top));
        const maxRight = Math.max(...bounds.map(rect => rect.left + rect.width));
        const maxBottom = Math.max(...bounds.map(rect => rect.top + rect.height));
        const offsetX = pastePoint.x - (minLeft + maxRight) / 2;
        const offsetY = pastePoint.y - (minTop + maxBottom) / 2;

        // Recréer les identifiants des bordures pour éviter tout lien
        // avec les images originales ou les collages précédents.
        const borderIds = new Map();
        pasted.forEach(object => {
            if (object.fuzeBorderId) {
                borderIds.set(
                    object.fuzeBorderId,
                    `fuze-border-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
                );
            }
        });

        pasted.forEach(object => {
            object.set({
                left: (object.left || 0) + offsetX,
                top: (object.top || 0) + offsetY
            });

            // Les extrémités des flèches sont mémorisées dans le repère
            // du canvas (contrairement à arrowPointStart/End, locaux au Path).
            // Il faut donc les décaler elles aussi, sinon les handles des
            // flèches collées restent ancrés sur les coordonnées d'origine.
            ["x1", "y1", "x2", "y2"].forEach(property => {
                if (typeof object[property] === "number") {
                    object[property] += property === "x1" || property === "x2"
                        ? offsetX
                        : offsetY;
                }
            });

            if (object.fuzeBorderId && borderIds.has(object.fuzeBorderId)) {
                object.fuzeBorderId = borderIds.get(object.fuzeBorderId);
            }
            if (object.fuzeBorderOwnerId && borderIds.has(object.fuzeBorderOwnerId)) {
                object.fuzeBorderOwnerId = borderIds.get(object.fuzeBorderOwnerId);
            }
            object.setCoords();
            canvas.add(object);
        });

        canvas.discardActiveObject();

        if (pasted.length === 1) {
            canvas.setActiveObject(pasted[0]);
        } else {
            const selection = new fabric.ActiveSelection(pasted, { canvas });
            canvas.setActiveObject(selection);
        }

        fuzePasteCount++;
        canvas.requestRenderAll();
        saveHistory();
        updateEmptyMessage();
        updateStatus(pasted.length > 1
            ? `${pasted.length} objets collés`
            : "Objet collé");
    } catch (error) {
        console.error("Erreur lors du collage des objets :", error);
        updateStatus("Impossible de coller les objets");
    }
}

function deleteSelectedObjects() {
    const active = canvas.getActiveObject();
    if (!active) return false;

    const selected = active.type === "activeselection"
        ? [...active.getObjects()]
        : [active];

    const allObjects = canvas.getObjects();
    const toDelete = new Set(selected);

    // Supprimer également la bordure liée à une image sélectionnée.
    selected.forEach(object => {
        if (object.fuzeBorderId) {
            const border = allObjects.find(
                item => item.fuzeBorderOwnerId === object.fuzeBorderId
            );
            if (border) toDelete.add(border);
        }
        // Si seule la bordure est sélectionnée, supprimer aussi son image
        // pour conserver le comportement d'objet composé.
        if (object.fuzeBorderOwnerId) {
            const image = allObjects.find(
                item => item.fuzeBorderId === object.fuzeBorderOwnerId
            );
            if (image) toDelete.add(image);
        }
    });

    canvas.discardActiveObject();
    toDelete.forEach(object => canvas.remove(object));

    if (editingArrow && toDelete.has(editingArrow)) {
        editingArrow = null;
        hideArrowHandles();
    }

    canvas.requestRenderAll();
    saveHistory();
    updateEmptyMessage();
    updateUndoRedoButtons();
    return true;
}


/* =====================================================
   CLAVIER
===================================================== */

document.addEventListener("keydown", event => {

    // Échap revient au mode Select. Pendant l'édition d'un texte, il quitte
    // également l'édition Fabric.js avant de changer d'outil.
    if (event.key === "Escape") {
        const target = event.target;
        const isFormField =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target.isContentEditable;

        if (!isFormField || (editingText && editingText.isEditing)) {
            event.preventDefault();
            if (editingText && editingText.isEditing) {
                editingText.exitEditing();
            }
            setTool("select");
            return;
        }
    }

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

    // Ctrl+A : sélectionner tous les éléments présents sur le canvas.
    // Les poignées des flèches sont des éléments HTML et ne font donc pas
    // partie de canvas.getObjects(). On exclut seulement l'objet temporaire
    // utilisé pendant un dessin en cours.
    if (
        event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        key === "a"
    ) {
        if (editingText && editingText.isEditing) {
            return;
        }

        // Ctrl+A bascule également vers Select avant de créer la sélection.
        // setTool("select") réactive la sélection des objets sans effacer
        // l'ActiveSelection qui sera construite juste après.
        setTool("select");

        const objects = canvas.getObjects().filter(object =>
            object !== temporaryObject && object.visible !== false
        );

        event.preventDefault();

        if (!objects.length) {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            updateStatus("Aucun objet à sélectionner");
            return;
        }

        canvas.discardActiveObject();

        if (objects.length === 1) {
            canvas.setActiveObject(objects[0]);
        } else {
            canvas.setActiveObject(
                new fabric.ActiveSelection(objects, { canvas })
            );
        }

        canvas.requestRenderAll();
        updateStatus("Tous les objets sélectionnés");
        return;
    }

    // Copier / coller les objets sélectionnés (presse-papiers interne Fuze).
    if (event.ctrlKey && !event.altKey && !event.metaKey && key === "c") {
        if (!(editingText && editingText.isEditing) && canvas.getActiveObject()) {
            event.preventDefault();
            copySelectedObjects();
            return;
        }
    }

    if (event.ctrlKey && !event.altKey && !event.metaKey && key === "v") {
        if (!(editingText && editingText.isEditing) && fuzeObjectClipboard?.length) {
            event.preventDefault();
            pasteCopiedObjects();
            return;
        }
    }

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
        if (canvas.getActiveObject()) {
            event.preventDefault();
            deleteSelectedObjects();
        }
        return;
    }});

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
