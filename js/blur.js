
/* ===== Extracted from original script.js, lines 932-1417 ===== */
/* =====================================================
   BLUR
===================================================== */

/*
 * Le blur est enregistré comme une image Fabric indépendante.
 *
 * L'image d'origine reste donc intacte dessous :
 * - supprimer le blur révèle immédiatement l'original ;
 * - déplacer/redimensionner le blur reste possible avec les
 *   contrôles Fabric ;
 * - le résultat est inclus dans l'historique et dans le PNG.
 *
 * Lorsqu'un blur existant est modifié, son contenu est régénéré
 * à partir de ce qui se trouve réellement dessous.
 */

const DEFAULT_BLUR_RADIUS = 4;

function isBlur(object) {

    return !!(
        object &&
        object.blurType === "blur"
    );
}


function getBlurRadius() {

    return DEFAULT_BLUR_RADIUS;
}


/*
 * Capture la zone demandée sans le blur lui-même.
 * Une marge supplémentaire est capturée afin que le flou
 * puisse déborder légèrement sans être coupé sur les bords.
 */
function createBlurredCanvas(
    left,
    top,
    width,
    height,
    radius = DEFAULT_BLUR_RADIUS
) {

    /*
     * IMPORTANT : ne pas utiliser canvas.toCanvasElement() ici.
     * Avec Fabric 6 + setZoom() cette API peut, selon l'état du
     * canvas, retourner un canvas temporaire de 0 x 0.
     *
     * On utilise directement le canvas réellement rendu par Fabric.
     * Les coordonnées de nos objets restent en coordonnées de scène
     * (1200 x 750), puis sont converties en pixels du canvas rendu.
     */

    const safeWidth = Math.max(
        1,
        Math.round(Number(width) || 0)
    );

    const safeHeight = Math.max(
        1,
        Math.round(Number(height) || 0)
    );

    const safeLeft = Number.isFinite(left)
        ? left
        : 0;

    const safeTop = Number.isFinite(top)
        ? top
        : 0;

    const safeZoom = Number.isFinite(zoom) && zoom > 0
        ? zoom
        : 1;

    const padding = Math.max(
        2,
        Math.ceil(Number(radius) || 0) * 2
    );

    const captureLeft = Math.max(
        0,
        Math.floor(safeLeft - padding)
    );

    const captureTop = Math.max(
        0,
        Math.floor(safeTop - padding)
    );

    const captureRight = Math.min(
        CANVAS_WIDTH,
        Math.ceil(safeLeft + safeWidth + padding)
    );

    const captureBottom = Math.min(
        CANVAS_HEIGHT,
        Math.ceil(safeTop + safeHeight + padding)
    );

    const captureWidth = Math.max(
        1,
        captureRight - captureLeft
    );

    const captureHeight = Math.max(
        1,
        captureBottom - captureTop
    );

    /* Canvas réellement rendu par Fabric. */
    const source = canvas.lowerCanvasEl;

    if (
        !source ||
        source.width <= 0 ||
        source.height <= 0
    ) {
        console.error(
            "Canvas Fabric invalide pour le blur :",
            source?.width,
            source?.height
        );
        return null;
    }

    /*
     * lowerCanvasEl peut avoir une résolution supérieure à sa taille
     * logique à cause du devicePixelRatio / retinaScaling. On mesure
     * directement le rapport entre les pixels réels et la scène.
     */
    const sceneToPixelX =
        source.width / (CANVAS_WIDTH * safeZoom);

    const sceneToPixelY =
        source.height / (CANVAS_HEIGHT * safeZoom);

    if (
        !Number.isFinite(sceneToPixelX) ||
        !Number.isFinite(sceneToPixelY) ||
        sceneToPixelX <= 0 ||
        sceneToPixelY <= 0
    ) {
        console.error(
            "Échelle du canvas invalide pour le blur :",
            source.width,
            source.height,
            safeZoom
        );
        return null;
    }

    /* Capture élargie en coordonnées logiques de scène. */
    const expanded =
        document.createElement("canvas");

    expanded.width = captureWidth;
    expanded.height = captureHeight;

    const expandedContext =
        expanded.getContext("2d");

    if (!expandedContext) {
        return null;
    }

    const sourceX =
        captureLeft * safeZoom * sceneToPixelX;

    const sourceY =
        captureTop * safeZoom * sceneToPixelY;

    const sourceWidth =
        captureWidth * safeZoom * sceneToPixelX;

    const sourceHeight =
        captureHeight * safeZoom * sceneToPixelY;

    expandedContext.drawImage(
        source,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        captureWidth,
        captureHeight
    );

    /* Application du flou sur la capture élargie. */
    const blurredExpanded =
        document.createElement("canvas");

    blurredExpanded.width = captureWidth;
    blurredExpanded.height = captureHeight;

    const blurContext =
        blurredExpanded.getContext("2d");

    if (!blurContext) {
        return null;
    }

    blurContext.filter =
        `blur(${Math.max(0, Number(radius) || 0)}px)`;

    blurContext.drawImage(
        expanded,
        0,
        0,
        captureWidth,
        captureHeight
    );

    blurContext.filter = "none";

    /* Recadrage exact de la zone sélectionnée. */
    const output =
        document.createElement("canvas");

    output.width = safeWidth;
    output.height = safeHeight;

    const outputContext =
        output.getContext("2d");

    if (!outputContext) {
        return null;
    }

    const cropX = Math.max(
        0,
        Math.round(safeLeft - captureLeft)
    );

    const cropY = Math.max(
        0,
        Math.round(safeTop - captureTop)
    );

    const cropWidth = Math.min(
        safeWidth,
        captureWidth - cropX
    );

    const cropHeight = Math.min(
        safeHeight,
        captureHeight - cropY
    );

    if (
        cropWidth <= 0 ||
        cropHeight <= 0
    ) {
        return null;
    }

    outputContext.drawImage(
        blurredExpanded,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
    );

    return output;
}

/*
 * Construit l'objet Fabric correspondant à une zone de blur.
 */
function createBlurObject(
    left,
    top,
    width,
    height,
    radius = DEFAULT_BLUR_RADIUS
) {

    const blurredCanvas =
        createBlurredCanvas(
            left,
            top,
            width,
            height,
            radius
        );

    if (!blurredCanvas) {
        return null;
    }


    const blur =
        new fabric.FabricImage(
            blurredCanvas,
            {

                left:
                    Math.round(left),

                top:
                    Math.round(top),

                originX: "left",
                originY: "top",

                scaleX: 1,
                scaleY: 1,

                selectable: true,
                evented: true,

                hasControls: true,
                hasBorders: true,

                blurType: "blur",
                blurRadius: radius
            }
        );


    return blur;
}


/*
 * Régénère le contenu d'un blur après son déplacement ou
 * son redimensionnement.
 */
function refreshBlurObject(object) {

    if (
        !isBlur(object) ||
        blurUpdateInProgress
    ) {
        return null;
    }


    const width =
        Math.max(
            1,
            object.getScaledWidth()
        );

    const height =
        Math.max(
            1,
            object.getScaledHeight()
        );

    const left =
        object.left;

    const top =
        object.top;


    if (
        !Number.isFinite(left) ||
        !Number.isFinite(top)
    ) {
        return null;
    }


    blurUpdateInProgress = true;


    const objects =
        canvas.getObjects();

    const index =
        objects.indexOf(object);


    /*
     * Masquer temporairement l'ancien snapshot.
     * La capture ne peut donc pas se flouter elle-même.
     */
    object.visible = false;

    canvas.discardActiveObject();
    canvas.renderAll();


    const blurredCanvas =
        createBlurredCanvas(
            left,
            top,
            width,
            height,
            object.blurRadius ||
                DEFAULT_BLUR_RADIUS
        );


    if (!blurredCanvas) {

        object.visible = true;

        canvas.setActiveObject(
            object
        );

        canvas.renderAll();

        blurUpdateInProgress = false;

        return object;
    }


    const replacement =
        new fabric.FabricImage(
            blurredCanvas,
            {

                left,
                top,

                originX: "left",
                originY: "top",

                selectable: true,
                evented: true,

                hasControls: true,
                hasBorders: true,

                blurType: "blur",
                blurRadius:
                    object.blurRadius ||
                    DEFAULT_BLUR_RADIUS
            }
        );


    /*
     * Conserver exactement la même position dans la pile.
     */
    if (index >= 0) {

        canvas.remove(
            object
        );

        canvas.insertAt(
            index,
            replacement
        );

    } else {

        canvas.remove(
            object
        );

        canvas.add(
            replacement
        );
    }


    canvas.setActiveObject(
        replacement
    );

    canvas.renderAll();


    blurUpdateInProgress = false;

    return replacement;
}


/* ===== Extracted from original script.js, lines 4013-4101 ===== */
/* =====================================================
   DÉPLACEMENT / REDIMENSIONNEMENT DU BLUR
===================================================== */

/*
 * Le blur est un snapshot. Après une modification de sa
 * géométrie, on le régénère à partir du contenu situé dessous.
 */
canvas.on(
    "object:modified",
    event => {

        const object =
            event.target;


        if (blurUpdateInProgress) {
            return;
        }


        if (isBlur(object)) {

            const replacement =
                refreshBlurObject(
                    object
                );

            if (replacement) {

                canvas.setActiveObject(
                    replacement
                );
            }

            saveHistory();

            updateStatus(
                "Zone de blur modifiée"
            );

            return;
        }


        /*
         * Si l'image ou une annotation située dessous a été
         * déplacée/redimensionnée, les zones de blur doivent
         * continuer à masquer le bon contenu.
         */
        const blurObjects =
            canvas.getObjects()
                .filter(isBlur);


        if (!blurObjects.length) {
            return;
        }


        const active =
            canvas.getActiveObject();


        blurObjects.forEach(
            blur => {

                refreshBlurObject(
                    blur
                );
            }
        );


        if (active && !isBlur(active)) {

            canvas.setActiveObject(
                active
            );
        }


        canvas.renderAll();

        saveHistory();
    }
);


