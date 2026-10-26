
    /* ===== Extracted from original script.js, lines 353-521 ===== */
    function getStrokeWidth() {

        const value =
            parseFloat(
                strokeWidthInput.value
            );

        return Number.isFinite(value)
            ? Math.max(
                1,
                Math.min(30, value)
            )
            : DEFAULT_STROKE_WIDTH;
    }


    function getStrokeObjects() {
        return canvas.getActiveObjects().filter(object =>
            isFancyArrow(object) ||
            object.type === "rect" ||
            object.type === "ellipse" ||
            object.type === "path"
        );
    }

    function getObjectThickness(object) {
        if (isFancyArrow(object)) return Number(object.arrowStrokeWidth ?? object.strokeWidth);
        return Number(object.strokeWidth);
    }

    function syncThicknessControl() {
        const selected = getStrokeObjects();
        strokeWidthInput.disabled = false;

        if (!selected.length) return;

        const widths = selected.map(getObjectThickness);
        const first = widths[0];
        const same = widths.every(width => Number.isFinite(width) && Math.abs(width - first) < 0.001);

        if (!same) {
            strokeWidthInput.disabled = true;
            strokeWidthInput.title = "Sélection multiple : les épaisseurs sont différentes";
            return;
        }

        strokeWidthInput.value = String(first);
        strokeWidthInput.title = "Épaisseur";
    }

    function getStrokeOpacity() {
        const value = Number(strokeOpacityInput?.value ?? 55);
        return Math.max(0.1, Math.min(1, (Number.isFinite(value) ? value : 55) / 100));
    }

    function updateStrokeOpacityLabel() {
        if (strokeOpacityValue && strokeOpacityInput) {
            strokeOpacityValue.value = `${strokeOpacityInput.value}%`;
            strokeOpacityValue.textContent = `${strokeOpacityInput.value}%`;
        }
    }

    /*
    * PARAMÈTRES DU LISSAGE — ajustables ici :
    * FREEHAND_SMOOTHING_RADIUS : nombre de points voisins de chaque côté.
    *   2 = léger, 4 = fort, 6 à 8 = très fort.
    * FREEHAND_CURRENT_WEIGHT : poids du point courant. Plus il est faible,
    *   plus les tremblements sont supprimés (mais plus les angles sont arrondis).
    */
    const FREEHAND_SMOOTHING_RADIUS = 6;
    const FREEHAND_CURRENT_WEIGHT = 1;

    function smoothFreehandPoints(points) {
        if (points.length <= 2) return points.map(p => ({ x: p.x, y: p.y }));
        const radius = Math.max(1, FREEHAND_SMOOTHING_RADIUS);
        const currentWeight = Math.max(0.1, FREEHAND_CURRENT_WEIGHT);
        return points.map((point, index) => {
            const from = Math.max(0, index - radius);
            const to = Math.min(points.length - 1, index + radius);
            let x = 0, y = 0, count = 0;
            for (let i = from; i <= to; i++) {
                const weight = i === index ? currentWeight : 1;
                x += points[i].x * weight;
                y += points[i].y * weight;
                count += weight;
            }
            return { x: x / count, y: y / count };
        });
    }

    function makeSmoothPathData(points) {
        const pts = smoothFreehandPoints(points);
        if (!pts.length) return null;
        if (pts.length === 1) {
            const p = pts[0];
            return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`;
        }
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length - 1; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            d += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
        }
        const last = pts[pts.length - 1];
        d += ` Q ${last.x} ${last.y} ${last.x} ${last.y}`;
        return d;
    }

    function refreshFreehandPreview() {
        if (!freehandPoints.length) return;
        const pathData = makeSmoothPathData(freehandPoints);
        if (!pathData) return;

        const replacement = new fabric.Path(pathData, {
            fill: null,
            stroke: getColor(),
            strokeWidth: getStrokeWidth() * (currentTool === "highlight" ? 2.2 : 1),
            strokeLineCap: "round",
            strokeLineJoin: "round",
            strokeMiterLimit: 2,
            opacity: getStrokeOpacity(),
            selectable: false,
            evented: false,
            objectCaching: false
        });
        replacement.fuzeTool = currentTool;

        if (temporaryObject) {
            const objects = canvas.getObjects();
            const index = objects.indexOf(temporaryObject);
            canvas.remove(temporaryObject);
            temporaryObject = replacement;
            canvas.insertAt(Math.max(0, index), replacement);
        } else {
            temporaryObject = replacement;
            canvas.add(replacement);
        }
        canvas.requestRenderAll();
    }

    function getFontSize() {

        const value =
            parseFloat(
                fontSizeInput.value
            );

        return Number.isFinite(value)
            ? Math.max(
                8,
                Math.min(120, value)
            )
            : 32;
    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(max, value)
        );
    }



    /* ===== Extracted from original script.js, lines 685-790 ===== */
    /* =====================================================
    OUTIL / SÉLECTION
    ===================================================== */

    function addBorderToSelectedImage() {
        const image = canvas.getActiveObject();
        if (!image || image.type !== "image") {
            updateStatus("Sélectionnez d’abord une image");
            return;
        }

        // Reuse an existing border instead of creating duplicates.
        if (image.fuzeBorderId) {
            const existingBorder = canvas.getObjects().find(obj => obj.fuzeBorderOwnerId === image.fuzeBorderId);
            if (existingBorder) {
                canvas.remove(existingBorder);
                canvas.requestRenderAll();
                updateStatus("Bordure supprimée");
                return;
            }
        }

        const id = `fuze-border-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        image.fuzeBorderId = id;
        const bounds = image.getBoundingRect();
        const width = getStrokeWidth();
        const strokeWidth = width;

        const border = new fabric.Rect({
            left: bounds.left - strokeWidth,
            top: bounds.top - strokeWidth,
            width: Math.max(1, bounds.width + strokeWidth),
            height: Math.max(1, bounds.height + strokeWidth),
            rx: Math.min(14, Math.max(4, Math.min(bounds.width, bounds.height) * 0.04)),
            ry: Math.min(14, Math.max(4, Math.min(bounds.width, bounds.height) * 0.04)),
            fill: "rgba(0,0,0,0)",
            stroke: getColor(),
            strokeWidth: width,
            opacity: getStrokeOpacity(),
            selectable: false,
            evented: false,
            objectCaching: false,
            fuzeTool: "border",
            fuzeBorderOwnerId: id
        });
        canvas.add(border);
        // Keep the image above its border and preserve all other overlay ordering.
        // canvas.moveObjectTo(image, Math.max(0, canvas.getObjects().indexOf(border) + 1));
        const objects = canvas.getObjects();
        const imageIndex = objects.indexOf(image);

        if (imageIndex !== -1) {
            canvas.moveObjectTo(border, imageIndex + 1);
        }
        canvas.setActiveObject(image);
        canvas.requestRenderAll();
        saveHistory();
        updateStatus("Bordure ajoutée");
    }

    function syncImageBorder(image) {
        if (!image || image.type !== "image" || !image.fuzeBorderId) return;
        const border = canvas.getObjects().find(obj => obj.fuzeBorderOwnerId === image.fuzeBorderId);
        if (!border) return;
        const bounds = image.getBoundingRect();
        const width = Number(border.strokeWidth) || 1;
        const strokeWidth = width;
        const radius = Math.min(14, Math.max(4, Math.min(bounds.width, bounds.height) * 0.04));
        
        border.set({
            left: bounds.left - strokeWidth,
            top: bounds.top - strokeWidth,
            width: Math.max(1, bounds.width + strokeWidth),
            height: Math.max(1, bounds.height + strokeWidth),
            rx: radius,
            ry: radius
        });
        border.setCoords();
    }

    function updateImageBorderStyle(image, color = getColor(), width = getStrokeWidth()) {
        if (!image || image.type !== "image" || !image.fuzeBorderId) return;
        const border = canvas.getObjects().find(obj => obj.fuzeBorderOwnerId === image.fuzeBorderId);
        if (!border) return;
        border.set({ stroke: color, strokeWidth: width, opacity: getStrokeOpacity() });
        syncImageBorder(image);
    }

    function setTool(tool) {

        currentTool = tool;

        document
            .querySelectorAll("[data-tool]")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.tool === tool
                );
            });

        canvas.isDrawingMode = false;

        if (Object.prototype.hasOwnProperty.call(DEFAULT_STROKE_WIDTHS, tool)) {
            strokeWidthInput.value = String(DEFAULT_STROKE_WIDTHS[tool]);
        }

        if (tool === "select") {

            canvas.selection = true;

            canvas.forEachObject(
                object => {

                    object.selectable = true;
                    object.evented = true;
                }
            );

            updateStatus(
                "Mode sélection"
            );

        } else {

            canvas.discardActiveObject();

            hideArrowHandles();

            canvas.selection = false;

            canvas.forEachObject(
                object => {

                    object.selectable = false;
                    object.evented = false;
                }
            );

            updateStatus(
                tool === "felt" ? "Feutre : tracer librement" :
                tool === "highlight" ? "Highlight : tracer un rectangle jaune" :
                "Outil : " + tool
            );
        }

        syncThicknessControl();
        canvas.renderAll();
    }


    /* =====================================================
    IMAGE
    ===================================================== */

    document
        .getElementById(
            "addImageButton"
        )
        .addEventListener(
            "click",
            () => {

                imageInput.click();
            }
        );


    imageInput.addEventListener(
        "change",
        async event => {

            const files =
                Array.from(
                    event.target.files || []
                );

            for (const file of files) {

                await addImageFromFile(
                    file
                );
            }

            imageInput.value = "";
        }
    );



    /* ===== Extracted from original script.js, lines 1418-4012 ===== */
    /* =====================================================
    FLÈCHE
    ===================================================== */

    /*
    IMPORTANT

    La flèche est maintenant UN SEUL objet Fabric.

    Il n'y a plus :

        whitePath
        +
        colorPath

    qui pourraient avoir des transformations
    internes différentes.

    Le même Path possède :

        fill  = couleur
        stroke = blanc
        shadow = ombre

    Le contour blanc fait donc intrinsèquement
    partie de la même géométrie que la flèche.
    */


    function isFancyArrow(object) {

        return !!(
            object &&
            object.arrowType === "fancy"
        );
    }


    /* -----------------------------------------------------
    DIMENSIONS DE LA FLÈCHE
    ----------------------------------------------------- */

    function getArrowWidths(
        strokeWidth
    ) {

        /*
        On augmente légèrement les dimensions
        de la géométrie colorée car le contour
        blanc est centré sur son bord.
        */

        const innerTail =
            Math.max(
                12,
                strokeWidth * 2.2
            );

        const innerShaft =
            Math.max(
                24,
                strokeWidth * 4.0
            );

        const innerHead =
            Math.max(
                52,
                innerShaft * 2.35
            );


        /*
        Contour blanc.

        Il reste volontairement raisonnable
        afin de ne pas manger la couleur.
        */
        const outlineWidth =
            Math.max(
                5,
                strokeWidth * 0.90
            );


        return {

            innerTail,
            innerShaft,
            innerHead,

            outlineWidth
        };
    }


    /* -----------------------------------------------------
    GÉOMÉTRIE
    ----------------------------------------------------- */

    function buildArrowGeometry(
        x1,
        y1,
        x2,
        y2,
        widths
    ) {

        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        const length =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (length < 1) {
            return null;
        }


        const ux =
            dx / length;

        const uy =
            dy / length;

        /*
        Vecteur perpendiculaire.
        */
        const px =
            -uy;

        const py =
            ux;


        const shaftWidth =
            widths.innerShaft;

        const tailWidth =
            widths.innerTail;

        const headWidth =
            widths.innerHead;


        /*
        Longueur de la tête.

        Elle reste proportionnelle à la
        longueur totale de la flèche.
        */
        const headLength =
            Math.min(
                length * 0.45,
                Math.max(
                    35,
                    headWidth * 0.85
                )
            );


        const shaftEnd =
            Math.max(
                0,
                length - headLength
            );


        const points = [];


        /*
        1 — queue haut
        */
        points.push({

            x:
                x1 +
                px *
                tailWidth / 2,

            y:
                y1 +
                py *
                tailWidth / 2
        });


        /*
        2 — corps haut
        */
        points.push({

            x:
                x1 +
                ux *
                shaftEnd +
                px *
                shaftWidth / 2,

            y:
                y1 +
                uy *
                shaftEnd +
                py *
                shaftWidth / 2
        });


        /*
        3 — tête haut
        */
        points.push({

            x:
                x2 -
                ux *
                headLength +
                px *
                headWidth / 2,

            y:
                y2 -
                uy *
                headLength +
                py *
                headWidth / 2
        });


        /*
        4 — pointe
        */
        points.push({

            x: x2,
            y: y2
        });


        /*
        5 — tête bas
        */
        points.push({

            x:
                x2 -
                ux *
                headLength -
                px *
                headWidth / 2,

            y:
                y2 -
                uy *
                headLength -
                py *
                headWidth / 2
        });


        /*
        6 — corps bas
        */
        points.push({

            x:
                x1 +
                ux *
                shaftEnd -
                px *
                shaftWidth / 2,

            y:
                y1 +
                uy *
                shaftEnd -
                py *
                shaftWidth / 2
        });


        /*
        7 — queue bas
        */
        points.push({

            x:
                x1 -
                px *
                tailWidth / 2,

            y:
                y1 -
                py *
                tailWidth / 2
        });


        return points;
    }


    /* -----------------------------------------------------
    PATH AVEC COINS ARRONDIS
    ----------------------------------------------------- */

    function roundedPolygonPath(
        points,
        radius,
        tipRadius
    ) {

        if (
            !points ||
            points.length < 3
        ) {
            return "";
        }


        const count =
            points.length;

        const tipIndex = 3;

        const tangentPoints = [];


        /* =================================================
        CALCUL DES TANGENTES
        ================================================= */

        for (
            let i = 0;
            i < count;
            i++
        ) {

            const previous =
                points[
                    (i - 1 + count) %
                    count
                ];

            const current =
                points[i];

            const next =
                points[
                    (i + 1) % count
                ];


            const v1x =
                previous.x -
                current.x;

            const v1y =
                previous.y -
                current.y;

            const v2x =
                next.x -
                current.x;

            const v2y =
                next.y -
                current.y;


            const len1 =
                Math.hypot(
                    v1x,
                    v1y
                );

            const len2 =
                Math.hypot(
                    v2x,
                    v2y
                );


            if (
                len1 < 0.001 ||
                len2 < 0.001
            ) {

                tangentPoints.push({

                    before: {
                        x: current.x,
                        y: current.y
                    },

                    after: {
                        x: current.x,
                        y: current.y
                    }

                });

                continue;
            }


            /* ---------------------------------------------
            RAYON DU COIN
            --------------------------------------------- */

            const requestedRadius =
                i === tipIndex
                    ? tipRadius
                    : radius;


            /*
            On ne prend pas simplement 25 % du segment.

            Pour les coins du corps, cela donnait des
            arrondis trop petits, notamment à la queue.

            On autorise ici un arrondi plus important,
            tout en garantissant qu'il ne puisse pas
            dépasser le segment.
            */

            const maxSegmentRadius =
                Math.min(
                    len1,
                    len2
                ) * 0.45;


            const r =
                Math.min(
                    requestedRadius,
                    maxSegmentRadius
                );


            /* ---------------------------------------------
            POINT DE TANGENCE AVANT
            --------------------------------------------- */

            const before = {

                x:
                    current.x +
                    (v1x / len1) *
                    r,

                y:
                    current.y +
                    (v1y / len1) *
                    r

            };


            /* ---------------------------------------------
            POINT DE TANGENCE APRÈS
            --------------------------------------------- */

            const after = {

                x:
                    current.x +
                    (v2x / len2) *
                    r,

                y:
                    current.y +
                    (v2y / len2) *
                    r

            };


            tangentPoints.push({

                before,
                after

            });
        }


        /* =================================================
        CONSTRUCTION DU PATH
        ================================================= */

        /*
        On commence après le coin 0.
        */

        const start =
            tangentPoints[0].after;


        const commands = [

            `M ${start.x} ${start.y}`

        ];


        for (
            let i = 1;
            i <= count;
            i++
        ) {

            const index =
                i % count;

            const corner =
                points[index];

            const tangent =
                tangentPoints[index];


            /*
            Ligne jusqu'au début de l'arrondi.
            */

            commands.push(

                `L ${tangent.before.x} ${tangent.before.y}`

            );


            /*
            Arrondi du coin.

            Le point réel du corner est utilisé
            comme contrôle de la courbe quadratique.
            */

            commands.push(

                `Q ${corner.x} ${corner.y} ` +
                `${tangent.after.x} ${tangent.after.y}`

            );
        }


        commands.push("Z");


        return commands.join(" ");
    }

    /* -----------------------------------------------------
    CRÉATION DU PATH
    ----------------------------------------------------- */

    function createArrowPathData(
        x1,
        y1,
        x2,
        y2,
        strokeWidth
    ) {

        const widths =
            getArrowWidths(
                strokeWidth
            );


        const points =
            buildArrowGeometry(
                x1,
                y1,
                x2,
                y2,
                widths
            );


        if (!points) {
            return null;
        }


        /*
        Le padding inclut le contour blanc
        et laisse une petite marge.
        */
        const padding =
            widths.outlineWidth +
            8;


        const xs =
            points.map(
                point => point.x
            );

        const ys =
            points.map(
                point => point.y
            );


        const bounds = {

            minX:
                Math.min(...xs) -
                padding,

            minY:
                Math.min(...ys) -
                padding,

            maxX:
                Math.max(...xs) +
                padding,

            maxY:
                Math.max(...ys) +
                padding
        };


        /*
        Passage en coordonnées locales.
        */
        const localPoints =
            points.map(
                point => ({

                    x:
                        point.x -
                        bounds.minX,

                    y:
                        point.y -
                        bounds.minY

                })
            );


        /*
        Coins légèrement arrondis.
        */
        const radius =
            Math.max(
                12,
                Math.min(
                    strokeWidth * 2.2,
                    28
                )
            );

        const tipRadius =
            Math.max(
                26,
                Math.min(
                    strokeWidth * 3.8,
                    50
                )
            );


        const pathData =
            roundedPolygonPath(
                localPoints,
                radius,
                tipRadius
            );


        return {
            pathData,
            bounds,
            widths,
            radius,
            tipRadius
        };
    }


    /* =====================================================
    CRÉATION DE LA FLÈCHE
    ===================================================== */

    function createFancyArrow(
        x1,
        y1,
        x2,
        y2,
        color,
        strokeWidth
    ) {

        const geometry =
            createArrowPathData(
                x1,
                y1,
                x2,
                y2,
                strokeWidth
            );


        if (!geometry) {
            return null;
        }


        const {
            pathData,
            bounds,
            widths
        } = geometry;


        /*
        -------------------------------------------------
        COORDONNÉES LOCALES DES EXTRÉMITÉS
        -------------------------------------------------

        Le Path est positionné à bounds.minX/minY.

        On conserve donc les deux points d'ancrage
        dans le même système local que le path.
        */

        const localX1 =
            x1 -
            bounds.minX;

        const localY1 =
            y1 -
            bounds.minY;

        const localX2 =
            x2 -
            bounds.minX;

        const localY2 =
            y2 -
            bounds.minY;


        const arrow =
            new fabric.Path(
                pathData,
                {

                    left:
                        bounds.minX,

                    top:
                        bounds.minY,

                    originX: "left",
                    originY: "top",


                    fill: color,

                    stroke: "#ffffff",

                    strokeWidth:
                        widths.outlineWidth,


                    strokeLineJoin: "round",
                    strokeLineCap: "round",


                    shadow:
                        new fabric.Shadow({

                            color:
                                "rgba(0,0,0,0.32)",

                            blur: 5,

                            offsetX: 2,
                            offsetY: 2
                        }),


                    selectable: true,
                    evented: true,

                    hasControls: false,
                    hasBorders: true,

                    lockScalingX: true,
                    lockScalingY: true,
                    lockRotation: true,


                    /*
                    -------------------------------------------------
                    PROPRIÉTÉS FLÈCHE
                    -------------------------------------------------
                    */

                    arrowType: "fancy",

                    x1,
                    y1,

                    x2,
                    y2,


                    /*
                    Points d'ancrage du path.

                    Ils sont exprimés dans le système LOCAL
                    du Fabric.Path.
                    */

                    arrowPointStart: {
                        x: localX1,
                        y: localY1
                    },

                    arrowPointEnd: {
                        x: localX2,
                        y: localY2
                    },


                    arrowColor: color,

                    arrowStrokeWidth:
                        strokeWidth
                }
            );


        return arrow;
    }


    /* =====================================================
    RECONSTRUCTION
    ===================================================== */

    function rebuildArrow(
        oldArrow,
        x1,
        y1,
        x2,
        y2
    ) {

        return createFancyArrow(

            x1,
            y1,

            x2,
            y2,

            oldArrow.arrowColor ||
                getColor(),

            oldArrow.arrowStrokeWidth ||
                getStrokeWidth()
        );
    }


    /* =====================================================
    POIGNÉES
    ===================================================== */

    function showArrowHandles(
        object
    ) {

        if (
            !isFancyArrow(object)
        ) {

            hideArrowHandles();

            return;
        }


        editingArrow =
            object;


        arrowHandleStart.classList.add(
            "visible"
        );

        arrowHandleEnd.classList.add(
            "visible"
        );


        positionArrowHandles(
            object
        );
    }


    function hideArrowHandles() {

        arrowHandleStart.classList.remove(
            "visible"
        );

        arrowHandleEnd.classList.remove(
            "visible"
        );
    }


    /* -----------------------------------------------------
    POSITIONNEMENT DES POIGNÉES
    ----------------------------------------------------- */

    function positionArrowHandles(
        object
    ) {

        if (
            !isFancyArrow(object)
        ) {

            hideArrowHandles();

            return;
        }


        /*
        -------------------------------------------------
        Les coordonnées x1/y1 et x2/y2 sont globales.

        Le Path, lui, travaille avec ses propres
        coordonnées locales.

        On reconstruit donc les coordonnées locales
        des deux extrémités.
        -------------------------------------------------
        */

        const geometry =
            createArrowPathData(
                object.x1,
                object.y1,
                object.x2,
                object.y2,
                object.arrowStrokeWidth
            );


        if (!geometry) {
            return;
        }


        const {
            bounds
        } = geometry;


        /*
        Coordonnées de x1/y1 et x2/y2 dans le
        système utilisé par pathData.
        */

        const localStart =
            new fabric.Point(

                object.x1 -
                bounds.minX,

                object.y1 -
                bounds.minY
            );


        const localEnd =
            new fabric.Point(

                object.x2 -
                bounds.minX,

                object.y2 -
                bounds.minY
            );


        /*
        -------------------------------------------------
        IMPORTANT
        -------------------------------------------------

        Fabric Path utilise pathOffset pour positionner
        son système de coordonnées local.

        On convertit donc le point du path en point
        relatif à l'origine Fabric du Path.
        */

        const pathOffset =
            object.pathOffset ||
            new fabric.Point(
                0,
                0
            );


        const startForFabric =
            new fabric.Point(

                localStart.x -
                pathOffset.x,

                localStart.y -
                pathOffset.y
            );


        const endForFabric =
            new fabric.Point(

                localEnd.x -
                pathOffset.x,

                localEnd.y -
                pathOffset.y
            );


        /*
        -------------------------------------------------
        TRANSFORMATION PAR LE PATH
        -------------------------------------------------
        */

        const startCanvas =
            fabric.util.transformPoint(
                startForFabric,
                object.calcTransformMatrix()
            );


        const endCanvas =
            fabric.util.transformPoint(
                endForFabric,
                object.calcTransformMatrix()
            );


        /*
        -------------------------------------------------
        TRANSFORMATION DU CANVAS VERS L'ÉCRAN
        -------------------------------------------------
        */

        const startScreen =
            fabric.util.transformPoint(
                startCanvas,
                canvas.viewportTransform
            );


        const endScreen =
            fabric.util.transformPoint(
                endCanvas,
                canvas.viewportTransform
            );


        /*
        -------------------------------------------------
        POSITION DU CANVAS DANS LE STAGE
        -------------------------------------------------
        */

        const canvasRect =
            canvas.upperCanvasEl
                .getBoundingClientRect();

        const stageRect =
            stage.getBoundingClientRect();


        const offsetX =
            canvasRect.left -
            stageRect.left;

        const offsetY =
            canvasRect.top -
            stageRect.top;


        /*
        -------------------------------------------------
        POSITION DES POIGNÉES
        -------------------------------------------------
        */

        arrowHandleStart.style.left =
            `${offsetX + startScreen.x}px`;

        arrowHandleStart.style.top =
            `${offsetY + startScreen.y}px`;


        arrowHandleEnd.style.left =
            `${offsetX + endScreen.x}px`;

        arrowHandleEnd.style.top =
            `${offsetY + endScreen.y}px`;
    }

    /* =====================================================
    DRAG POIGNÉES
    ===================================================== */

    function startArrowHandleDrag(
        event,
        which
    ) {

        event.preventDefault();
        event.stopPropagation();


        if (!editingArrow) {
            return;
        }


        draggingArrowHandle =
            which;


        document.body.style.userSelect =
            "none";


        updateStatus(

            which === "start"

                ? "Déplacement du début de la flèche"

                : "Déplacement de la pointe de la flèche"
        );
    }


    function moveArrowHandle(
        event
    ) {

        if (
            !draggingArrowHandle ||
            !editingArrow
        ) {
            return;
        }


        /*
        Coordonnées écran du canvas.
        */
        const canvasRect =
            canvas.upperCanvasEl
                .getBoundingClientRect();


        const screenX =
            event.clientX -
            canvasRect.left;

        const screenY =
            event.clientY -
            canvasRect.top;


        /*
        Transformation inverse.

        Cela permet de retrouver les coordonnées
        logiques même avec un zoom.
        */
        const inverse =
            fabric.util.invertTransform(
                canvas.viewportTransform
            );


        const point =
            fabric.util.transformPoint(

                new fabric.Point(
                    screenX,
                    screenY
                ),

                inverse
            );


        let x1 =
            editingArrow.x1;

        let y1 =
            editingArrow.y1;

        let x2 =
            editingArrow.x2;

        let y2 =
            editingArrow.y2;


        if (
            draggingArrowHandle ===
            "start"
        ) {

            x1 =
                clamp(
                    point.x,
                    -100,
                    CANVAS_WIDTH + 100
                );

            y1 =
                clamp(
                    point.y,
                    -100,
                    CANVAS_HEIGHT + 100
                );

        } else {

            x2 =
                clamp(
                    point.x,
                    -100,
                    CANVAS_WIDTH + 100
                );

            y2 =
                clamp(
                    point.y,
                    -100,
                    CANVAS_HEIGHT + 100
                );
        }


        /*
        Empêcher une flèche nulle.
        */
        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        const length =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (length < 5) {
            return;
        }


        /*
        Reconstruction complète.

        Il n'y a plus aucune deuxième géométrie
        blanche à synchroniser.
        */
        const newArrow =
            rebuildArrow(
                editingArrow,

                x1,
                y1,

                x2,
                y2
            );


        if (!newArrow) {
            return;
        }


        const objects =
            canvas.getObjects();

        const oldIndex =
            objects.indexOf(
                editingArrow
            );


        canvas.remove(
            editingArrow
        );


        canvas.insertAt(
            oldIndex,
            newArrow
        );


        newArrow.set({
            selectable: true,
            evented: true
        });


        editingArrow =
            newArrow;


        canvas.setActiveObject(
            newArrow
        );


        canvas.renderAll();


        positionArrowHandles(
            newArrow
        );
    }


    function stopArrowHandleDrag() {

        if (!draggingArrowHandle) {
            return;
        }


        draggingArrowHandle = null;

        document.body.style.userSelect =
            "";


        if (editingArrow) {

            saveHistory();

            showArrowHandles(
                editingArrow
            );
        }


        updateStatus(
            "Flèche modifiée"
        );
    }


    /* =====================================================
    ÉVÉNEMENTS POIGNÉES
    ===================================================== */

    arrowHandleStart.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();

            event.stopPropagation();


            /*
            Très important :

            On récupère directement la flèche
            actuellement sélectionnée.
            */
            editingArrow =
                canvas.getActiveObject();


            if (
                editingArrow &&
                isFancyArrow(
                    editingArrow
                )
            ) {

                startArrowHandleDrag(
                    event,
                    "start"
                );
            }
        }
    );


    arrowHandleEnd.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();

            event.stopPropagation();


            editingArrow =
                canvas.getActiveObject();


            if (
                editingArrow &&
                isFancyArrow(
                    editingArrow
                )
            ) {

                startArrowHandleDrag(
                    event,
                    "end"
                );
            }
        }
    );


    window.addEventListener(
        "pointermove",
        moveArrowHandle
    );


    window.addEventListener(
        "pointerup",
        stopArrowHandleDrag
    );


    /* =====================================================
    CRÉATION DES OBJETS
    ===================================================== */

    function startDrawing(event) {

        if (
            currentTool === "select" ||
            currentTool === "text"
        ) {
            return;
        }


        const pointer =
            canvas.getScenePoint(
                event.e
            );


        drawing = true;


        drawStart = {

            x: pointer.x,
            y: pointer.y
        };


        temporaryObject = null;
        freehandPoints = [];

        /* -------------------------------------------------
        FEUTRE : TRACÉ LIBRE
        ------------------------------------------------- */

        if (currentTool === "felt") {
            freehandPoints.push({ x: drawStart.x, y: drawStart.y });
            refreshFreehandPreview();
            return;
        }


        /* -------------------------------------------------
        RECTANGLE
        ------------------------------------------------- */

        if (
            currentTool ===
            "rectangle"
        ) {

            temporaryObject =
                new fabric.Rect({

                    left:
                        drawStart.x,

                    top:
                        drawStart.y,

                    width: 1,
                    height: 1,

                    originX: "left",
                    originY: "top",

                    rx: 6,
                    ry: 6,

                    fill: "transparent",

                    stroke:
                        getColor(),

                    strokeWidth:
                        getStrokeWidth()
                });
        }

        /* -------------------------------------------------
        CERCLE
        ------------------------------------------------- */

        else if (
            currentTool ===
            "circle"
        ) {

            temporaryObject =
                new fabric.Ellipse({

                    left:
                        drawStart.x,

                    top:
                        drawStart.y,

                    rx: 1,
                    ry: 1,

                    originX: "left",
                    originY: "top",

                    fill: "transparent",

                    stroke:
                        getColor(),

                    strokeWidth:
                        getStrokeWidth()
                });
        }


        /* -------------------------------------------------
        SURLIGNAGE
        ------------------------------------------------- */

        else if (
            currentTool ===
            "highlight"
        ) {

            temporaryObject =
                new fabric.Rect({

                    left:
                        drawStart.x,

                    top:
                        drawStart.y,

                    width: 1,
                    height: 1,

                    originX: "left",
                    originY: "top",

                    rx: 6,
                    ry: 6,

                    fill:
                        "rgba(255,220,50,0.30)",

                    stroke:
                        "rgba(255,210,30,0.85)",

                    strokeWidth: 2,
                    fuzeTool: "highlight"
                });
        }

        /* -------------------------------------------------
        BLUR
        ------------------------------------------------- */

        else if (
            currentTool ===
            "blur"
        ) {

            /*
            * Pendant le tracé, on affiche simplement une zone
            * indicative. Le vrai snapshot flouté est créé à la
            * fin du tracé, lorsque les dimensions sont connues.
            */
            temporaryObject =
                new fabric.Rect({

                    left:
                        drawStart.x,

                    top:
                        drawStart.y,

                    width: 1,
                    height: 1,

                    originX: "left",
                    originY: "top",

                    fill:
                        "rgba(80,80,80,0.20)",

                    stroke:
                        "rgba(80,80,80,0.70)",

                    strokeWidth: 2,

                    selectable: false,
                    evented: false
                });
        }

        /* -------------------------------------------------
        FLÈCHE
        ------------------------------------------------- */

        else if (
            currentTool ===
            "arrow"
        ) {

            temporaryObject =
                createFancyArrow(

                    drawStart.x,
                    drawStart.y,

                    drawStart.x + 1,
                    drawStart.y + 1,

                    getColor(),
                    getStrokeWidth()
                );
        }


        if (temporaryObject) {

            canvas.add(
                temporaryObject
            );


            temporaryObject.set({

                selectable: false,
                evented: false
            });


            canvas.renderAll();
        }
    }


    function drawingMove(event) {

        if (
            !drawing ||
            !temporaryObject
        ) {
            return;
        }


        const pointer =
            canvas.getScenePoint(
                event.e
            );


        const x =
            pointer.x;

        const y =
            pointer.y;

        if (currentTool === "felt") {
            const last = freehandPoints[freehandPoints.length - 1];
            if (!last || Math.hypot(x - last.x, y - last.y) >= 1.2) {
                freehandPoints.push({ x, y });
                refreshFreehandPreview();
            }
            return;
        }

        /* -------------------------------------------------
        RECTANGLE
        ------------------------------------------------- */

        if (
            currentTool ===
            "rectangle"
        ) {

            const left =
                Math.min(
                    drawStart.x,
                    x
                );

            const top =
                Math.min(
                    drawStart.y,
                    y
                );

            const width =
                Math.abs(
                    x -
                    drawStart.x
                );

            const height =
                Math.abs(
                    y -
                    drawStart.y
                );


            temporaryObject.set({

                left,
                top,

                width,
                height
            });
        }

        /* -------------------------------------------------
        CERCLE
        ------------------------------------------------- */

        else if (
            currentTool ===
            "circle"
        ) {

            const left =
                Math.min(
                    drawStart.x,
                    x
                );

            const top =
                Math.min(
                    drawStart.y,
                    y
                );

            const width =
                Math.abs(
                    x -
                    drawStart.x
                );

            const height =
                Math.abs(
                    y -
                    drawStart.y
                );


            temporaryObject.set({

                left,
                top,

                rx:
                    width / 2,

                ry:
                    height / 2
            });
        }


        /* -------------------------------------------------
        SURLIGNAGE
        ------------------------------------------------- */

        else if (
            currentTool ===
            "highlight"
        ) {

            const left =
                Math.min(
                    drawStart.x,
                    x
                );

            const top =
                Math.min(
                    drawStart.y,
                    y
                );

            const width =
                Math.abs(
                    x -
                    drawStart.x
                );

            const height =
                Math.abs(
                    y -
                    drawStart.y
                );


            temporaryObject.set({

                left,
                top,

                width,
                height
            });
        }

        /* -------------------------------------------------
        BLUR
        ------------------------------------------------- */

        else if (
            currentTool ===
            "blur"
        ) {

            const left =
                Math.min(
                    drawStart.x,
                    x
                );

            const top =
                Math.min(
                    drawStart.y,
                    y
                );

            const width =
                Math.abs(
                    x -
                    drawStart.x
                );

            const height =
                Math.abs(
                    y -
                    drawStart.y
                );


            temporaryObject.set({

                left,
                top,

                width,
                height
            });
        }

        /* -------------------------------------------------
        FLÈCHE
        ------------------------------------------------- */

        else if (
            currentTool ===
            "arrow"
        ) {

            const newArrow =
                createFancyArrow(

                    drawStart.x,
                    drawStart.y,

                    x,
                    y,

                    getColor(),
                    getStrokeWidth()
                );


            if (!newArrow) {
                return;
            }


            const index =
                canvas.getObjects()
                    .indexOf(
                        temporaryObject
                    );


            canvas.remove(
                temporaryObject
            );


            temporaryObject =
                newArrow;


            temporaryObject.set({

                selectable: false,
                evented: false
            });


            canvas.insertAt(
                index,
                temporaryObject
            );
        }


        canvas.renderAll();
    }


    function finishDrawing() {

        if (!drawing) {
            return;
        }


        drawing = false;

        if (currentTool === "felt") {
            if (freehandPoints.length < 2) {
                const p = freehandPoints[0] || drawStart;
                if (p) freehandPoints.push({ x: p.x + 0.5, y: p.y + 0.5 });
            }
            refreshFreehandPreview();
        }

        if (!temporaryObject) {
            freehandPoints = [];
            return;
        }


        const object =
            temporaryObject;


        temporaryObject = null;
        freehandPoints = [];

        if (
            currentTool ===
            "arrow"
        ) {

            const dx =
                object.x2 -
                object.x1;

            const dy =
                object.y2 -
                object.y1;

            const length =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (length < 8) {

                canvas.remove(
                    object
                );

            } else {

                object.set({

                    selectable: true,
                    evented: true
                });


                editingArrow =
                    object;


                canvas.setActiveObject(
                    object
                );

                trackEvent('element_created', {
                    element_type: 'arrow'
                });
            }

        canvas.renderAll();

        saveHistory();

        updateEmptyMessage();

        } else if (
            currentTool ===
            "blur"
        ) {

            const left =
                object.left;

            const top =
                object.top;

            const width =
                object.width;

            const height =
                object.height;


            canvas.remove(
                object
            );


            if (
                width >= 4 &&
                height >= 4
            ) {

                const blur =
                    createBlurObject(
                        left,
                        top,
                        width,
                        height
                    );

                if (blur) {

                    canvas.add(
                        blur
                    );

                    canvas.setActiveObject(
                        blur
                    );

                    trackEvent('element_created', {
                        element_type: 'blur'
                    });

                    canvas.renderAll();

                    saveHistory();

                    updateStatus(
                        "Zone floutée"
                    );

                }
            }

            updateEmptyMessage();

        } else {

            object.set({

                selectable: true,
                evented: true
            });


            canvas.setActiveObject(
                object
            );

            const trackedTypes = {
            rectangle: 'rectangle',
            circle: 'circle',
            felt: 'felt',
            highlight: 'highlight'
            };

            if (trackedTypes[currentTool]) {
                trackEvent('element_created', {
                    element_type: trackedTypes[currentTool]
                });
            }

            canvas.renderAll();

            saveHistory();
            updateEmptyMessage();
        }
        

        if (
            currentTool !==
            "select"
        ) {

            setTool(
                "select"
            );
        }
    }


    /* =====================================================
    SOURIS CANVAS
    ===================================================== */

    canvas.on(
        "mouse:down",
        event => {

            if (eyedropperActive) {
                const color = sampleCanvasColor(event.e);

                if (color) {
                    colorInput.value = color;
                    colorInput.dispatchEvent(new Event("input", { bubbles: true }));
                    colorInput.dispatchEvent(new Event("change", { bubbles: true }));
                    cancelEyedropper();
                    updateStatus("Couleur prélevée : " + color);
                } else {
                    updateStatus("Impossible de prélever cette couleur.");
                }
                return;
            }

            if (
                currentTool ===
                "text"
            ) {

                addTextAt(
                    event.e
                );

                return;
            }


            startDrawing(event);
        }
    );


    canvas.on(
        "mouse:move",
        event => {

            drawingMove(event);
        }
    );


    canvas.on(
        "mouse:up",
        () => {

            finishDrawing();
        }
    );

    // Fabric peut rétablir son curseur de sélection.
    // Tant que la pipette est active, on lui redonne la priorité.
    canvas.on("mouse:move", () => {
        if (eyedropperActive) {
            updateEyedropperCursor();
        }
    });

    canvas.on("mouse:over", () => {
        if (eyedropperActive) {
            updateEyedropperCursor();
        }
    });

    /* =====================================================
    TEXTE
    ===================================================== */

    function addTextAt(event) {

        const pointer =
            canvas.getScenePoint(
                event
            );


        const text =
            new fabric.IText(

                "Votre texte",

                {

                    left:
                        pointer.x,

                    top:
                        pointer.y,

                    originX:
                        "left",

                    originY:
                        "top",

                    /* =====================================
                    TEXTE COLORÉ
                    ===================================== */

                    fill:
                        getColor(),

                    opacity:
                        getStrokeOpacity(),
                                                
                    fontSize:
                        getFontSize(),

                    fontFamily:
                        "Arial",

                    fontWeight:
                        "500",

                    editable:
                        true,


                    /* =====================================
                    HALO BLANC
                    ===================================== */

                    stroke:
                        "#ffffff",

                    strokeWidth:
                        8,

                    strokeLineJoin:
                        "round",

                    strokeLineCap:
                        "round",


                    /*
                    * TRÈS IMPORTANT
                    *
                    * Le contour blanc est dessiné
                    * AVANT le remplissage coloré.
                    *
                    * Le texte coloré reste donc
                    * parfaitement visible.
                    */
                    paintFirst:
                        "stroke",


                    /* =====================================
                    OMBRE GRISE
                    ===================================== */

                    shadow:
                        new fabric.Shadow({

                            color:
                                "rgba(99, 99, 99, 0.85)",

                            blur:
                                10,

                            offsetX:
                                0,

                            offsetY:
                                0
                        })
                }
            );


        /* =================================================
        AJOUT
        ================================================= */

        canvas.add(
            text
        );

        trackEvent('element_created', {
            element_type: 'text'
        });

        /* =================================================
        SÉLECTION
        ================================================= */

        canvas.setActiveObject(
            text
        );


        /* =================================================
        ÉDITION
        ================================================= */

        text.enterEditing();

        text.selectAll();


        /* =================================================
        HISTORIQUE
        ================================================= */

        saveHistory();


        /* =================================================
        RETOUR AU MODE SÉLECTION
        ================================================= */

        setTool(
            "select"
        );


        updateEmptyMessage();
    }


    /* =====================================================
    HISTORIQUE DE SAISIE DES TEXTES
    ===================================================== */

    canvas.on("text:editing:entered", event => {

        const text = event.target;

        if (!text) return;

        editingText = text;
        editingTextChanged = false;
    });


    canvas.on("text:changed", event => {

        const text = event.target;

        if (text !== editingText) return;

        editingTextChanged = true;
    });


    canvas.on("text:editing:exited", event => {

        const text = event.target;

        if (text !== editingText) return;

        if (
            editingTextChanged &&
            !restoringHistory
        ) {

            saveHistory();

            updateStatus("Texte modifié");
        }

        editingText = null;
        editingTextChanged = false;
    });


    // Keep borders attached to their images while moving, scaling, or rotating.
    ["object:moving", "object:scaling", "object:rotating", "object:modified"].forEach(eventName => {
        canvas.on(eventName, event => {
            if (event.target && event.target.type === "image") {
                syncImageBorder(event.target);
                canvas.requestRenderAll();
            }
        });
    });

    /* =====================================================
    SÉLECTION FABRIC
    ===================================================== */

    canvas.on(
        "selection:created",
        event => {

            const object =
                event.selected &&
                event.selected[0];


            if (
                object &&
                isFancyArrow(object)
            ) {

                editingArrow =
                    object;

                showArrowHandles(
                    object
                );

            } else {

                editingArrow = null;

                hideArrowHandles();
            }


            syncControlsFromSelectedObject();
        }
    );

    canvas.on(
        "selection:updated",
        event => {

            const object =
                event.selected &&
                event.selected[0];


            if (
                object &&
                isFancyArrow(object)
            ) {

                editingArrow =
                    object;

                showArrowHandles(
                    object
                );

            } else {

                editingArrow = null;

                hideArrowHandles();
            }


            syncControlsFromSelectedObject();
        }
    );

    canvas.on(
        "selection:cleared",
        () => {

            editingArrow = null;
            hideArrowHandles();
            syncThicknessControl();
        }
    );


    /* =====================================================
    DÉPLACEMENT DE LA FLÈCHE
    ===================================================== */

    canvas.on(
        "object:moving",
        event => {

            const object =
                event.target;


            if (
                !isFancyArrow(object)
            ) {
                return;
            }


            if (
                object.__previousLeft ===
                undefined
            ) {

                object.__previousLeft =
                    object.left;

                object.__previousTop =
                    object.top;
            }


            const dx =
                object.left -
                object.__previousLeft;

            const dy =
                object.top -
                object.__previousTop;


            /*
            Le déplacement du Path correspond
            à une translation de ses deux extrémités.
            */
            object.x1 += dx;
            object.y1 += dy;

            object.x2 += dx;
            object.y2 += dy;


            object.__previousLeft =
                object.left;

            object.__previousTop =
                object.top;


            positionArrowHandles(
                object
            );
        }
    );


    canvas.on(
        "object:moved",
        event => {

            const object =
                event.target;


            if (
                isFancyArrow(object)
            ) {

                delete object.__previousLeft;
                delete object.__previousTop;


                positionArrowHandles(
                    object
                );


                saveHistory();
            }
        }
    );


    /* ===== Extracted from original script.js, lines 4460-4564 ===== */
    /* =====================================================
    SUPPRESSION
    ===================================================== */

    function deleteSelected() {

        const active =
            canvas.getActiveObjects();


        if (!active.length) {
            return;
        }


        hideArrowHandles();

        canvas.discardActiveObject();


        active.forEach(
            object => {

                canvas.remove(
                    object
                );
            }
        );


        canvas.renderAll();

        saveHistory();

        updateEmptyMessage();

        updateStatus(
            "Objet supprimé"
        );
    }


    document
        .getElementById(
            "deleteButton"
        )
        .addEventListener(
            "click",
            deleteSelected
        );


    /* =====================================================
    CLEAR
    ===================================================== */

    document
        .getElementById(
            "clearButton"
        )
        .addEventListener(
            "click",
            () => {

                if (
                    canvas.getObjects()
                        .length === 0
                ) {
                    return;
                }


                if (
                    !confirm(
                        "Effacer toutes les annotations et images ?"
                    )
                ) {
                    return;
                }


                hideArrowHandles();


                canvas.clear();


                canvas.backgroundColor =
                    "white";


                canvas.renderAll();


                saveHistory();

                updateEmptyMessage();

                updateStatus(
                    "Canvas effacé"
                );
            }
        );


