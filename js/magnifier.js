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


function makeMagnifierOuterShadow() {
    return new fabric.Shadow({
        color: "rgba(0,0,0,0.48)",
        blur: 8,
        offsetX: 0,
        offsetY: 0
    });
}

function magnifierRgba(color, alpha) {
    const value = String(color || "#4673d2").trim();
    const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (match) {
        const hex = match[1].length === 3 ? match[1].split("").map(c => c + c).join("") : match[1];
        return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})`;
    }
    const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    return rgb ? `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})` : `rgba(70,115,210,${alpha})`;
}

function getMagnifierBorderParts(object) {
    if (!object?.fuzeMagnifierId) return {};
    const objects = canvas.getObjects().filter(item => item.fuzeMagnifierId === object.fuzeMagnifierId);
    return {
        // La bordure est désormais le stroke de l'objet lui-même.
        shadow: objects.find(item => item.fuzeMagnifierRole === `${object.fuzeMagnifierRole}-shadow`)
    };
}

function getMagnifierCornerRadius(object) {
    if (!object) return 0;
    // Le rayon est exprimé dans le repère du canvas, comme le rectangle de cadre.
    // Pour la lentille, le rayon du clipPath est multiplié par l'échelle de l'image.
    const scaleX = Math.abs(Number(object.scaleX) || 1);
    const scaleY = Math.abs(Number(object.scaleY) || 1);
    const clip = object.fuzeMagnifierRole === "lens" ? object.clipPath : null;
    const localRadius = clip
        ? Math.min(Number(clip.rx) || 0, Number(clip.ry) || 0)
        : Math.min(Number(object.rx) || 0, Number(object.ry) || 0);
    const radius = localRadius * Math.min(scaleX, scaleY);
    const bounds = object.getBoundingRect();
    return Math.max(0, Math.min(radius, bounds.width / 2, bounds.height / 2));
}

function syncMagnifierBorder(object) {
    if (!object || !["source", "lens"].includes(object.fuzeMagnifierRole)) return;
    const { shadow } = getMagnifierBorderParts(object);
    if (!shadow) return;
    const bounds = object.getBoundingRect();
    const frameWidth = object.fuzeMagnifierBorderEnabled === false
        ? 1
        : Math.max(1, Number(object.fuzeMagnifierBorderWidth) || 1);
    const radius = getMagnifierCornerRadius(object);
    const frameColor = magnifierRgba(
        object.fuzeMagnifierBorderColor || "#4673d2",
        object.fuzeMagnifierBorderEnabled === false ? 0.85 : (object.fuzeMagnifierBorderOpacity ?? 1)
    );
    // Un contour transparent (et non un rectangle plein) évite que le cadre
    // puisse masquer l'image de la lentille lorsque Fabric recalcule son clipPath.
    // Le rayon reprend exactement celui de la forme réellement affichée.
    shadow.set({
        left: bounds.left, top: bounds.top,
        width: bounds.width, height: bounds.height,
        rx: radius, ry: radius,
        originX: "left", originY: "top",
        fill: "rgba(0,0,0,0)",
        stroke: frameColor, strokeWidth: frameWidth,
        strokeUniform: true,
        shadow: makeMagnifierOuterShadow(), visible: true
    });
    // Le contour est dessiné au-dessus de l'image, mais son centre reste transparent.
    const objectIndex = canvas.getObjects().indexOf(object);
    if (objectIndex >= 0) canvas.moveObjectTo(shadow, objectIndex + 1);
    shadow.setCoords();
}

function setMagnifierBorderStyle(object, color, width, opacity) {
    if (!object || !["source", "lens"].includes(object.fuzeMagnifierRole)) return;
    object.fuzeMagnifierBorderColor = color || object.fuzeMagnifierBorderColor || "#4673d2";
    object.fuzeMagnifierBorderWidth = Number.isFinite(Number(width)) ? Math.max(1, Number(width)) : (object.fuzeMagnifierBorderWidth || 1);
    object.fuzeMagnifierBorderOpacity = Number.isFinite(Number(opacity)) ? Number(opacity) : (object.fuzeMagnifierBorderOpacity ?? 1);
    const style = {
        stroke: object.fuzeMagnifierBorderEnabled === false
            ? (object.fuzeMagnifierRole === "lens" ? magnifierRgba(object.fuzeMagnifierBorderColor, object.fuzeMagnifierBorderOpacity ?? 0.85) : null)
            : magnifierRgba(object.fuzeMagnifierBorderColor, object.fuzeMagnifierBorderOpacity),
        // La lentille est une fabric.Image : son stroke natif doit rester à 0.
        // Le cadre arrondi séparé porte seul la bordure, sinon Fabric inclut
        // strokeWidth dans ses dimensions et la lentille grandit à chaque refresh.
        strokeWidth: object.fuzeMagnifierRole === "lens" ? 0 : (
            object.fuzeMagnifierBorderEnabled === false ? 0 : object.fuzeMagnifierBorderWidth
        ),
        strokeUniform: true,
        objectCaching: false
    };
    if (object.fuzeMagnifierRole === "source") style.fill = magnifierRgba(object.fuzeMagnifierBorderColor, 0.16);
    // Le contour arrondi de la lentille est dessiné par son cadre dédié afin
    // d'éviter le stroke rectangulaire natif de fabric.Image.
    if (object.fuzeMagnifierRole === "lens") style.stroke = null;
    object.set(style);
    object.setCoords();
    const { shadow } = getMagnifierBorderParts(object);
    if (shadow) {
        syncMagnifierBorder(object);
    }
    const { lens, connector } = getMagnifierParts(object.fuzeMagnifierId);
    if (lens && connector) {
        const c = magnifierRgba(lens.fuzeMagnifierBorderColor || "#4673d2", (lens.fuzeMagnifierBorderOpacity ?? 1) * 0.30);
        connector.set({ fill: c, stroke: c });
    }
    canvas.requestRenderAll();
}

function toggleMagnifierBorder(object) {
    if (!object || !["source", "lens"].includes(object.fuzeMagnifierRole)) return false;
    object.fuzeMagnifierBorderEnabled = object.fuzeMagnifierBorderEnabled !== true;
    const enabling = object.fuzeMagnifierBorderEnabled;
    // À l'activation, reprendre systématiquement les réglages courants du bandeau.
    // À la désactivation de la lentille, conserver un filet discret de 1 px pour
    // que la zone agrandie reste toujours visuellement délimitée.
    const color = enabling ? getColor() : (object.fuzeMagnifierBorderColor || "#4673d2");
    const width = enabling ? getStrokeWidth() : 1;
    const opacity = enabling ? getStrokeOpacity() : 0.85;
    setMagnifierBorderStyle(object, color, width, opacity);
    return true;
}

function restoreMagnifierDecorations() {
    if (!canvas) return;
    const all = canvas.getObjects();
    all.forEach(object => {
        if (!object.fuzeMagnifierId) return;
        const role = String(object.fuzeMagnifierRole || "");
        if (role.endsWith("-border")) {
            // Migration : rapatrier l'ancien rectangle de bordure sur l'objet.
            const baseRole = role.slice(0, -7);
            const base = all.find(item => item.fuzeMagnifierId === object.fuzeMagnifierId && item.fuzeMagnifierRole === baseRole);
            if (base) {
                base.fuzeMagnifierBorderEnabled = object.visible !== false;
                base.fuzeMagnifierBorderColor = base.fuzeMagnifierBorderColor || object.stroke || "#4673d2";
                base.fuzeMagnifierBorderWidth = base.fuzeMagnifierBorderWidth || object.strokeWidth || 1;
                base.fuzeMagnifierBorderOpacity = base.fuzeMagnifierBorderOpacity ?? object.opacity ?? 1;
                base.set({ stroke: base.fuzeMagnifierBorderEnabled ? magnifierRgba(base.fuzeMagnifierBorderColor, base.fuzeMagnifierBorderOpacity) : null,
                    strokeWidth: base.fuzeMagnifierBorderEnabled ? base.fuzeMagnifierBorderWidth : 0, strokeUniform: true });
            }
            canvas.remove(object);
        } else if (role.endsWith("-shadow")) {
            object.set({
                selectable: false, evented: false, hasControls: false, hasBorders: false,
                hoverCursor: "default", shadow: makeMagnifierOuterShadow()
            });
        }
    });

    const bases = canvas.getObjects().filter(object => object.fuzeMagnifierId && ["source", "lens"].includes(object.fuzeMagnifierRole));
    bases.forEach(object => {
        object.fuzeMagnifierBorderColor = object.fuzeMagnifierBorderColor || "#4673d2";
        object.fuzeMagnifierBorderWidth = Number(object.fuzeMagnifierBorderWidth || 1) || 1;
        object.fuzeMagnifierBorderOpacity = object.fuzeMagnifierBorderOpacity ?? 1;
        if (typeof object.fuzeMagnifierBorderEnabled !== "boolean") object.fuzeMagnifierBorderEnabled = object.fuzeMagnifierRole === "lens";
        object.set({
            stroke: object.fuzeMagnifierRole === "lens" ? null : (object.fuzeMagnifierBorderEnabled ? magnifierRgba(object.fuzeMagnifierBorderColor, object.fuzeMagnifierBorderOpacity) : null),
            strokeWidth: object.fuzeMagnifierRole === "lens" ? 0 : (object.fuzeMagnifierBorderEnabled ? object.fuzeMagnifierBorderWidth : 0),
            strokeUniform: true, objectCaching: false, selectable: currentTool === "select", evented: true,
            perPixelTargetFind: false
        });
        object.setCoords();
        const { shadow } = getMagnifierBorderParts(object);
        if (shadow && object.fuzeMagnifierRole === "lens") {
            syncMagnifierBorder(object);
        }
    });
    canvas.requestRenderAll();
}

function createMagnifierBorder(object, role, enabled, withShadow = false) {
    // La bordure est intégrée au rectangle / à l'image : aucun objet distinct.
    object.fuzeMagnifierBorderEnabled = !!enabled;
    object.set({
        stroke: enabled ? magnifierRgba(object.fuzeMagnifierBorderColor || "#4673d2", object.fuzeMagnifierBorderOpacity ?? 1) : null,
        strokeWidth: role === "lens" ? 0 : (enabled ? (object.fuzeMagnifierBorderWidth || 1) : 0),
        strokeUniform: true
    });
    if (withShadow) {
        const bounds = object.getBoundingRect();
        const radius = getMagnifierCornerRadius(object);
        const frameWidth = object.fuzeMagnifierBorderEnabled === false ? 1 : Math.max(1, Number(object.fuzeMagnifierBorderWidth) || 1);
        const shadow = new fabric.Rect({
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height,
            originX: "left", originY: "top",
            rx: radius,
            ry: radius,
            fill: "rgba(0,0,0,0)",
            stroke: magnifierRgba(object.fuzeMagnifierBorderColor || "#4673d2", object.fuzeMagnifierBorderEnabled === false ? 0.85 : (object.fuzeMagnifierBorderOpacity ?? 1)),
            strokeWidth: frameWidth,
            strokeUniform: true,
            shadow: makeMagnifierOuterShadow(),
            selectable: false, evented: false, hasControls: false, hasBorders: false,
            objectCaching: false, fuzeMagnifierId: object.fuzeMagnifierId,
            fuzeMagnifierRole: `${role}-shadow`
        });
        canvas.add(shadow);
        // Le contour transparent reste au-dessus de l'image sans la recouvrir.
        canvas.moveObjectTo(shadow, canvas.getObjects().indexOf(object) + 1);
    }
}

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
            fill: (() => { const { lens } = getMagnifierParts(id); return magnifierRgba(lens?.fuzeMagnifierBorderColor || "#4673d2", (lens?.fuzeMagnifierBorderOpacity ?? 1) * 0.30); })(),
            stroke: "rgba(0,0,0,0)",
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
        syncMagnifierBorder(source);
        syncMagnifierBorder(lens);
        canvas.requestRenderAll();
    } finally {
        magnifierGeometrySyncing.delete(id);
    }
}

async function refreshMagnifierSnapshot(id) {
    // Un seul rafraîchissement par loupe. Toute nouvelle modification
    // invalide la capture en cours ; le worker recommence avec la géométrie
    // la plus récente (déplacement ET redimensionnement).
    const token = (magnifierRefreshTokens.get(id) || 0) + 1;
    magnifierRefreshTokens.set(id, token);
    if (magnifierSnapshotRefreshing.has(id)) return;

    magnifierSnapshotRefreshing.add(id);
    try {
        while (true) {
            const currentToken = magnifierRefreshTokens.get(id);
            const { source, lens } = getMagnifierParts(id);
            if (!source || !lens) return;

            source.setCoords();
            const captureBounds = magnifierBounds(source);
            const dataUrl = captureMagnifierSource(source, id);
            if (!dataUrl) return;

            const replacementElement = await fabric.util.loadImage(dataUrl);

            // Ne jamais appliquer une capture si la source a changé pendant
            // le chargement de son image.
            if (magnifierRefreshTokens.get(id) !== currentToken) continue;

            const latest = getMagnifierParts(id);
            if (!latest.source || !latest.lens) return;

            latest.source.setCoords();
            const latestBounds = magnifierBounds(latest.source);
            // Sécurité supplémentaire : si la géométrie a changé sans que
            // l'événement ait incrémenté le jeton, refaire une capture.
            if (Math.abs(latestBounds.left - captureBounds.left) > 0.01 ||
                Math.abs(latestBounds.top - captureBounds.top) > 0.01 ||
                Math.abs(latestBounds.width - captureBounds.width) > 0.01 ||
                Math.abs(latestBounds.height - captureBounds.height) > 0.01) {
                magnifierRefreshTokens.set(id, currentToken + 1);
                continue;
            }

            const targetLens = latest.lens;
            const oldCenter = targetLens.getCenterPoint();
            const magnification = Math.max(1, Number(latest.source.fuzeMagnifierScale) || 2);
            const maxWidth = Math.max(1, CANVAS_WIDTH - 16);
            const maxHeight = Math.max(1, CANVAS_HEIGHT - 16);
            const targetWidth = Math.min(latestBounds.width * magnification, maxWidth);
            const targetHeight = Math.min(latestBounds.height * magnification, maxHeight);
            const scale = Math.min(
                targetWidth / Math.max(1, replacementElement.width),
                targetHeight / Math.max(1, replacementElement.height)
            );
            const actualWidth = replacementElement.width * scale;
            const actualHeight = replacementElement.height * scale;

            targetLens.setElement(replacementElement);
            targetLens.set({
                originX: "left",
                originY: "top",
                scaleX: scale,
                scaleY: scale,
                left: oldCenter.x - actualWidth / 2,
                top: oldCenter.y - actualHeight / 2,
                clipPath: new fabric.Rect({
                    width: replacementElement.width,
                    height: replacementElement.height,
                    rx: Math.min(12 / scale, replacementElement.width / 2, replacementElement.height / 2),
                    ry: Math.min(12 / scale, replacementElement.width / 2, replacementElement.height / 2),
                    originX: "center",
                    originY: "center"
                }),
                selectable: true,
                evented: true,
                objectCaching: false
            });

            // Garder la lentille dans le canvas après un agrandissement.
            const finalLeft = Math.max(0, Math.min(CANVAS_WIDTH - actualWidth, targetLens.left));
            const finalTop = Math.max(0, Math.min(CANVAS_HEIGHT - actualHeight, targetLens.top));
            targetLens.set({ left: finalLeft, top: finalTop });
            targetLens.setCoords();
            syncMagnifierGeometry(id);

            if (magnifierRefreshTokens.get(id) === currentToken) break;
        }
    } catch (error) {
        console.error("Fuze magnifier: impossible d'actualiser la zone source", error);
    } finally {
        magnifierSnapshotRefreshing.delete(id);
        // Une modification peut arriver juste au moment où le worker se
        // termine. Ne pas laisser cette dernière demande sans traitement.
        const completedToken = magnifierRefreshTokens.get(id);
        if (completedToken !== undefined && !magnifierRemoving.has(id)) {
            const { source, lens } = getMagnifierParts(id);
            if (source && lens && source.__fuzeMagnifierLastRefreshToken !== completedToken) {
                source.__fuzeMagnifierLastRefreshToken = completedToken;
            }
        }
    }
}

async function finishMagnifierDrawing(rect, style = {}) {
    const color = style.color || getColor();
    const strokeWidth = Number(style.width) || 1;
    const opacity = Number.isFinite(Number(style.opacity)) ? Number(style.opacity) : 1;
    const left = Math.min(rect.left, rect.left + rect.width);
    const top = Math.min(rect.top, rect.top + rect.height);
    const width = Math.abs(rect.width);
    const height = Math.abs(rect.height);
    if (width < 5 || height < 5) {
        canvas.requestRenderAll();
        return;
    }

    const id = `magnifier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sourceRadius = Math.min(12, width / 2, height / 2);
    const source = new fabric.Rect({
        left, top, width, height,
        rx: sourceRadius, ry: sourceRadius,
        originX: "left", originY: "top",
        fill: magnifierRgba(color, 0.16),
        stroke: null,
        strokeWidth: 0,
        strokeUniform: true,
        objectCaching: false,
        selectable: true,
        evented: true,
        perPixelTargetFind: false,
        lockRotation: true,
        fuzeTool: "magnifier",
        fuzeMagnifierId: id,
        fuzeMagnifierRole: "source",
        fuzeMagnifierBorderEnabled: false,
        fuzeMagnifierBorderColor: color,
        fuzeMagnifierBorderWidth: strokeWidth,
        fuzeMagnifierBorderOpacity: opacity
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
            // Le masque arrondi découpe réellement l'image de la lentille.
            clipPath: new fabric.Rect({
                width: element.width,
                height: element.height,
                rx: Math.min(12 / scale, element.width / 2, element.height / 2),
                ry: Math.min(12 / scale, element.width / 2, element.height / 2),
                originX: "center",
                originY: "center"
            }),
            stroke: null,
            strokeWidth: 0,
            strokeUniform: true,
            objectCaching: false,
            selectable: true,
            evented: true,
            perPixelTargetFind: false,
            lockRotation: true,
            fuzeTool: "magnifier",
            fuzeMagnifierId: id,
            fuzeMagnifierRole: "lens",
            fuzeMagnifierBorderEnabled: true,
            fuzeMagnifierBorderColor: color,
            fuzeMagnifierBorderWidth: strokeWidth,
            fuzeMagnifierBorderOpacity: opacity
        });

        canvas.add(source, lens);
        createMagnifierBorder(source, "source", false, false);
        createMagnifierBorder(lens, "lens", true, true);
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
