
/* ===== Extracted from original script.js, lines 269-352 ===== */
/* =====================================================
   PIPETTE — PRÉLÈVEMENT D'UN PIXEL DU CANVAS
===================================================== */

function activateEyedropper() {
    if (eyedropperActive) {
        cancelEyedropper();
        return;
    }

    eyedropperActive = true;
    eyedropperButton.classList.add("active");
    stage.classList.add("eyedropper-active");

    updateStatus(
        "Pipette active — cliquez sur un pixel du canvas (Échap pour annuler)"
    );
}

function cancelEyedropper() {
    eyedropperActive = false;
    eyedropperButton.classList.remove("active");
    stage.classList.remove("eyedropper-active");
}

function updateEyedropperCursor() {
    if (!canvas || !canvas.upperCanvasEl) {
        return;
    }

    canvas.upperCanvasEl.style.setProperty(
        "cursor",
        eyedropperActive
            ? 'url("./pipette.png") 4 4, cross'
            : ""
    );
}

function sampleCanvasColor(event) {

    // Les coordonnées CSS sont converties en coordonnées réelles
    // du canvas rendu, ce qui tient compte du zoom et du pixel ratio.
    const rect = canvas.lowerCanvasEl.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * canvas.lowerCanvasEl.width / rect.width);
    const y = Math.floor((event.clientY - rect.top) * canvas.lowerCanvasEl.height / rect.height);

    if (
        x < 0 || y < 0 ||
        x >= canvas.lowerCanvasEl.width ||
        y >= canvas.lowerCanvasEl.height
    ) {
        return null;
    }

    try {
        const context = canvas.lowerCanvasEl.getContext("2d", { willReadFrequently: true });
        const pixel = context.getImageData(x, y, 1, 1).data;
        const alpha = pixel[3] / 255;

        // Le canvas Fabric est transparent hors des objets : on compose
        // ce pixel sur le fond blanc du stage pour récupérer la couleur visible.
        const rgb = [0, 1, 2].map(index =>
            Math.round(pixel[index] * alpha + 255 * (1 - alpha))
        );

        return "#" + rgb.map(value => value.toString(16).padStart(2, "0")).join("").toUpperCase();
    } catch (error) {
        console.error("Impossible de lire le pixel du canvas :", error);
        updateStatus("Lecture du pixel impossible");
        return null;
    }
}


eyedropperButton.addEventListener("click", activateEyedropper);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && eyedropperActive) {
        cancelEyedropper();
        updateStatus("Pipette annulée");
    }
});



/* ===== Extracted from original script.js, lines 4102-4459 ===== */
/* =====================================================
   SYNCHRONISATION DES CONTRÔLES
===================================================== */

function syncControlsFromSelectedObject() {

    const object = canvas.getActiveObject();
    const selectedObjects = canvas.getActiveObjects();
    syncThicknessControl();

    if (!object) return;


    // Synchronise la transparence affichée avec l'objet sélectionné.
    // Pour une image avec bordure liée, la transparence correspond à la bordure.
    let opacityObject = selectedObjects.length > 1 ? selectedObjects[0] : object;
    if (opacityObject.type === "image" && opacityObject.fuzeBorderId) {
        const linkedBorder = canvas.getObjects().find(
            item => item.fuzeBorderOwnerId === opacityObject.fuzeBorderId
        );
        if (linkedBorder) opacityObject = linkedBorder;
    }
    const opacity = Number.isFinite(opacityObject.opacity) ? opacityObject.opacity : 1;
    strokeOpacityInput.value = String(Math.max(10, Math.min(100, Math.round(opacity * 100))));
    updateStrokeOpacityLabel();
    if (selectedObjects.length > 1) {
        const newWidth = getStrokeWidth();
        const newColor = getColor();
        const thicknessWasEdited = document.activeElement === strokeWidthInput;
        let changed = false;
        selectedObjects.forEach(item => {
            if (isFancyArrow(item)) {
                item.arrowColor = newColor;
                if (thicknessWasEdited) item.arrowStrokeWidth = newWidth;
                item.set({
                    stroke: newColor,
                    ...(thicknessWasEdited ? { strokeWidth: newWidth } : {})
                });
                changed = true;
            } else if (["rect", "ellipse", "path"].includes(item.type)) {
                item.set({
                    stroke: item.fuzeTool === "highlight" ? "rgba(255,210,30,0.85)" : newColor,
                    ...(thicknessWasEdited ? { strokeWidth: newWidth } : {}),
                    opacity: getStrokeOpacity()
                });
                changed = true;
            }
        });
        if (changed) {
            canvas.requestRenderAll();
            syncControlsFromSelectedObject();
            saveHistory();
            updateStatus("Épaisseur appliquée aux objets sélectionnés");
        }
        return;
    }

    /* -------------------------------------------------
       FLÈCHE
    ------------------------------------------------- */

    if (
        isFancyArrow(object)
    ) {

        if (object.arrowColor) {

            colorInput.value =
                object.arrowColor;
        }


        if (
            Number.isFinite(
                object.arrowStrokeWidth
            )
        ) {

            strokeWidthInput.value =
                object.arrowStrokeWidth;
        }


        return;
    }


    /* -------------------------------------------------
       IMAGE AVEC BORDURE ASSOCIÉE
    ------------------------------------------------- */

    if (object.type === "image" && object.fuzeBorderId) {
        const border = canvas.getObjects().find(item => item.fuzeBorderOwnerId === object.fuzeBorderId);
        if (border) {
            if (typeof border.stroke === "string" && /^#[0-9a-f]{3,8}$/i.test(border.stroke)) {
                colorInput.value = border.stroke;
            }
            if (Number.isFinite(Number(border.strokeWidth))) {
                strokeWidthInput.value = String(border.strokeWidth);
            }
        }
        return;
    }

    /* -------------------------------------------------
       TEXTE
    ------------------------------------------------- */

    if (
        object.type === "i-text"
    ) {

        if (
            typeof object.fill === "string" &&
            object.fill.startsWith("#")
        ) {

            colorInput.value =
                object.fill;
        }


        if (
            Number.isFinite(
                object.fontSize
            )
        ) {

            fontSizeInput.value =
                Math.round(
                    object.fontSize
                );
        }


        return;
    }


    /* -------------------------------------------------
       IMAGE AVEC BORDURE ASSOCIÉE
    ------------------------------------------------- */

    if (object.type === "image") {
        updateImageBorderStyle(object, getColor(), getStrokeWidth());
        canvas.requestRenderAll();
        saveHistory();
        updateStatus("Bordure de l’image modifiée");
        return;
    }

    /* -------------------------------------------------
       RECTANGLE / CERCLE
    ------------------------------------------------- */

    if (
        object.type === "rect" ||
        object.type === "ellipse"
    ) {

        if (
            typeof object.stroke === "string" &&
            object.stroke.startsWith("#")
        ) {

            colorInput.value =
                object.stroke;
        }


        if (
            Number.isFinite(
                object.strokeWidth
            )
        ) {

            strokeWidthInput.value =
                object.strokeWidth;
        }
    }
}

/* =====================================================
   MODIFICATION COULEUR / ÉPAISSEUR
===================================================== */

function updateSelectedObject() {

    const object =
        canvas.getActiveObject();


    if (!object) {
        updateStatus(
            "Sélectionnez un objet"
        );

        return;
    }


    /* -------------------------------------------------
       FLÈCHE
    ------------------------------------------------- */

    if (
        isFancyArrow(object)
    ) {

        const newColor =
            getColor();

        const newStrokeWidth =
            getStrokeWidth();


        /*
           On reconstruit la flèche avec exactement
           les mêmes points d'ancrage.
        */
        const newArrow =
            createFancyArrow(

                object.x1,
                object.y1,

                object.x2,
                object.y2,

                newColor,
                newStrokeWidth
            );


        if (!newArrow) {
            return;
        }


        const objects =
            canvas.getObjects();

        const index =
            objects.indexOf(object);


        if (index < 0) {
            return;
        }


        /*
           Remplacement de l'ancienne flèche.
        */
        canvas.remove(
            object
        );


        canvas.insertAt(
            index,
            newArrow
        );


        newArrow.set({
            selectable: true,
            evented: true
        });


        /*
           Nouvelle sélection.
        */
        canvas.setActiveObject(
            newArrow
        );


        editingArrow =
            newArrow;


        /*
           Rendu.
        */
        canvas.renderAll();


        /*
           Repositionnement des poignées.
        */
        showArrowHandles(
            newArrow
        );


        /*
           Synchronisation des contrôles.
        */
        syncControlsFromSelectedObject();


        saveHistory();


        updateStatus(
            "Flèche modifiée"
        );


        return;
    }


    /* -------------------------------------------------
       TEXTE
    ------------------------------------------------- */

    if (
        object.type === "i-text"
    ) {

        object.set({
            fill: getColor(),
             opacity: getStrokeOpacity()
        });


        /*
           Ne modifier la taille que si le changement
           vient réellement du contrôle de taille.
           La valeur actuelle est conservée sinon.
        */
        if (
            document.activeElement ===
            fontSizeInput
        ) {

            object.set({
                fontSize:
                    getFontSize()
            });
        }


        canvas.requestRenderAll();


        syncControlsFromSelectedObject();


        saveHistory();


        updateStatus(
            "Texte modifié"
        );


        return;
    }


    /* -------------------------------------------------
       IMAGE AVEC BORDURE ASSOCIÉE
    ------------------------------------------------- */

    if (object.type === "image") {
        updateImageBorderStyle(object, getColor(), getStrokeWidth());
        canvas.requestRenderAll();
        saveHistory();
        updateStatus("Bordure de l’image modifiée");
        return;
    }

    /* -------------------------------------------------
       RECTANGLE / CERCLE
    ------------------------------------------------- */

    if (
        object.type === "rect" ||
        object.type === "ellipse" ||
        object.type === "path"
    ) {

        object.set({

            stroke:
                getColor(),

            strokeWidth: getStrokeWidth(),

            opacity: getStrokeOpacity()
        });


        canvas.requestRenderAll();


        syncControlsFromSelectedObject();


        saveHistory();


        updateStatus(
            "Objet modifié"
        );
    }
}


/* ===== Extracted from original script.js, lines 5387-5458 ===== */
/* =====================================================
   CONTRÔLES DE STYLE
===================================================== */

/*
   La couleur utilise "input" afin que la modification
   soit immédiatement appliquée pendant le choix de la
   couleur.

   On utilise également change pour garantir le dernier
   état lorsque le sélecteur est fermé.
*/

/* =====================================================
   CONTRÔLES DE STYLE
===================================================== */

const colorPickerWrap = document.getElementById("colorPickerWrap");
const colorPickerPopup = document.getElementById("colorPickerPopup");
const customColorInput = document.getElementById("customColorInput");

function setColorPickerOpen(open) {
    colorPickerPopup.hidden = !open;
    colorInput.setAttribute("aria-expanded", String(open));
    if (open) {
        customColorInput.value = colorInput.value;
        colorPickerPopup.querySelectorAll(".color-swatch").forEach(swatch => {
            swatch.setAttribute("aria-pressed", String(swatch.dataset.color.toLowerCase() === colorInput.value.toLowerCase()));
        });
    }
}

// Keep the existing color control, but open our palette instead of the browser popup.
colorInput.addEventListener("click", event => {
    event.preventDefault();
    setColorPickerOpen(colorPickerPopup.hidden);
});
colorInput.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setColorPickerOpen(colorPickerPopup.hidden);
    }
    if (event.key === "Escape") setColorPickerOpen(false);
});

colorPickerPopup.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
        colorInput.value = swatch.dataset.color;
        customColorInput.value = swatch.dataset.color;
        colorPickerPopup.querySelectorAll(".color-swatch").forEach(item => item.setAttribute("aria-pressed", String(item === swatch)));
        colorInput.dispatchEvent(new Event("input", { bubbles: true }));
        colorInput.dispatchEvent(new Event("change", { bubbles: true }));
        setColorPickerOpen(false);
        colorInput.focus();
    });
});

customColorInput.addEventListener("input", () => {
    colorInput.value = customColorInput.value;
    colorPickerPopup.querySelectorAll(".color-swatch").forEach(swatch => {
        swatch.setAttribute("aria-pressed", String(swatch.dataset.color.toLowerCase() === colorInput.value.toLowerCase()));
    });
    colorInput.dispatchEvent(new Event("input", { bubbles: true }));
});
customColorInput.addEventListener("change", () => {
    colorInput.value = customColorInput.value;
    colorInput.dispatchEvent(new Event("change", { bubbles: true }));
    setColorPickerOpen(false);
});

document.addEventListener("pointerdown", event => {
    if (!colorPickerWrap.contains(event.target)) setColorPickerOpen(false);
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !colorPickerPopup.hidden) setColorPickerOpen(false);
});

colorInput.addEventListener(
    "input",
    updateSelectedObject
);

strokeWidthInput.addEventListener(
    "change",
    updateSelectedObject
);

strokeOpacityInput.addEventListener("input", () => {
    updateStrokeOpacityLabel();
    updateSelectedObject();
});
strokeOpacityInput.addEventListener("change", updateSelectedObject);
updateStrokeOpacityLabel();
syncThicknessControl();

fontSizeInput.addEventListener(
    "change",
    updateSelectedObject
);

/* =====================================================
   REDIMENSIONNEMENT
===================================================== */

window.addEventListener(
    "resize",
    () => {

        if (editingArrow) {

            positionArrowHandles(
                editingArrow
            );
        }
    }
);


workspace.addEventListener(
    "scroll",
    () => {

        if (editingArrow) {

            positionArrowHandles(
                editingArrow
            );
        }
    }
);




// Border is an action on the currently selected image, not a drawing mode.
document.querySelector('[data-action="add-border"]')?.addEventListener("click", () => {
    addBorderToSelectedImage();
    document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
});
