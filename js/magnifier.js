/* =====================================================
   LOUPE / MAGNIFIER
   Chaque loupe est composée de trois objets liés :
   - le rectangle source, redimensionnable et déplaçable ;
   - l'image agrandie, déplaçable et redimensionnable ;
   - le voile de liaison, purement décoratif.
===================================================== */

const magnifierRefreshTokens = new Map();
const magnifierRemoving = new Set();
const magnifierGeometrySyncing = new Set();
const magnifierSnapshotRefreshing = new Set();

function getMagnifierParts(id) {
    const objects = canvas.getObjects().filter(object => object.fuzeMagnifierId === id);
    return {
        source: objects.find(object => object.fuzeMagnifierRole === "source"),
        lens: objects.find(object => object.fuzeMagnifierRole === "lens"),
        connector: objects.find(object => object.fuzeMagnifierRole === "connector")
    };
}

function magnifierBounds(object) {
    const bounds = object.getBoundingRect();
    return {
        left: bounds.left,
        top: bounds.top,
        width: Math.max(1, bounds.width),
        height: Math.max(1, bounds.height)
    };
}

function captureMagnifierSource(source, id) {
    const bounds = magnifierBounds(source);
    const retina = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1;
    const displayScale = (typeof zoom === "number" ? zoom : 1) * retina;
    const outputWidth = Math.max(1, Math.round(bounds.width * displayScale));
    const outputHeight = Math.max(1, Math.round(bounds.height * displayScale));
    const output = document.createElement("canvas");
    output.width = outputWidth;
    output.height = outputHeight;
    const context = output.getContext("2d");
    const lower = canvas.lowerCanvasEl;

    if (!context || !lower) return null;

    // Exclure toute la loupe du rendu capturé. Désactiver aussi explicitement
    // les contrôles Fabric de l'objet actif : selon le cycle de rendu Fabric 6,
    // ils peuvent être redessinés lors du renderAll qui précède la capture.
    const related = canvas.getObjects().filter(object => object.fuzeMagnifierId === id);
    const visibility = related.map(object => object.visible);
    const activeObject = canvas.getActiveObject();
    const activeRenderState = activeObject ? {
        hasControls: activeObject.hasControls,
        hasBorders: activeObject.hasBorders
    } : null;
    const relatedRenderState = related.map(object => ({
        hasControls: object.hasControls,
        hasBorders: object.hasBorders
    }));

    try {
        related.forEach(object => {
            object.visible = false;
            object.set({ hasControls: false, hasBorders: false });
        });
        if (activeObject) {
            activeObject.set({ hasControls: false, hasBorders: false });
        }

        canvas.renderAll();

        // Lire uniquement le canvas de contenu (jamais l'upper canvas qui
        // contient les poignées). Les dimensions réelles tiennent compte du
        // zoom et du facteur Retina.
        const sx = Math.round(bounds.left * displayScale);
        const sy = Math.round(bounds.top * displayScale);
        const sourceLeft = Math.max(0, sx);
        const sourceTop = Math.max(0, sy);
        const sourceRight = Math.min(lower.width, sx + outputWidth);
        const sourceBottom = Math.min(lower.height, sy + outputHeight);

        if (sourceRight > sourceLeft && sourceBottom > sourceTop) {
            context.drawImage(
                lower,
                sourceLeft, sourceTop,
                sourceRight - sourceLeft, sourceBottom - sourceTop,
                sourceLeft - sx, sourceTop - sy,
                sourceRight - sourceLeft, sourceBottom - sourceTop
            );
        }
    } finally {
        related.forEach((object, index) => {
            object.visible = visibility[index];
            object.set({
                hasControls: relatedRenderState[index].hasControls,
                hasBorders: relatedRenderState[index].hasBorders
            });
        });
        if (activeObject && activeRenderState) {
            activeObject.set({
                hasControls: activeRenderState.hasControls,
                hasBorders: activeRenderState.hasBorders
            });
        }
        canvas.renderAll();
    }
    return output.toDataURL("image/png");
}

function buildMagnifierConnector(source, lens, id) {
    // Fabric renvoie les coins dans l'ordre : haut-gauche, haut-droite,
    // bas-droite, bas-gauche. On relie toujours les côtés qui se font face,
    // horizontalement OU verticalement selon la position réelle de la loupe.
    const sourceCorners = source.getCoords();
    const lensCorners = lens.getCoords();
    const sourceCenter = source.getCenterPoint();
    const lensCenter = lens.getCenterPoint();
    const dx = lensCenter.x - sourceCenter.x;
    const dy = lensCenter.y - sourceCenter.y;
    let points;

    if (Math.abs(dx) >= Math.abs(dy)) {
        // Loupe à droite ou à gauche de la zone source.
        points = dx >= 0
            ? [sourceCorners[1], lensCorners[0], lensCorners[3], sourceCorners[2]]
            : [sourceCorners[0], lensCorners[1], lensCorners[2], sourceCorners[3]];
    } else {
        // Loupe au-dessous ou au-dessus de la zone source.
        points = dy >= 0
            ? [sourceCorners[3], sourceCorners[2], lensCorners[1], lensCorners[0]]
            : [sourceCorners[0], sourceCorners[1], lensCorners[2], lensCorners[3]];
    }

    const oldConnector = canvas.getObjects().find(object =>
        object.fuzeMagnifierId === id && object.fuzeMagnifierRole === "connector"
    );
    const connector = new fabric.Polygon(
        points.map(point => ({ x: point.x, y: point.y })),
        {
            fill: "rgba(70, 115, 210, 0.18)",
            stroke: "rgba(45, 80, 155, 0.55)",
            strokeWidth: 1,
            strokeUniform: true,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            objectCaching: false,
            fuzeTool: "magnifier",
            fuzeMagnifierId: id,
            fuzeMagnifierRole: "connector"
        }
    );

    if (oldConnector) canvas.remove(oldConnector);
    const sourceIndex = canvas.getObjects().indexOf(source);
    const lensIndex = canvas.getObjects().indexOf(lens);
    const insertIndex = Math.max(0, Math.min(sourceIndex, lensIndex));
    canvas.insertAt(insertIndex, connector);
    return connector;
}

function syncMagnifierGeometry(id) {
    if (magnifierGeometrySyncing.has(id)) return;
    magnifierGeometrySyncing.add(id);
    try {
        const { source, lens } = getMagnifierParts(id);
        if (!source || !lens) return;
        source.setCoords();
        lens.setCoords();
        buildMagnifierConnector(source, lens, id);
        canvas.requestRenderAll();
    } finally {
        magnifierGeometrySyncing.delete(id);
    }
}

async function refreshMagnifierSnapshot(id) {
    // Une modification peut déclencher plusieurs événements Fabric rapprochés.
    // Une seule capture/actualisation par loupe est autorisée à la fois.
    if (magnifierSnapshotRefreshing.has(id)) return;
    const { source, lens } = getMagnifierParts(id);
    if (!source || !lens) return;

    magnifierSnapshotRefreshing.add(id);
    const token = (magnifierRefreshTokens.get(id) || 0) + 1;
    magnifierRefreshTokens.set(id, token);
    const desiredWidth = lens.getScaledWidth();
    const desiredHeight = lens.getScaledHeight();

    try {
        const dataUrl = captureMagnifierSource(source, id);
        if (!dataUrl) return;
        const replacementElement = await fabric.util.loadImage(dataUrl);
        if (magnifierRefreshTokens.get(id) !== token) return;
        const current = getMagnifierParts(id);
        if (!current.source || !current.lens) return;

        current.lens.setElement(replacementElement);
        current.lens.set({
            scaleX: desiredWidth / Math.max(1, replacementElement.width),
            scaleY: desiredHeight / Math.max(1, replacementElement.height),
            selectable: true,
            evented: true
        });
        current.lens.setCoords();
        syncMagnifierGeometry(id);
        // saveHistory est déjà appelé par le gestionnaire object:modified.
    } catch (error) {
        console.error("Fuze magnifier: impossible d'actualiser la zone source", error);
    } finally {
        magnifierSnapshotRefreshing.delete(id);
    }
}

async function finishMagnifierDrawing(rect) {
    const left = Math.min(rect.left, rect.left + rect.width);
    const top = Math.min(rect.top, rect.top + rect.height);
    const width = Math.abs(rect.width);
    const height = Math.abs(rect.height);
    if (width < 5 || height < 5) {
        canvas.requestRenderAll();
        return;
    }

    const id = `magnifier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const source = new fabric.Rect({
        left, top, width, height,
        originX: "left", originY: "top",
        fill: "rgba(70, 115, 210, 0.30)",
        stroke: "rgba(35, 65, 135, 0.95)",
        strokeWidth: 1,
        strokeUniform: true,
        objectCaching: false,
        selectable: true,
        evented: true,
        lockRotation: true,
        fuzeTool: "magnifier",
        fuzeMagnifierId: id,
        fuzeMagnifierRole: "source"
    });

    // Capturer le contenu du canvas avant d'ajouter les éléments de la loupe.
    source.setCoords();
    const capture = captureMagnifierSource(source, id);
    if (!capture) return;

    try {
        const element = await fabric.util.loadImage(capture);
        const lensWidth = Math.min(width * 2, CANVAS_WIDTH - 16);
        const lensHeight = Math.min(height * 2, CANVAS_HEIGHT - 16);
        const scale = Math.min(lensWidth / element.width, lensHeight / element.height);
        const actualWidth = element.width * scale;
        const actualHeight = element.height * scale;
        const gap = 24;
        let lensLeft = left + width + gap;
        if (lensLeft + actualWidth > CANVAS_WIDTH) {
            lensLeft = left - actualWidth - gap;
        }
        lensLeft = Math.max(0, Math.min(CANVAS_WIDTH - actualWidth, lensLeft));
        let lensTop = top + (height - actualHeight) / 2;
        lensTop = Math.max(0, Math.min(CANVAS_HEIGHT - actualHeight, lensTop));

        const lens = new fabric.Image(element, {
            left: lensLeft,
            top: lensTop,
            originX: "left",
            originY: "top",
            scaleX: scale,
            scaleY: scale,
            stroke: "rgba(35, 65, 135, 0.95)",
            strokeWidth: 1,
            strokeUniform: true,
            objectCaching: false,
            selectable: true,
            evented: true,
            lockRotation: true,
            fuzeTool: "magnifier",
            fuzeMagnifierId: id,
            fuzeMagnifierRole: "lens"
        });

        canvas.add(source, lens);
        buildMagnifierConnector(source, lens, id);
        source.setCoords();
        lens.setCoords();
        setTool("select");
        canvas.setActiveObject(source);
        canvas.requestRenderAll();
        saveHistory();
        updateEmptyMessage();
        updateStatus(FUZE_LANGUAGE === "en" ? "Magnifier created" : "Loupe créée");
        if (typeof trackEvent === "function") {
            trackEvent("element_created", { element_type: "magnifier" });
        }
    } catch (error) {
        console.error("Fuze magnifier: création impossible", error);
    }
}

// Les liaisons suivent les deux rectangles pendant les déplacements et les
// redimensionnements. La capture n'est recalculée qu'à la fin du geste source.
["object:moving", "object:scaling", "object:rotating"].forEach(eventName => {
    canvas.on(eventName, event => {
        const object = event.target;
        if (!object?.fuzeMagnifierId) return;
        syncMagnifierGeometry(object.fuzeMagnifierId);
    });
});

canvas.on("object:modified", event => {
    const object = event.target;
    if (!object?.fuzeMagnifierId) return;
    const id = object.fuzeMagnifierId;
    syncMagnifierGeometry(id);
    if (object.fuzeMagnifierRole === "source") {
        refreshMagnifierSnapshot(id);
    }
    saveHistory();
});

// Supprimer les autres composants si l'utilisateur supprime l'une des deux
// parties visibles : la loupe reste un seul élément logique.
canvas.on("object:removed", event => {
    const object = event.target;
    const id = object?.fuzeMagnifierId;
    if (!id || object.fuzeMagnifierRole === "connector" || magnifierRemoving.has(id)) return;
    magnifierRemoving.add(id);
    canvas.getObjects()
        .filter(item => item.fuzeMagnifierId === id)
        .forEach(item => canvas.remove(item));
    magnifierRemoving.delete(id);
    magnifierRefreshTokens.delete(id);
});
