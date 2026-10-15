
/* ===== Extracted from original script.js, lines 219-268 ===== */
/* =====================================================
   FABRIC
===================================================== */

const canvas =
    new fabric.Canvas(
        canvasElement,
        {
            selection: true,
            preserveObjectStacking: true
        }
    );


/* =====================================================
   OUTILS GÉNÉRAUX
===================================================== */

function updateStatus(text) {
    const translated = FUZE_LANGUAGE === "en" ? ({
        "Prêt": "Ready",
        "Lecture du pixel impossible": "Could not read pixel",
        "Pipette annulée": "Eyedropper cancelled",
        "Texte modifié": "Text updated",
        "Épaisseur appliquée aux objets sélectionnés": "Thickness applied to selected objects",
        "Image collée depuis le presse-papiers": "Image pasted from clipboard",
        "Impossible de coller l'image": "Could not paste image",
        "Impossible de prélever cette couleur.": "Could not pick this color.",
        "Sélection multiple : les épaisseurs sont différentes": "Multiple selection: thickness values differ",
        "Épaisseur": "Thickness"
    })[text] : text;
    statusText.textContent = translated || text;
}


function updateEmptyMessage() {

    emptyMessage.style.display =
        canvas.getObjects().length === 0
            ? "flex"
            : "none";
}


function getColor() {

    return colorInput.value ||
        DEFAULT_COLOR;
}


/* ===== Extracted from original script.js, lines 4565-4681 ===== */
/* =====================================================
   ZOOM
===================================================== */

function setZoom(value) {

    zoom =
        Math.max(
            0.25,
            Math.min(
                2.5,
                value
            )
        );


    canvas.setZoom(
        zoom
    );


    canvas.setDimensions({

        width:
            CANVAS_WIDTH *
            zoom,

        height:
            CANVAS_HEIGHT *
            zoom
    });


    stage.style.width =
        `${CANVAS_WIDTH * zoom}px`;

    stage.style.height =
        `${CANVAS_HEIGHT * zoom}px`;


    zoomStatus.textContent =
        `${Math.round(
            zoom * 100
        )}%`;


    document.getElementById(
        "zoomSelect"
    ).value =
        String(zoom);


    canvas.renderAll();


    if (editingArrow) {

        positionArrowHandles(
            editingArrow
        );
    }
}


document
    .getElementById(
        "zoomSelect"
    )
    .addEventListener(
        "change",
        event => {

            setZoom(
                parseFloat(
                    event.target.value
                )
            );
        }
    );


document
    .getElementById(
        "zoomInButton"
    )
    .addEventListener(
        "click",
        () => {

            setZoom(
                Math.min(
                    2.5,
                    zoom + 0.25
                )
            );
        }
    );


document
    .getElementById(
        "zoomOutButton"
    )
    .addEventListener(
        "click",
        () => {

            setZoom(
                Math.max(
                    0.25,
                    zoom - 0.25
                )
            );
        }
    );


