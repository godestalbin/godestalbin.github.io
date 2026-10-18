
/* ===== Extracted from original script.js, lines 791-931 ===== */
async function addImageFromFile(
    file
) {

    if (
        !file.type.startsWith(
            "image/"
        )
    ) {
        return;
    }

    const dataUrl =
        await readFileAsDataURL(
            file
        );

    try {

        const image =
            await fabric.FabricImage.fromURL(
                dataUrl
            );

        image.set({
            originX: "center",
            originY: "center"
        });


        // Applique le pourcentage choisi à l'import.
        // Utiliser scaleX/scaleY : Fabric.js stocke l'échelle dans ces propriétés.
        // « No resize » (1) conserve la taille originale de l'image.
        const importScale = getImageImportScale();

        image.set({
            scaleX: importScale,
            scaleY: importScale,

            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2
        });


        canvas.add(image);

        canvas.setActiveObject(
            image
        );

        saveHistory();

        updateEmptyMessage();

        updateStatus(
            "Image ajoutée"
        );

    } catch (error) {

        console.error(
            "Erreur chargement image :",
            error
        );

        updateStatus(
            "Impossible de charger l'image"
        );
    }
}


function readFileAsDataURL(
    file
) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();

            reader.onload =
                () => resolve(
                    reader.result
                );

            reader.onerror =
                reject;

            reader.readAsDataURL(
                file
            );
        }
    );
}


/* =====================================================
   DRAG & DROP
===================================================== */

workspace.addEventListener(
    "dragover",
    event => {

        event.preventDefault();
    }
);


workspace.addEventListener(
    "drop",
    async event => {

        event.preventDefault();

        const files =
            Array.from(
                event.dataTransfer.files || []
            );

        for (
            const file of files
        ) {

            if (
                file.type &&
                file.type.startsWith(
                    "image/"
                )
            ) {

                await addImageFromFile(
                    file
                );
            }
        }
    }
);


/* ===== Extracted from original script.js, lines 4682-5007 ===== */
/* =====================================================
   EXPORT PNG
===================================================== */

/**
 * Prépare les paramètres d'export :
 * - crop automatique à tous les objets
 * - marge autour des objets
 * - fond transparent
 */
function getPngExportDataURL() {

    // Masquer les poignées de flèche
    hideArrowHandles();

    // Supprimer la sélection pour qu'elle
    // n'apparaisse jamais dans le PNG
    canvas.discardActiveObject();

    canvas.renderAll();


    const objects = canvas.getObjects();


    // --------------------------------------------------
    // Aucun objet
    // --------------------------------------------------

    if (!objects.length) {

        updateStatus(
            "Aucun élément à exporter"
        );

        return null;
    }


    // --------------------------------------------------
    // Calcul des limites de tous les objets
    // --------------------------------------------------

    let minLeft = Infinity;
    let minTop = Infinity;

    let maxRight = -Infinity;
    let maxBottom = -Infinity;


    objects.forEach(object => {

        const bounds =
            object.getBoundingRect({

                includeStroke: true,

                includeShadow: true,

                absolute: true
            });


        minLeft =
            Math.min(
                minLeft,
                bounds.left
            );


        minTop =
            Math.min(
                minTop,
                bounds.top
            );


        maxRight =
            Math.max(
                maxRight,
                bounds.left + bounds.width
            );


        maxBottom =
            Math.max(
                maxBottom,
                bounds.top + bounds.height
            );
    });


    // --------------------------------------------------
    // MARGE AUTOUR DU CONTENU
    // --------------------------------------------------

    /*
     * Marge supplémentaire autour
     * de tous les objets.
     *
     * 12 px permet notamment de ne pas
     * couper l'ombre du texte.
     */
    const exportMargin =
        12;


    minLeft -=
        exportMargin;

    minTop -=
        exportMargin;

    maxRight +=
        exportMargin;

    maxBottom +=
        exportMargin;


    // --------------------------------------------------
    // Dimensions finales
    // --------------------------------------------------

    const width = maxRight - minLeft;


    const height = maxBottom - minTop;


    if (
        width <= 0 ||
        height <= 0
    ) {

        updateStatus(
            "Zone d'export invalide"
        );

        return null;
    }

    

    // --------------------------------------------------
    // Sauvegarder le fond actuel
    // --------------------------------------------------

    const oldBackgroundColor =
        canvas.backgroundColor;


    // --------------------------------------------------
    // Fond transparent pendant l'export
    // --------------------------------------------------

    canvas.backgroundColor = null;

    canvas.renderAll();


    // --------------------------------------------------
    // Export recadré
    // --------------------------------------------------

    const dataUrl =
        canvas.toDataURL({

            format: "png",

            left: minLeft,

            top: minTop,

            width: width,

            height: height,

            multiplier:
                1 / zoom
        });


    // --------------------------------------------------
    // Restaurer le fond de l'éditeur
    // --------------------------------------------------

    canvas.backgroundColor =
        oldBackgroundColor;

    canvas.renderAll();


    return dataUrl;
}


/* =====================================================
   COPIER PNG
===================================================== */

async function copyPng() {

    try {

        const dataUrl =
            getPngExportDataURL();


        if (!dataUrl) {
            return;
        }


        const response =
            await fetch(dataUrl);


        const blob =
            await response.blob();


        await navigator.clipboard.write([

            new ClipboardItem({

                "image/png":
                    blob
            })

        ]);


        updateStatus(
            "PNG recadré copié dans le presse-papiers"
        );

    } catch (error) {

        console.error(error);

        updateStatus(
            "Copie PNG impossible"
        );
    }


    canvas.renderAll();
}


document
    .getElementById(
        "copyPngButton"
    )
    .addEventListener(
        "click",
        copyPng
    );


/* =====================================================
   DOWNLOAD PNG
===================================================== */

document
    .getElementById(
        "downloadPngButton"
    )
    .addEventListener(
        "click",
        () => {

            try {

                const dataUrl =
                    getPngExportDataURL();


                if (!dataUrl) {
                    return;
                }


                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    dataUrl;


                link.download =
                    "Fuze - image.png";


                document.body.appendChild(
                    link
                );


                link.click();


                document.body.removeChild(
                    link
                );


                updateStatus(
                    "PNG recadré téléchargé"
                );

            } catch (error) {

                console.error(error);

                updateStatus(
                    "Téléchargement PNG impossible"
                );
            }
        }
    );


/* ===== Extracted from original script.js, lines 5479-5563 ===== */
/* =====================================================
   COLLAGE D'UNE IMAGE DEPUIS LE PRESSE-PAPIERS
===================================================== */

document.addEventListener("paste", async (event) => {

    const items = event.clipboardData?.items;

    if (!items) {
        return;
    }

    for (const item of items) {

        // On ne traite que les images
        if (!item.type.startsWith("image/")) {
            continue;
        }

        event.preventDefault();

        const file = item.getAsFile();

        if (!file) {
            continue;
        }

        try {

            const dataUrl = await new Promise((resolve, reject) => {

                const reader = new FileReader();

                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;

                reader.readAsDataURL(file);
            });

            const img =
                await fabric.FabricImage.fromURL(dataUrl);

            // Applique le même réglage que pour les images chargées.
            // « No resize » conserve la taille originale de l'image.
            const scale = getImageImportScale();

            img.set({
                scaleX: scale,
                scaleY: scale,

                left: CANVAS_WIDTH / 2,
                top: CANVAS_HEIGHT / 2,

                originX: "center",
                originY: "center",

                selectable: true,
                evented: true
            });

            canvas.add(img);

            canvas.setActiveObject(img);
            canvas.renderAll();

            saveHistory();

            updateEmptyMessage();

            updateStatus("Image collée depuis le presse-papiers");

        } catch (error) {

            console.error(
                "Erreur lors du collage de l'image :",
                error
            );

            updateStatus("Impossible de coller l'image");
        }

        // Une seule image par collage
        break;
    }
});
