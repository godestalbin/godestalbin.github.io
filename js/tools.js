
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
            !object.fuzeMagnifierId && (
            isEditableArrow(object) ||
            object.type === "rect" ||
            object.type === "ellipse" ||
            object.type === "path")
        );
    }

    function getObjectThickness(object) {
        if (isEditableArrow(object) || object.arrowType === "curved") return Number(object.arrowStrokeWidth ?? object.strokeWidth);
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

    function getHighlightFillColor(color = getColor(), alpha = 0.30) {
        const value = String(color || "#ffd21e").trim();
        let r, g, b;
        const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hex) {
            const h = hex[1].length === 3 ? hex[1].split("").map(c => c + c).join("") : hex[1];
            r = parseInt(h.slice(0, 2), 16);
            g = parseInt(h.slice(2, 4), 16);
            b = parseInt(h.slice(4, 6), 16);
        } else {
            const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
            if (rgb) [, r, g, b] = rgb.map(Number);
            else return `rgba(255,210,30,${alpha})`;
        }
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function makeOuterShapeShadow() {
        return new fabric.Shadow({
            color: "rgba(0,0,0,0.48)",
            blur: 8,
            offsetX: 0,
            offsetY: 0
        });
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
        if (!image) {
            updateStatus("Sélectionnez une image ou une boîte de zoom");
            return;
        }

        // Les deux éléments d'une loupe (zone source et zone grossie)
        // possèdent chacun leur bordure, activable indépendamment.
        if (image.fuzeMagnifierId && ["source", "lens"].includes(image.fuzeMagnifierRole)) {
            if (typeof toggleMagnifierBorder === "function" && toggleMagnifierBorder(image)) {
                saveHistory();
                updateStatus(image.fuzeMagnifierBorderEnabled ? "Bordure ajoutée" : "Bordure supprimée");
            }
            return;
        }

        if (image.type !== "image") {
            updateStatus("Sélectionnez une image ou une boîte de zoom");
            return;
        }

        // Reuse an existing border instead of creating duplicates.
        if (image.fuzeBorderId) {
            const existingBorder = canvas.getObjects().find(obj => obj.fuzeBorderOwnerId === image.fuzeBorderId);
            if (existingBorder) {
                canvas.remove(existingBorder);
                const existingShadow = canvas.getObjects().find(obj => obj.fuzeBorderShadowOwnerId === image.fuzeBorderId);
                if (existingShadow) canvas.remove(existingShadow);
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

        // Support opaque légèrement plus grand que l'image. L'image masque
        // son centre ; le support restant forme la bordure sombre et son ombre
        // est visible à l'extérieur, sur les quatre côtés.
        const shadowBacking = new fabric.Rect({
            left: bounds.left - strokeWidth,
            top: bounds.top - strokeWidth,
            width: Math.max(1, bounds.width + strokeWidth * 2),
            height: Math.max(1, bounds.height + strokeWidth * 2),
            // Arrondir le support comme le contour, avec un rayon légèrement
            // supérieur pour tenir compte de son débord extérieur.
            rx: Math.min(14, Math.max(4, Math.min(bounds.width, bounds.height) * 0.04)) + strokeWidth,
            ry: Math.min(14, Math.max(4, Math.min(bounds.width, bounds.height) * 0.04)) + strokeWidth,
            fill: "#000000",
            stroke: null,
            strokeWidth: 0,
            shadow: makeOuterShapeShadow(),
            selectable: false,
            evented: false,
            objectCaching: false,
            fuzeBorderShadowOwnerId: id
        });
        canvas.add(shadowBacking);

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
            // L'ombre est portée par le support opaque placé derrière l'image.
            selectable: false,
            evented: false,
            objectCaching: false,
            fuzeTool: "border",
            fuzeBorderOwnerId: id
        });
        canvas.add(border);
        // Keep the border immediately above its image so the outline is
        // rendered over the image corners without changing the stacking of
        // unrelated canvas objects.
        const objects = canvas.getObjects();
        const imageIndex = objects.indexOf(image);

        if (imageIndex !== -1) {
            canvas.moveObjectTo(shadowBacking, imageIndex);
            canvas.moveObjectTo(border, canvas.getObjects().indexOf(image) + 1);
        }
        // Reassert these flags after insertion/reordering: the image remains
        // the only interactive object in the image + border pair.
        border.set({ selectable: false, evented: false, hoverCursor: "default" });
        border.setCoords();
        canvas.setActiveObject(image);
        canvas.requestRenderAll();
        saveHistory();
        updateStatus("Bordure ajoutée");
    }

    function syncImageBorder(image) {
        if (!image || image.type !== "image" || !image.fuzeBorderId) return;
        const border = canvas.getObjects().find(obj => obj.fuzeBorderOwnerId === image.fuzeBorderId);
        const shadowBacking = canvas.getObjects().find(obj => obj.fuzeBorderShadowOwnerId === image.fuzeBorderId);
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
        if (shadowBacking) {
            shadowBacking.set({
                // Conserver une marge identique sur les quatre côtés.
                left: bounds.left - width,
                top: bounds.top - width,
                width: Math.max(1, bounds.width + width * 2),
                height: Math.max(1, bounds.height + width * 2),
                // Le support opaque doit avoir des angles arrondis pour ne pas
                // laisser apparaître de coins noirs hors de la bordure.
                rx: radius + width,
                ry: radius + width
            });
            shadowBacking.setCoords();
        }
    }

    // Restaure les rôles non interactifs des éléments décoratifs de bordure.
    // Fabric n'enregistre pas selectable/evented dans toObject(): après un
    // rechargement, la bordure et son support d'ombre redeviendraient déplaçables.
    // Les anciens fichiers .fuze n'ont pas fuzeBorderShadowOwnerId : on retrouve
    // alors le support noir par sa position, sa taille, son ombre et son ordre.
    function restoreFuzeBorderObjects() {
        const objects = canvas.getObjects();
        const images = objects.filter(object =>
            object.type === "image" && object.fuzeBorderId
        );

        images.forEach(image => {
            const id = image.fuzeBorderId;
            const border = objects.find(object =>
                object.fuzeBorderOwnerId === id
            );
            if (!border) return;

            border.set({
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false,
                hoverCursor: "default"
            });
            border.setCoords();

            let backing = objects.find(object =>
                object.fuzeBorderShadowOwnerId === id
            );

            // Compatibilité avec les fichiers enregistrés avant la sauvegarde
            // de fuzeBorderShadowOwnerId.
            if (!backing) {
                const borderIndex = objects.indexOf(border);
                const imageIndex = objects.indexOf(image);
                const borderBounds = border.getBoundingRect();
                const candidates = objects.filter((object, index) => {
                    if (index >= imageIndex || index >= borderIndex) return false;
                    if (object === image || object === border || object.type !== "rect") return false;
                    if (!object.shadow || String(object.fill).toLowerCase() !== "#000000") return false;
                    return Math.abs(object.left - border.left) < 1.5 &&
                        Math.abs(object.top - border.top) < 1.5 &&
                        Number(object.width) >= Number(border.width) + 2 &&
                        Number(object.height) >= Number(border.height) + 2;
                });
                candidates.sort((a, b) =>
                    (Number(a.width) * Number(a.height)) -
                    (Number(b.width) * Number(b.height))
                );
                backing = candidates[0] || null;
            }

            if (backing) {
                backing.fuzeBorderShadowOwnerId = id;
                backing.set({
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false,
                    hoverCursor: "default"
                });
                backing.setCoords();
            }
        });
    }

    function updateImageBorderStyle(image, color = getColor(), width = getStrokeWidth()) {
        if (!image || image.type !== "image" || !image.fuzeBorderId) return;
        const border = canvas.getObjects().find(obj => obj.fuzeBorderOwnerId === image.fuzeBorderId);
        if (!border) return;
        border.set({ stroke: color, strokeWidth: width, opacity: getStrokeOpacity() });
        syncImageBorder(image);
    }

    /* =====================================================
       TAMPON / STAMP
    ===================================================== */

    let stampText = "";
    const stampModal = document.getElementById("stampModal");
    const stampForm = document.getElementById("stampForm");
    const stampTextInput = document.getElementById("stampTextInput");

    function closeStampDialog(cancelled = false) {
        if (stampModal) stampModal.hidden = true;
        document.body.classList.remove("stamp-modal-open");
        if (cancelled) setTool("select");
    }

    function openStampDialog() {
        if (!stampModal || !stampTextInput) return;
        stampTextInput.value = stampText;
        stampModal.hidden = false;
        document.body.classList.add("stamp-modal-open");
        requestAnimationFrame(() => { stampTextInput.focus(); stampTextInput.select(); });
    }

    stampForm?.addEventListener("submit", event => {
        event.preventDefault();
        const value = stampTextInput.value.trim();
        if (!value) { stampTextInput.focus(); return; }
        stampText = value.toLocaleUpperCase();
        closeStampDialog(false);
        updateStatus(FUZE_LANGUAGE === "en" ? "Stamp: click on the canvas to place it" : "Tampon : cliquez sur le canvas pour le déposer");
        canvas.upperCanvasEl.style.cursor = "crosshair";
    });

    // Ctrl+Enter validates the stamp text without requiring a click on the button.
    stampTextInput?.addEventListener("keydown", event => {
        if (event.key !== "Enter" || !event.ctrlKey || event.altKey || event.metaKey) return;
        event.preventDefault();
        event.stopPropagation();
        stampForm?.requestSubmit();
    });

    document.getElementById("closeStampButton")?.addEventListener("click", () => closeStampDialog(true));
    document.getElementById("cancelStampButton")?.addEventListener("click", () => closeStampDialog(true));
    stampModal?.addEventListener("click", event => { if (event.target === stampModal) closeStampDialog(true); });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && stampModal && !stampModal.hidden) {
            event.preventDefault();
            closeStampDialog(true);
        }
    });

    function createStampSvg(text, color, fontSize, strokeWidth) {
        const measureCanvas = document.createElement("canvas");
        const measureContext = measureCanvas.getContext("2d");
        measureContext.font = `${fontSize}px Impact, Haettenschweiler, "Arial Narrow", sans-serif`;
        const lines = String(text).split(/\r?\n/).filter(Boolean);
        const lineHeight = fontSize * 0.92;
        const textWidth = Math.max(1, ...lines.map(line => measureContext.measureText(line).width));
        // STAMP LAYOUT PARAMETERS (all values are relative to the SVG's source pixels).
        // Change these two values to adjust the fixed clear space between text and frame.
        // They deliberately do NOT depend on strokeWidth.
        const textFrameGapX = fontSize * 0.16;
        const textFrameGapY = fontSize * 0.12;

        // The frame grows outwards when its stroke gets thicker, so its INNER edge
        // stays at exactly the same distance from the text.
        const width = Math.ceil(textWidth + 2 * (textFrameGapX + strokeWidth));
        const height = Math.ceil(lines.length * lineHeight + 2 * (textFrameGapY + strokeWidth));
        const inset = strokeWidth / 2;
        const radius = Math.max(7, Math.min(fontSize * 0.2, height * 0.18));
        const frame = `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${radius}" ry="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        // Center the *visible glyph bounds*, not the font's nominal em box.
        // A fixed baseline offset (fontSize * 0.34) leaves progressively more
        // empty space below the text as the font grows. Canvas text metrics give
        // us the actual ascent/descent for the selected font at this size.
        const textMetrics = measureContext.measureText(lines[0] || "M");
        const ascent = Number.isFinite(textMetrics.actualBoundingBoxAscent)
            ? textMetrics.actualBoundingBoxAscent
            : fontSize * 0.78;
        const descent = Number.isFinite(textMetrics.actualBoundingBoxDescent)
            ? textMetrics.actualBoundingBoxDescent
            : fontSize * 0.18;
        const visibleTextBlockHeight = ascent + descent + (lines.length - 1) * lineHeight;
        const firstBaseline = (height - visibleTextBlockHeight) / 2 + ascent;
        const textMarkup = lines.map((line, index) =>
            `<text x="${width / 2}" y="${firstBaseline + index * lineHeight}" text-anchor="middle" font-family="Impact, Haettenschweiler, Arial Narrow, sans-serif" font-size="${fontSize}" font-weight="400" letter-spacing="0.5" fill="${color}">${escapeStampXml(line)}</text>`
        ).join("");

        // Deterministic irregular ink voids: the same stamp remains visually stable
        // when its color, size or border thickness is edited.
        let seed = Array.from(text).reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const holes = [];

        // STAMP GRAIN PARAMETERS — safe to adjust without changing the algorithm.
        // Higher holesPerArea = more numerous ink voids (denser worn texture).
        // Smaller radius values = finer grain. Values are in SVG source pixels.
        const grain = {
            holesPerArea: 1 / 10,  // previous version: approximately 1 / 210
            minimumHoles: 120,
            maximumHoles: 12000,
            minRadiusX: 0.01,
            maxRadiusX: 1.82,
            minRadiusY: 0.01,
            maxRadiusY: 1.70,
            irregularity: 0.99
        };
        const count = Math.min(grain.maximumHoles, Math.max(
            grain.minimumHoles,
            Math.round(width * height * grain.holesPerArea)
        ));
        for (let i = 0; i < count; i++) {
            const radiusX = grain.minRadiusX + random() * (grain.maxRadiusX - grain.minRadiusX);
            const radiusY = grain.minRadiusY + random() * (grain.maxRadiusY - grain.minRadiusY);
            const cx = 3 + random() * (width - 6);
            const cy = 3 + random() * (height - 6);
            const vertices = 5 + Math.floor(random() * 5);
            const points = [];
            for (let point = 0; point < vertices; point++) {
                const angle = (Math.PI * 2 * point / vertices) + (random() - 0.5) * grain.irregularity;
                const roughness = 0.55 + random() * 0.65;
                points.push([
                    (cx + Math.cos(angle) * radiusX * roughness).toFixed(2),
                    (cy + Math.sin(angle) * radiusY * roughness).toFixed(2)
                ]);
            }
            const path = points.map((point, index) => `${index ? "L" : "M"}${point[0]} ${point[1]}`).join(" ") + " Z";
            holes.push(`<path d="${path}" fill="black"/>`);
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="inkMask"><rect width="100%" height="100%" fill="white"/>${holes.join("")}</mask></defs><g mask="url(#inkMask)">${frame}${textMarkup}</g></svg>`;
        return { svg, width, height };
    }

    function escapeStampXml(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
        })[char]);
    }

    async function createStampObject(text, x, y, style = {}) {
        const color = style.color || getColor();
        const fontSize = Number(style.fontSize || getFontSize());
        const strokeWidth = Number(style.strokeWidth || getStrokeWidth());
        const opacity = Number(style.opacity ?? getStrokeOpacity());
        const { svg, width, height } = createStampSvg(text, color, fontSize, strokeWidth);
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const image = await fabric.Image.fromURL(dataUrl);
        image.set({
            left: x, top: y, originX: "center", originY: "center",
            opacity, selectable: true, evented: true, objectCaching: false
        });
        image.fuzeTool = "stamp";
        image.stampText = text;
        image.stampFontSize = fontSize;
        image.stampStrokeWidth = strokeWidth;
        image.stampColor = color;
        image.stampWidth = width;
        image.stampHeight = height;
        return image;
    }

    async function addStampAt(event) {
        if (!stampText) { openStampDialog(); return; }
        const pointer = canvas.getScenePoint(event);
        const stamp = await createStampObject(stampText, pointer.x, pointer.y);
        canvas.add(stamp);
        canvas.setActiveObject(stamp);
        canvas.requestRenderAll();
        saveHistory();
        trackEvent("element_created", { element_type: "stamp" });
    }

    async function updateStampObject(object, changes = {}) {
        const style = {
            color: changes.color ?? object.stampColor,
            fontSize: changes.fontSize ?? object.stampFontSize,
            strokeWidth: changes.strokeWidth ?? object.stampStrokeWidth,
            opacity: changes.opacity ?? object.opacity
        };
        const replacement = await createStampObject(object.stampText, object.left, object.top, style);
        replacement.set({
            angle: object.angle,
            scaleX: object.scaleX,
            scaleY: object.scaleY,
            flipX: object.flipX,
            flipY: object.flipY
        });
        const index = canvas.getObjects().indexOf(object);
        if (index < 0) return;
        canvas.remove(object);
        canvas.insertAt(index, replacement);
        canvas.setActiveObject(replacement);
        replacement.setCoords();
        canvas.requestRenderAll();
        syncControlsFromSelectedObject();
        saveHistory();
    }


    // Curseurs personnalisés des outils. Le hotspot des deux curseurs de
    // flèche reste fixé à (6, 6), au centre de la croix dessinée dans l'image.
    const ARROW_TOOL_CURSORS = {
        simpleArrow: 'url("./cursors/tool%20normal%20arrow.png") 6 6, crosshair',
        curvedArrow: 'url("./cursors/tool%20curve%20arrow.png") 6 6, crosshair',
        arrow: 'url("./cursors/tool%20smart%20arrow.png") 6 6, crosshair'
    };

    const TOOL_CURSORS = {
        select: 'url("./cursors/select.png") 1 2, default',
        text: 'url("./cursors/tool%20text.png") 10 44, text',
        number: 'url("./cursors/tool%20number.png") 6 6, crosshair',
        stamp: 'url("./cursors/tool%20stamp.png") 6 6, crosshair',
        rectangle: 'url("./cursors/tool%20rectangle.png") 6 6, crosshair',
        circle: 'url("./cursors/tool%20circle.png") 6 6, crosshair',
        felt: 'url("./cursors/tool%20felt.png") 6 6, crosshair',
        highlight: 'url("./cursors/tool%20hightlight.png") 6 6, crosshair',
        blur: 'url("./cursors/tool%20blur.png") 6 6, crosshair',
        magnifier: 'url("./cursors/tool%20zoom.png") 6 6, crosshair'
    };
    const DEFAULT_TOOL_CURSOR = 'url("./cursors/tool%20default.png") 6 6, crosshair';
    const MOVE_CURSOR = 'url("./cursors/move.png") 23 23, default';

    // Pour les flèches, calcule le point de scène à partir de la même
    // origine écran que celle utilisée par positionArrowHandles().
    // Cela garantit que le point d'ancrage (et donc la poignée) tombe
    // exactement sous le hotspot CSS du curseur, fixé à (6, 6).
    // On limite cette conversion aux flèches : les autres outils et le
    // déplacement des poignées conservent leur comportement existant.
    function getArrowScenePointFromPointer(event) {
        const rect = canvas.upperCanvasEl.getBoundingClientRect();
        const viewportPoint = new fabric.Point(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
        const inverseViewport = fabric.util.invertTransform(canvas.viewportTransform);
        return fabric.util.transformPoint(viewportPoint, inverseViewport);
    }
    let objectMoveCursorActive = false;
    let objectMoveCursorFrame = 0;

    // Fabric peut réappliquer son hoverCursor après avoir émis mouse:down ou
    // mouse:move. Réappliquer notre curseur à la frame suivante garantit que
    // le curseur de déplacement reste prioritaire pendant le bouton maintenu.
    function scheduleObjectMoveCursorUpdate() {
        if (objectMoveCursorFrame) cancelAnimationFrame(objectMoveCursorFrame);
        objectMoveCursorFrame = requestAnimationFrame(() => {
            objectMoveCursorFrame = 0;
            if (objectMoveCursorActive) updateToolCursor();
        });
    }

    let toolCursorRefreshFrame = 0;

    // Après un raccourci clavier, Chrome peut conserver visuellement l'ancien
    // curseur jusqu'au prochain mouvement de souris, même si la propriété CSS
    // a changé. Forcer un vrai changement de style puis réappliquer le curseur
    // du nouvel outil à la frame suivante évite cette dépendance au mousemove.
    function refreshToolCursorAfterToolChange() {
        const cursorElement = canvas?.upperCanvasEl;
        if (!cursorElement) return;

        if (toolCursorRefreshFrame) {
            cancelAnimationFrame(toolCursorRefreshFrame);
            toolCursorRefreshFrame = 0;
        }

        cursorElement.style.cursor = "default";
        void cursorElement.offsetWidth;

        toolCursorRefreshFrame = requestAnimationFrame(() => {
            toolCursorRefreshFrame = 0;
            if (!cursorElement.isConnected || cursorElement !== canvas?.upperCanvasEl) return;
            updateToolCursor();
            void cursorElement.offsetWidth;
        });
    }

    function updateToolCursor(target = null) {
        if (!canvas?.upperCanvasEl) return;
        const cursorElement = canvas.upperCanvasEl;

        // La pipette garde toujours la priorité sur les curseurs des outils.
        if (eyedropperActive) {
            updateEyedropperCursor();
            return;
        }

        // L'outil Bordure conserve le curseur natif : aucun curseur dédié.
        if (currentTool === "border") {
            cursorElement.style.cursor = "";
            return;
        }

        // Le curseur de déplacement n'est affiché que pendant un geste
        // commencé sur un objet déplaçable, jamais au simple survol.
        if (objectMoveCursorActive) {
            cursorElement.style.cursor = MOVE_CURSOR;
            return;
        }

        cursorElement.style.cursor =
            ARROW_TOOL_CURSORS[currentTool] ||
            TOOL_CURSORS[currentTool] ||
            DEFAULT_TOOL_CURSOR;
    }


    // Chrome peut conserver le curseur système après la fermeture d'une
    // boîte de dialogue native (notamment lorsque l'utilisateur appuie sur
    // Échap). Une simple réaffectation de la même URL CSS ne suffit pas :
    // il faut passer brièvement par un autre curseur, puis réappliquer celui
    // correspondant à l'outil actuellement actif.
    let fuzeWindowLostFocus = false;

    window.addEventListener("blur", () => {
        fuzeWindowLostFocus = true;
    });

    window.addEventListener("focus", () => {
        if (!fuzeWindowLostFocus) return;
        fuzeWindowLostFocus = false;

        requestAnimationFrame(() => {
            const cursorElement = canvas?.upperCanvasEl;
            if (!cursorElement) return;

            // Première étape : imposer un changement réel de curseur.
            cursorElement.style.cursor = "default";
            void cursorElement.offsetWidth;

            // Deuxième étape : restaurer le curseur calculé à partir de l'état
            // courant de Fuze (outil, pipette ou outil Bordure).
            window.setTimeout(() => {
                if (!cursorElement.isConnected) return;
                updateToolCursor();
                void cursorElement.offsetWidth;
            }, 100);
        });
    });

    function setTool(tool) {

        // Tout changement d'outil (menu ou raccourci clavier) quitte la pipette.
        // Le prélèvement de couleur, lui, ne passe pas par setTool et conserve
        // donc la pipette active pour permettre plusieurs prélèvements successifs.
        if (eyedropperActive) {
            cancelEyedropper();
            updateEyedropperCursor();
        }

        if (currentTool === "curvedArrow" && tool !== "curvedArrow") {
            if (temporaryObject) canvas.remove(temporaryObject);
            temporaryObject = null;
            drawing = false;
            rawDrawStart = null;
            curvedArrowStage = 0;
            curvedArrowStart = curvedArrowEnd = curvedArrowControl = null;
            canvas.requestRenderAll();
        }

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

        // Le feutre utilise lui aussi l'épaisseur courante du contrôle partagé.
        // Changer d'outil ne doit jamais réinitialiser cette valeur.

        if (tool === "select") {

            canvas.selection = true;

            canvas.forEachObject(
                object => {
                    // Les bordures d'image restent purement décoratives,
                    // même en mode Sélection : le clic traverse la bordure
                    // et cible directement l'image située dessous.
                    const isDecoration = object.fuzeTool === "border" || object.fuzeBorderOwnerId || object.fuzeMagnifierRole === "connector" || String(object.fuzeMagnifierRole || "").endsWith("-shadow") || String(object.fuzeMagnifierRole || "").endsWith("-border");
                    object.selectable = !isDecoration;
                    object.evented = !isDecoration;
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
                    // Les objets restent détectables (evented) pour distinguer
                    // un clic d'un glissement, mais ne sont pas déplaçables par
                    // Fabric tant qu'un outil de dessin est actif.
                    const isDecoration = object.fuzeTool === "border" || object.fuzeBorderOwnerId || object.fuzeMagnifierRole === "connector" || String(object.fuzeMagnifierRole || "").endsWith("-shadow") || String(object.fuzeMagnifierRole || "").endsWith("-border");
                    object.selectable = false;
                    object.evented = !isDecoration;
                }
            );

            updateStatus(
                tool === "felt" ? "Feutre : tracer librement" :
                tool === "highlight" ? "Highlight : tracer un rectangle jaune" :
                tool === "magnifier" ? (FUZE_LANGUAGE === "en" ? "Magnifier: draw the area to enlarge" : "Loupe : tracer la zone à agrandir") :
                tool === "number" ? (FUZE_LANGUAGE === "en" ? "Number: click to add a circled number" : "Numéro : cliquez pour ajouter un numéro entouré") :
                "Outil : " + tool
            );
        }

        syncThicknessControl();
        canvas.renderAll();
        refreshToolCursorAfterToolChange();
        if (tool === "stamp") openStampDialog();
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
    FLÈCHE FANCY
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
        return !!(object && object.arrowType === "fancy");
    }

    function isSimpleArrow(object) {
        return !!(object && object.arrowType === "simple");
    }

    function isEditableArrow(object) {
        return isFancyArrow(object) || isSimpleArrow(object) || !!(object && object.arrowType === "curved");
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

        // Les dimensions suivent réellement la valeur choisie.
        // À partir de 6, les proportions restent identiques à l'ancien rendu.
        const innerTail = strokeWidth * 2.2;

        const innerShaft = strokeWidth * 4.0;

        const innerHead = innerShaft * 2.35;


        /*
        Contour blanc.

        Il reste volontairement raisonnable
        afin de ne pas manger la couleur.
        */
        const outlineWidth = strokeWidth * 0.90;


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
                    8,
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

        const tipRadius = Math.min(strokeWidth * 3.8, 50);

        // Le sommet du polygone est le point de contrôle de l'arrondi :
        // la courbe quadratique ne passe donc pas directement par ce sommet.
        // On résout la position de ce point de contrôle pour que le point le
        // plus avancé de la courbe, contour blanc compris, tombe exactement
        // sur x2/y2 (l'ancrage de la poignée).
        // Cette résolution reprend strictement le même calcul de tangentes et
        // le même plafonnement de rayon que roundedPolygonPath().
        const tip = points[3];
        const previousTipPoint = points[2];
        const nextTipPoint = points[4];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);

        if (length > 0.001) {
            const ux = dx / length;
            const uy = dy / length;
            const originalTip = { x: tip.x, y: tip.y };
            const targetCurvePoint = {
                x: x2 - ux * widths.outlineWidth / 2,
                y: y2 - uy * widths.outlineWidth / 2
            };

            // Retourne le milieu exact de la courbe quadratique de l'arrondi
            // de la pointe : Q(0.5) = (A + 2P + B) / 4.
            function getTipCurveMidpoint(controlX, controlY) {
                const v1x = previousTipPoint.x - controlX;
                const v1y = previousTipPoint.y - controlY;
                const v2x = nextTipPoint.x - controlX;
                const v2y = nextTipPoint.y - controlY;
                const len1 = Math.hypot(v1x, v1y);
                const len2 = Math.hypot(v2x, v2y);

                if (len1 < 0.001 || len2 < 0.001) {
                    return { x: controlX, y: controlY };
                }

                const radius = Math.min(
                    tipRadius,
                    Math.min(len1, len2) * 0.45
                );
                const beforeX = controlX + (v1x / len1) * radius;
                const beforeY = controlY + (v1y / len1) * radius;
                const afterX = controlX + (v2x / len2) * radius;
                const afterY = controlY + (v2y / len2) * radius;

                return {
                    x: (beforeX + 2 * controlX + afterX) / 4,
                    y: (beforeY + 2 * controlY + afterY) / 4
                };
            }

            // La géométrie est symétrique autour de l'axe de la flèche :
            // seul le déplacement du contrôle sur cet axe est nécessaire.
            // Newton avec dérivée numérique converge en quelques itérations.
            const getAxialError = (offset) => {
                const midpoint = getTipCurveMidpoint(
                    originalTip.x + ux * offset,
                    originalTip.y + uy * offset
                );
                return (midpoint.x - targetCurvePoint.x) * ux +
                    (midpoint.y - targetCurvePoint.y) * uy;
            };

            let offset = 0;
            for (let i = 0; i < 12; i++) {
                const error = getAxialError(offset);
                if (Math.abs(error) < 0.0001) break;

                const epsilon = 0.01;
                const derivative = (
                    getAxialError(offset + epsilon) -
                    getAxialError(offset - epsilon)
                ) / (2 * epsilon);

                if (!Number.isFinite(derivative) || Math.abs(derivative) < 0.000001) {
                    break;
                }

                offset -= error / derivative;
            }

            tip.x = originalTip.x + ux * offset;
            tip.y = originalTip.y + uy * offset;
        }

        /*
        Le padding inclut le contour blanc
        et laisse une petite marge.
        */
        const shadedContour = Math.max(5.5, strokeWidth * 0.88);

        const padding =
            widths.outlineWidth + shadedContour * 3 + 3;


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
            Math.min(
                strokeWidth * 2.2,
                28
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
            // The SVG path's actual local bounding box starts at `padding`,
            // not at (0, 0). Fabric's left/top refer to that actual path
            // bounding box. Keep the scene origin aligned with the original
            // polygon coordinates rather than with the padded coordinate box.
            pathLeft: bounds.minX + padding,
            pathTop: bounds.minY + padding,
            widths,
            radius,
            tipRadius
        };
    }


    /* =====================================================
    CRÉATION DE LA FLÈCHE FANCY
    ===================================================== */

    function createFancyArrow(
        x1,
        y1,
        x2,
        y2,
        color,
        strokeWidth,
        opacity = 1
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
            pathLeft,
            pathTop,
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
        const shadedContour = Math.max(5.5, strokeWidth * 0.88);

        const arrow =
            new fabric.Path(
                pathData,
                {

                    left:
                        pathLeft,

                    top:
                        pathTop,

                    originX: "left",
                    originY: "top",


                    fill: color,

                    opacity,

                    stroke: "#ffffff",

                    strokeWidth:
                        widths.outlineWidth,


                    strokeLineJoin: "round",
                    strokeLineCap: "round",


                    shadow:
                        new fabric.Shadow({
                            color: "rgba(35, 35, 35, 0.88)",
                            blur: shadedContour,
                            offsetX: 0,
                            offsetY: 0
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
    FLÈCHE SIMPLE — corps droit + pointe triangulaire
    Les trois couches sont superposées exactement : gris,
    blanc, puis couleur. Le groupe reste un objet unique.
    ===================================================== */
    function getSimpleArrowGeometry(x1, y1, x2, y2, strokeWidth) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        if (length < 1) return null;

        const ux = dx / length;
        const uy = dy / length;
        const px = -uy;
        const py = ux;
        const shaft = Math.max(2.5, strokeWidth * 0.85);
        const headWidth = Math.max(12, strokeWidth * 3.2);
        const headLength = Math.min(length * 0.48, Math.max(18, strokeWidth * 4.2));
        const baseX = x2 - ux * headLength;
        const baseY = y2 - uy * headLength;
        const outlineWidth = Math.max(2, strokeWidth * 0.4);
        const visibleTipX = x2 - ux * outlineWidth / 2;
        const visibleTipY = y2 - uy * outlineWidth / 2;
        const points = [
            { x: x1 + px * shaft / 2, y: y1 + py * shaft / 2 },
            { x: baseX + px * shaft / 2, y: baseY + py * shaft / 2 },
            { x: baseX + px * headWidth / 2, y: baseY + py * headWidth / 2 },
            { x: visibleTipX, y: visibleTipY },
            { x: baseX - px * headWidth / 2, y: baseY - py * headWidth / 2 },
            { x: baseX - px * shaft / 2, y: baseY - py * shaft / 2 },
            { x: x1 - px * shaft / 2, y: y1 - py * shaft / 2 }
        ];
        const shadedContour = Math.max(5.5, strokeWidth * 0.88);
        const padding = outlineWidth + shadedContour * 3 + 3;
        const minX = Math.min(...points.map(point => point.x)) - padding;
        const minY = Math.min(...points.map(point => point.y)) - padding;
        const pathData = `M ${points.map(point => `${point.x - minX} ${point.y - minY}`).join(" L ")} Z`;

        return {
            pathData,
            minX,
            minY,
            // The path coordinates begin at `padding`; Fabric positions
            // left/top at the actual path bounds, not at the padded origin.
            pathLeft: minX + padding,
            pathTop: minY + padding,
            outlineWidth,
            shadedContour,
            localStart: { x: x1 - minX, y: y1 - minY },
            localEnd: { x: x2 - minX, y: y2 - minY }
        };
    }

    function createSimpleArrow(x1, y1, x2, y2, color, strokeWidth, opacity = 1) {
        const geometry = getSimpleArrowGeometry(x1, y1, x2, y2, strokeWidth);
        if (!geometry) return null;

        const {
            pathData, pathLeft, pathTop, outlineWidth, shadedContour,
            localStart, localEnd
        } = geometry;

        return new fabric.Path(pathData, {
            left: pathLeft,
            top: pathTop,
            originX: "left",
            originY: "top",
            fill: color,
            stroke: "#ffffff",
            strokeWidth: outlineWidth,
            strokeLineJoin: "round",
            strokeLineCap: "round",
            shadow: new fabric.Shadow({
                color: "rgba(35, 35, 35, 0.88)",
                blur: shadedContour,
                offsetX: 0,
                offsetY: 0
            }),
            opacity,
            selectable: true,
            evented: true,
            hasControls: false,
            hasBorders: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            objectCaching: false,
            arrowType: "simple",
            x1, y1, x2, y2,
            // Points d'ancrage exprimés dans le système local réel du Path.
            arrowPointStart: localStart,
            arrowPointEnd: localEnd,
            arrowColor: color,
            arrowStrokeWidth: strokeWidth
        });
    }

    // Flèche courbe : un seul Path Fabric (corps Bézier + pointe), donc
    // déplacement, sélection, copie et historique restent atomiques.
    function createCurvedArrow(x1, y1, cx, cy, x2, y2, color, strokeWidth, opacity = 1) {
        // Même principe que createSimpleArrow : une seule forme fermée,
        // constituée du corps et de la pointe. Les deux bords du corps suivent
        // la courbe de Bézier ; aucun segment droit ne relie les extrémités.
        const tangentX = x2 - cx;
        const tangentY = y2 - cy;
        const tangentLength = Math.hypot(tangentX, tangentY);
        const chordLength = Math.hypot(x2 - x1, y2 - y1);
        if (chordLength < 1 || tangentLength < 0.001) return null;

        const ux = tangentX / tangentLength;
        const uy = tangentY / tangentLength;
        const px = -uy;
        const py = ux;
        const shaftWidth = Math.max(2.5, strokeWidth * 0.85);
        const headWidth = Math.max(12, strokeWidth * 3.2);
        const headLength = Math.min(chordLength * 0.48, Math.max(18, strokeWidth * 4.2));
        const baseX = x2 - ux * headLength;
        const baseY = y2 - uy * headLength;

        // Échantillonnage des deux bords du corps jusqu'à la base de la pointe.
        const upperSide = [];
        const lowerSide = [];
        const count = Math.max(24, Math.min(96, Math.ceil(chordLength / 5)));

        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const omt = 1 - t;
            const x = omt * omt * x1 + 2 * omt * t * cx + t * t * baseX;
            const y = omt * omt * y1 + 2 * omt * t * cy + t * t * baseY;
            const tx = 2 * omt * (cx - x1) + 2 * t * (baseX - cx);
            const ty = 2 * omt * (cy - y1) + 2 * t * (baseY - cy);
            const length = Math.hypot(tx, ty) || 1;
            const nx = -ty / length;
            const ny = tx / length;
            upperSide.push({ x: x + nx * shaftWidth / 2, y: y + ny * shaftWidth / 2 });
            lowerSide.push({ x: x - nx * shaftWidth / 2, y: y - ny * shaftWidth / 2 });
        }

        // La pointe est insérée ENTRE les deux bords du corps, et non après
        // leur fermeture : cela évite les diagonales parasites vers l'origine.
        const points = [
            ...upperSide,
            { x: baseX + px * headWidth / 2, y: baseY + py * headWidth / 2 },
            { x: x2, y: y2 },
            { x: baseX - px * headWidth / 2, y: baseY - py * headWidth / 2 },
            ...lowerSide.slice().reverse()
        ];

        const shadedContour = Math.max(5.5, strokeWidth * 0.88);
        const outlineWidth = Math.max(2, strokeWidth * 0.4);
        const padding = outlineWidth + shadedContour * 3 + 3;
        const minX = Math.min(...points.map(point => point.x)) - padding;
        const minY = Math.min(...points.map(point => point.y)) - padding;
        const local = points.map(point => ({ x: point.x - minX, y: point.y - minY }));
        const pathData = `M ${local.map(point => `${point.x} ${point.y}`).join(" L ")} Z`;

        return new fabric.Path(pathData, {
            left: minX + padding,
            top: minY + padding,
            originX: "left",
            originY: "top",
            fill: color,
            stroke: "#ffffff",
            strokeWidth: outlineWidth,
            strokeLineJoin: "round",
            strokeLineCap: "round",
            shadow: new fabric.Shadow({
                color: "rgba(35, 35, 35, 0.88)",
                blur: shadedContour,
                offsetX: 0,
                offsetY: 0
            }),
            opacity,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            objectCaching: false,
            arrowType: "curved",
            arrowColor: color,
            arrowStrokeWidth: strokeWidth,
            x1, y1, cx, cy, x2, y2
        });
    }

    /* =====================================================
    RECONSTRUCTION
    ===================================================== */

    function rebuildArrow(oldArrow, x1, y1, x2, y2, cx = oldArrow.cx, cy = oldArrow.cy) {
        const color = oldArrow.arrowColor || getColor();
        const strokeWidth = oldArrow.arrowStrokeWidth || getStrokeWidth();

        if (oldArrow.arrowType === "curved") {
            return createCurvedArrow(
                x1, y1, cx, cy, x2, y2,
                color, strokeWidth, oldArrow.opacity ?? 1
            );
        }

        if (isSimpleArrow(oldArrow)) {
            return createSimpleArrow(
                x1, y1, x2, y2,
                color,
                strokeWidth,
                oldArrow.opacity ?? 1
            );
        }

        return createFancyArrow(
            x1, y1, x2, y2,
            color,
            strokeWidth,
            oldArrow.opacity ?? 1
        );
    }


    // Dernières positions du curseur pour réévaluer le magnétisme dès que Ctrl change.
    let lastArrowDrawPoint = null;
    let lastArrowHandlePoint = null;
    let lastDrawingPoint = null;
    let rawDrawStart = null;

    // Grille de 10 px dans les coordonnées de la scène.
    function snapToGrid(value) {
        return Math.round(value / 10) * 10;
    }

    function snapPointToGrid(point) {
        return { x: snapToGrid(point.x), y: snapToGrid(point.y) };
    }

    function snapArrowEndpoint(startX, startY, endX, endY, enabled) {
        if (!enabled) return { x: endX, y: endY };

        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.hypot(dx, dy);
        if (length < 0.001) return { x: endX, y: endY };

        const angle = Math.atan2(dy, dx);
        const step = Math.PI / 18; // 10 degrés
        const snappedAngle = Math.round(angle / step) * step;
        return {
            x: startX + Math.cos(snappedAngle) * length,
            y: startY + Math.sin(snappedAngle) * length
        };
    }

    function snapArrowLength(startX, startY, endX, endY, enabled) {
        if (!enabled) return { x: endX, y: endY };
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.hypot(dx, dy);
        if (length < 0.001) return { x: endX, y: endY };
        const snappedLength = Math.max(10, Math.round(length / 10) * 10);
        const scale = snappedLength / length;
        return { x: startX + dx * scale, y: startY + dy * scale };
    }

    function updateTemporaryArrowAtPoint(point, ctrlKey, shiftKey = false) {
        if (!drawing || !temporaryObject || !lastArrowDrawPoint) return;
        let endpoint = snapArrowLength(drawStart.x, drawStart.y, point.x, point.y, shiftKey);
        endpoint = snapArrowEndpoint(drawStart.x, drawStart.y, endpoint.x, endpoint.y, ctrlKey);
        const snapped = endpoint;
        const newArrow = currentTool === "simpleArrow"
            ? createSimpleArrow(drawStart.x, drawStart.y, snapped.x, snapped.y, getColor(), getStrokeWidth(), getStrokeOpacity())
            : createFancyArrow(drawStart.x, drawStart.y, snapped.x, snapped.y, getColor(), getStrokeWidth(), getStrokeOpacity());
        if (!newArrow) return;
        const index = canvas.getObjects().indexOf(temporaryObject);
        canvas.remove(temporaryObject);
        temporaryObject = newArrow;
        temporaryObject.set({ selectable: false, evented: false });
        canvas.insertAt(Math.max(0, index), temporaryObject);
        canvas.requestRenderAll();
    }

    /* =====================================================
    POIGNÉES
    ===================================================== */

    function showArrowHandles(
        object
    ) {

        if (!isEditableArrow(object)) {
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
        arrowHandleControl.classList.toggle("visible", object.arrowType === "curved");


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
        arrowHandleControl.classList.remove("visible");
    }


    /* -----------------------------------------------------
    SYNCHRONISATION DES EXTRÉMITÉS PENDANT LE DÉPLACEMENT D'UN GROUPE
    ----------------------------------------------------- */

    function isActiveSelectionObject(object) {
        return !!object && (
            object.type === "activeSelection" ||
            object instanceof fabric.ActiveSelection
        );
    }

    // Mémorise l'origine du groupe au moment où la sélection multiple est créée.
    // x1/y1/x2/y2 restent des coordonnées de scène : on les translate donc du
    // déplacement réel du groupe, sans les recalculer depuis la matrice des Paths.
    function rememberActiveSelectionPosition(selection) {
        if (!isActiveSelectionObject(selection)) return;
        selection.__fuzeLastLeft = selection.left;
        selection.__fuzeLastTop = selection.top;
    }

    function translateActiveSelectionArrowEndpoints(selection, dx, dy) {
        if (!isActiveSelectionObject(selection) || (!dx && !dy)) return;

        selection.getObjects().forEach(object => {
            if (!isEditableArrow(object)) return;
            object.x1 += dx;
            object.y1 += dy;
            object.x2 += dx;
            object.y2 += dy;
            if (object.arrowType === "curved") {
                object.cx += dx;
                object.cy += dy;
            }
        });
    }

    /* -----------------------------------------------------
    POSITIONNEMENT DES POIGNÉES
    ----------------------------------------------------- */

    function positionArrowHandles(object) {
        if (!isEditableArrow(object)) {
            hideArrowHandles();
            return;
        }

        /*
         * x1/y1 et x2/y2 sont les coordonnées de la scène Fabric,
         * pas des coordonnées locales du Path. On les transforme
         * directement avec le viewportTransform.
         *
         * Ne pas repasser par pathOffset / calcTransformMatrix :
         * le Path contient des marges liées au contour et à l'ombre,
         * qui varient avec l'épaisseur et ne doivent pas déplacer
         * les points d'ancrage des poignées.
         */
        let startScene;
        let endScene;
        let controlScene = null;

        if (object.arrowType === "curved") {
            startScene = new fabric.Point(object.x1, object.y1);
            endScene = new fabric.Point(object.x2, object.y2);
            controlScene = new fabric.Point(object.cx, object.cy);
        } else if (isSimpleArrow(object) || isFancyArrow(object)) {
            const pathOffset = object.pathOffset || new fabric.Point(0, 0);
            const objectMatrix = object.calcTransformMatrix();
            const startLocal = new fabric.Point(
                object.arrowPointStart.x - pathOffset.x,
                object.arrowPointStart.y - pathOffset.y
            );
            const endLocal = new fabric.Point(
                object.arrowPointEnd.x - pathOffset.x,
                object.arrowPointEnd.y - pathOffset.y
            );
            startScene = fabric.util.transformPoint(startLocal, objectMatrix);
            endScene = fabric.util.transformPoint(endLocal, objectMatrix);
        } else {
            // Smart Arrow : conserver exactement le référentiel existant.
            startScene = new fabric.Point(object.x1, object.y1);
            endScene = new fabric.Point(object.x2, object.y2);
        }

        const startScreen = fabric.util.transformPoint(startScene, canvas.viewportTransform);
        const endScreen = fabric.util.transformPoint(endScene, canvas.viewportTransform);

        const canvasRect = canvas.upperCanvasEl.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        const offsetX = canvasRect.left - stageRect.left;
        const offsetY = canvasRect.top - stageRect.top;

        arrowHandleStart.style.left = `${offsetX + startScreen.x}px`;
        arrowHandleStart.style.top = `${offsetY + startScreen.y}px`;
        arrowHandleEnd.style.left = `${offsetX + endScreen.x}px`;
        arrowHandleEnd.style.top = `${offsetY + endScreen.y}px`;

        if (controlScene) {
            const controlScreen = fabric.util.transformPoint(controlScene, canvas.viewportTransform);
            arrowHandleControl.style.left = `${offsetX + controlScreen.x}px`;
            arrowHandleControl.style.top = `${offsetY + controlScreen.y}px`;
        }
    }

    /* =====================================================
    DRAG POIGNÉES
    ===================================================== */

    let arrowHandleDragGeometry = null;

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

        // Géométrie de référence pour Alt : l'extrémité opposée reste fixe
        // et la longueur initiale est conservée pendant toute la rotation.
        const initialDx = editingArrow.x2 - editingArrow.x1;
        const initialDy = editingArrow.y2 - editingArrow.y1;
        arrowHandleDragGeometry = which === "control" ? null : {
            fixedX: which === "start" ? editingArrow.x2 : editingArrow.x1,
            fixedY: which === "start" ? editingArrow.y2 : editingArrow.y1,
            length: Math.hypot(initialDx, initialDy)
        };

        // Mémorise le décalage de prise pour éviter tout saut au premier mouvement.
        if (which === "control" && editingArrow.arrowType === "curved") {
            const pointer = canvas.getScenePoint(event);
            arrowHandleDragOffset = { x: editingArrow.cx - pointer.x, y: editingArrow.cy - pointer.y };
        } else if (isSimpleArrow(editingArrow) || isFancyArrow(editingArrow)) {
            const pointer = canvas.getScenePoint(event);
            const anchorX = which === "start" ? editingArrow.x1 : editingArrow.x2;
            const anchorY = which === "start" ? editingArrow.y1 : editingArrow.y2;
            arrowHandleDragOffset = { x: anchorX - pointer.x, y: anchorY - pointer.y };
        } else {
            arrowHandleDragOffset = { x: 0, y: 0 };
        }


        document.body.style.userSelect =
            "none";


        updateStatus(
            which === "start"
                ? "Déplacement du début de la flèche"
                : which === "end"
                    ? "Déplacement de la pointe de la flèche"
                    : "Modification de la courbure"
        );
    }


    function moveArrowHandle(event) {
        if (!draggingArrowHandle || !editingArrow) return;

        // Le premier déplacement d'une poignée termine l'outil courant :
        // la poignée reste prioritaire et l'édition se poursuit en mode Sélection.
        if (currentTool !== "select") setTool("select");

        const point = canvas.getScenePoint(event);
        lastArrowHandlePoint = { x: point.x, y: point.y };
        updateArrowHandleAtPoint(
            lastArrowHandlePoint,
            !!event.ctrlKey,
            !!event.shiftKey,
            !!event.altKey
        );
    }

    function updateArrowHandleAtPoint(point, ctrlKey, shiftKey = false, altKey = false) {
        if (!draggingArrowHandle || !editingArrow) return;


        // La poignée centrale ne déplace que le point de contrôle de Bézier.
        if (draggingArrowHandle === "control" && editingArrow.arrowType === "curved") {
            const cx = clamp(point.x + (arrowHandleDragOffset?.x || 0), -100, CANVAS_WIDTH + 100);
            const cy = clamp(point.y + (arrowHandleDragOffset?.y || 0), -100, CANVAS_HEIGHT + 100);
            const newArrow = rebuildArrow(editingArrow, editingArrow.x1, editingArrow.y1, editingArrow.x2, editingArrow.y2, cx, cy);
            if (!newArrow) return;
            const objects = canvas.getObjects();
            const oldIndex = objects.indexOf(editingArrow);
            canvas.remove(editingArrow);
            canvas.insertAt(Math.max(0, oldIndex), newArrow);
            newArrow.set({ selectable: true, evented: true, hasControls: false, hasBorders: false, lockScalingX: true, lockScalingY: true, lockRotation: true });
            editingArrow = newArrow;
            canvas.setActiveObject(newArrow);
            canvas.renderAll();
            positionArrowHandles(newArrow);
            return;
        }

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
                    (point.x + (arrowHandleDragOffset?.x || 0)),
                    -100,
                    CANVAS_WIDTH + 100
                );

            y1 =
                clamp(
                    (point.y + (arrowHandleDragOffset?.y || 0)),
                    -100,
                    CANVAS_HEIGHT + 100
                );

        } else {

            x2 =
                clamp(
                    (point.x + (arrowHandleDragOffset?.x || 0)),
                    -100,
                    CANVAS_WIDTH + 100
                );

            y2 =
                clamp(
                    (point.y + (arrowHandleDragOffset?.y || 0)),
                    -100,
                    CANVAS_HEIGHT + 100
                );
        }


        // Alt : rotation autour de l'extrémité opposée, longueur initiale constante.
        // Alt + Ctrl : même rotation, avec un angle accroché tous les 10 degrés.
        if (altKey && arrowHandleDragGeometry && editingArrow.arrowType !== "curved") {
            const { fixedX, fixedY, length } = arrowHandleDragGeometry;
            let movingX = draggingArrowHandle === "start" ? x1 : x2;
            let movingY = draggingArrowHandle === "start" ? y1 : y2;
            let dx = movingX - fixedX;
            let dy = movingY - fixedY;
            let angle = Math.atan2(dy, dx);

            if (ctrlKey) {
                const step = Math.PI / 18;
                angle = Math.round(angle / step) * step;
            }

            movingX = fixedX + Math.cos(angle) * length;
            movingY = fixedY + Math.sin(angle) * length;

            if (draggingArrowHandle === "start") {
                x1 = movingX;
                y1 = movingY;
                x2 = fixedX;
                y2 = fixedY;
            } else {
                x1 = fixedX;
                y1 = fixedY;
                x2 = movingX;
                y2 = movingY;
            }
        } else {
            // Shift : longueur au multiple de 10 px le plus proche.
            // Ctrl : angle au multiple de 10° le plus proche. Les deux sont cumulables.
            if (draggingArrowHandle === "start") {
            let snapped = snapArrowLength(x2, y2, x1, y1, shiftKey);
            snapped = snapArrowEndpoint(x2, y2, snapped.x, snapped.y, ctrlKey);
            x1 = snapped.x;
            y1 = snapped.y;
        } else {
            let snapped = snapArrowLength(x1, y1, x2, y2, shiftKey);
            snapped = snapArrowEndpoint(x1, y1, snapped.x, snapped.y, ctrlKey);
            x2 = snapped.x;
            y2 = snapped.y;
            }
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
                y2,
                editingArrow.cx,
                editingArrow.cy
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
        arrowHandleDragOffset = null;
        arrowHandleDragGeometry = null;
        lastArrowHandlePoint = null;

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
                isEditableArrow(
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


    arrowHandleControl.addEventListener(
        "pointerdown",
        event => {
            event.preventDefault();
            event.stopPropagation();
            editingArrow = canvas.getActiveObject();
            if (editingArrow && editingArrow.arrowType === "curved") {
                startArrowHandleDrag(event, "control");
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
                isEditableArrow(
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
            currentTool === "text" ||
            currentTool === "number" ||
            currentTool === "stamp"
        ) {
            return;
        }


        const pointer =
            (currentTool === "arrow" || currentTool === "simpleArrow" || currentTool === "curvedArrow")
                ? getArrowScenePointFromPointer(event.e)
                : canvas.getScenePoint(event.e);


        drawing = true;

        rawDrawStart = { x: pointer.x, y: pointer.y };
        drawStart = event.e?.shiftKey
            ? snapPointToGrid(rawDrawStart)
            : { ...rawDrawStart };
        lastDrawingPoint = { x: pointer.x, y: pointer.y };


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

        if (currentTool === "magnifier") {
            temporaryObject = new fabric.Rect({
                left: drawStart.x, top: drawStart.y, width: 1, height: 1,
                originX: "left", originY: "top",
                fill: "rgba(70, 115, 210, 0.16)",
                stroke: "rgba(40, 75, 150, 0.9)", strokeWidth: 1,
                strokeUniform: true, selectable: false, evented: false,
                objectCaching: false
            });
            canvas.add(temporaryObject);
            canvas.requestRenderAll();
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
                        getStrokeWidth(),
                    strokeUniform: true,
                    lockUniScaling: false,
                    shadow: makeOuterShapeShadow()
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
                        getStrokeWidth(),
                    strokeUniform: true,
                    lockUniScaling: false,
                    shadow: makeOuterShapeShadow()
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

                    fill: getHighlightFillColor(),
                    stroke: getColor(),
                    strokeWidth: getStrokeWidth(),
                    strokeUniform: true,
                    lockUniScaling: false,
                    shadow: makeOuterShapeShadow(),
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

                    // Le rectangle de prévisualisation du blur ne doit jamais
                    // dessiner de contour : seul le remplissage indique la zone.
                    stroke: "rgba(80,80,80,0)",

                    strokeWidth: 0,
                    strokeUniform: true,
                    lockUniScaling: false,

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
                    getStrokeWidth(),
                    getStrokeOpacity()
                );
        }
        else if (currentTool === "simpleArrow") {
            temporaryObject = createSimpleArrow(
                drawStart.x, drawStart.y,
                drawStart.x + 1, drawStart.y + 1,
                getColor(), getStrokeWidth(), getStrokeOpacity()
            );
        }
        else if (currentTool === "curvedArrow") {
            curvedArrowStage = 0;
            curvedArrowStart = { ...drawStart };
            curvedArrowEnd = { x: drawStart.x + 1, y: drawStart.y + 1 };
            curvedArrowControl = { x: drawStart.x + 0.5, y: drawStart.y + 0.5 };
            temporaryObject = createCurvedArrow(
                curvedArrowStart.x, curvedArrowStart.y,
                curvedArrowControl.x, curvedArrowControl.y,
                curvedArrowEnd.x, curvedArrowEnd.y,
                getColor(), getStrokeWidth(), getStrokeOpacity()
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


    function updateTemporaryDrawingAtPoint(point, shiftKey = false, ctrlKey = false) {
        if (!drawing || !temporaryObject) return;

        // Shift aimante aussi l'origine du tracé. Repartir du point brut permet
        // d'activer ou de désactiver Shift à tout moment pendant le dessin.
        if (rawDrawStart) {
            drawStart = shiftKey
                ? snapPointToGrid(rawDrawStart)
                : { ...rawDrawStart };
        }

        const x = point.x;
        const y = point.y;

        if (currentTool === "felt") return;

        if (currentTool === "arrow" || currentTool === "simpleArrow") {
            lastArrowDrawPoint = { x, y };
            updateTemporaryArrowAtPoint({ x, y }, ctrlKey, shiftKey);
            return;
        }
        if (currentTool === "curvedArrow") {
            curvedArrowEnd = { x, y };
            curvedArrowControl = { x: (drawStart.x + x) / 2, y: (drawStart.y + y) / 2 };
            const replacement = createCurvedArrow(
                drawStart.x, drawStart.y, curvedArrowControl.x, curvedArrowControl.y,
                x, y, getColor(), getStrokeWidth(), getStrokeOpacity()
            );
            if (replacement) {
                const index = canvas.getObjects().indexOf(temporaryObject);
                canvas.remove(temporaryObject);
                temporaryObject = replacement;
                canvas.insertAt(Math.max(0, index), replacement);
            }
            canvas.requestRenderAll();
            return;
        }

        // Les formes rectangulaires et l'ellipse utilisent deux dimensions
        // indépendantes, chacune arrondie au multiple de 10 px le plus proche.
        let dx = x - drawStart.x;
        let dy = y - drawStart.y;
        if (shiftKey) {
            const snapDimension = value => {
                const magnitude = Math.round(Math.abs(value) / 10) * 10;
                return Math.sign(value) * magnitude;
            };
            dx = snapDimension(dx);
            dy = snapDimension(dy);
        }

        const endX = drawStart.x + dx;
        const endY = drawStart.y + dy;
        const left = Math.min(drawStart.x, endX);
        const top = Math.min(drawStart.y, endY);
        const width = Math.abs(dx);
        const height = Math.abs(dy);

        if (currentTool === "rectangle" || currentTool === "highlight" || currentTool === "blur" || currentTool === "magnifier") {
            temporaryObject.set({ left, top, width, height });
        } else if (currentTool === "circle") {
            temporaryObject.set({ left, top, rx: width / 2, ry: height / 2 });
        }

        canvas.requestRenderAll();
    }

    function drawingMove(event) {
        if (!drawing || !temporaryObject) return;

        const pointer =
            (currentTool === "arrow" || currentTool === "simpleArrow" || currentTool === "curvedArrow")
                ? getArrowScenePointFromPointer(event.e)
                : canvas.getScenePoint(event.e);
        const point = { x: pointer.x, y: pointer.y };
        lastDrawingPoint = point;

        if (currentTool === "felt") {
            const last = freehandPoints[freehandPoints.length - 1];
            if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 1.2) {
                freehandPoints.push(point);
                refreshFreehandPreview();
            }
            return;
        }

        updateTemporaryDrawingAtPoint(point, !!event.e?.shiftKey, !!event.e?.ctrlKey);
        canvas.renderAll();
    }

    function finishDrawing() {
        lastArrowDrawPoint = null;
        lastDrawingPoint = null;

        if (!drawing) {
            return;
        }


        drawing = false;
        rawDrawStart = null;

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

        if (currentTool === "magnifier") {
            canvas.remove(object);
            finishMagnifierDrawing({
                left: object.left, top: object.top,
                width: object.width * (object.scaleX || 1),
                height: object.height * (object.scaleY || 1)
            }, {
                color: getColor(),
                width: getStrokeWidth(),
                opacity: getStrokeOpacity()
            });
            updateEmptyMessage();
            return;
        }

        if (currentTool === "arrow" || currentTool === "simpleArrow") {

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
                    element_type: currentTool === 'simpleArrow' ? 'simple_arrow' : 'arrow'
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

            // Fabric peut conserver à l'écran le dernier rendu du rectangle de
            // prévisualisation après canvas.remove(). Le blur ne doit surtout
            // pas capturer ce rectangle dans son propre snapshot : forcer le
            // rendu du canvas nettoyé avant la capture réelle.
            canvas.renderAll();

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
        // L’outil reste actif après la création pour permettre
        // d’enchaîner plusieurs créations. S ou Échap revient à Select.
    }


    /* =====================================================
    SOURIS CANVAS
    ===================================================== */

    // Les outils de tracé (rectangle, cercle, highlight, blur, feutre,
    // flèches) travaillent par clic + déplacement + relâchement.
    // Si le geste commence sur un objet existant, il s'agit au contraire
    // d'un déplacement : on bascule en Sélection au seuil de déplacement
    // et on déplace cet objet, sans démarrer un second tracé.
    let pendingObjectGesture = null;
    let shapeDrawGesture = null;
    let curvedArrowStage = 0;
    let curvedArrowStart = null;
    let curvedArrowEnd = null;
    let curvedArrowControl = null;
    const OBJECT_DRAG_THRESHOLD = 4; // pixels écran
    const DRAG_DRAW_TOOLS = new Set([
        "rectangle", "circle", "highlight", "magnifier", "blur"
    ]);

    canvas.on("mouse:down", event => {
        if (eyedropperActive) {
            const color = sampleCanvasColor(event.e);
            restoreEyedropperSelection();
            if (color) {
                colorInput.value = color;
                colorInput.dispatchEvent(new Event("input", { bubbles: true }));
                colorInput.dispatchEvent(new Event("change", { bubbles: true }));
                rememberEyedropperSelection();
                updateStatus("Couleur prélevée : " + color + " — pipette toujours active");
            } else {
                updateStatus("Impossible de prélever cette couleur.");
            }
            return;
        }

        // Deuxième phase de la flèche courbe : le clic suivant valide le tracé.
        if (currentTool === "curvedArrow" && curvedArrowStage === 1) {
            return;
        }

        // Outils à clic unique : aucune logique de glissement ne s'applique.
        if (currentTool === "number") { addNumberAt(event.e); return; }
        if (currentTool === "stamp") { addStampAt(event.e); return; }
        if (currentTool === "text") { addTextAt(event.e); return; }

        // Une image sert de support de dessin : avec un outil de tracé actif,
        // cliquer/glisser dessus doit toujours démarrer le tracé. Seuls les
        // objets d'annotation déjà créés interceptent le geste pour être déplacés.
        // Si Fabric a déjà reconnu une poignée/zone de transformation,
        // laisser sa transformation prendre la main. Sans ce garde-fou,
        // le geste est intercepté comme un déplacement manuel d'objet.
        const viewportPoint = canvas.getViewportPoint(event.e);
        const activeObject = canvas.getActiveObject();
        // Fabric ne renseigne pas toujours _currentTransform au moment où cet
        // écouteur reçoit mouse:down. Tester directement les contrôles de
        // l'objet actif évite qu'un clic sur une poignée soit interprété comme
        // le début d'un nouveau tracé (rectangle/cercle/highlight/blur/feutre).
        const activeObjectControl = activeObject &&
            typeof activeObject.findControl === "function"
            ? activeObject.findControl(viewportPoint)
            : null;
        const targetControl = event.target &&
            typeof event.target.findControl === "function"
            ? event.target.findControl(viewportPoint)
            : null;
        const fabricTransformStarted = !!canvas._currentTransform ||
            !!activeObjectControl || !!targetControl ||
            !!event.target?.__corner;

        if (fabricTransformStarted) {
            // Le changement d'outil ne doit pas annuler l'événement Fabric :
            // Fabric poursuit ainsi la transformation de la poignée cliquée.
            if (currentTool !== "select") setTool("select");
            return;
        }

        if (currentTool !== "select" && event.target &&
            (event.target.type !== "image" || event.target.fuzeMagnifierRole === "lens") &&
            event.target.fuzeTool !== "border" && !event.target.fuzeBorderOwnerId) {
            const scenePoint = canvas.getScenePoint(event.e);
            pendingObjectGesture = {
                target: event.target,
                clientX: event.e.clientX,
                clientY: event.e.clientY,
                lastX: scenePoint.x,
                lastY: scenePoint.y,
                moved: false
            };
            return;
        }

        if (DRAG_DRAW_TOOLS.has(currentTool)) {
            shapeDrawGesture = {
                clientX: event.e.clientX,
                clientY: event.e.clientY,
                target: event.target || null
            };
        } else {
            shapeDrawGesture = null;
        }
        startDrawing(event);
    });

    canvas.on("mouse:move", event => {
        // En mode Sélection, Fabric peut réécrire le curseur de survol pendant
        // que le bouton reste enfoncé. Notre curseur move doit rester affiché.
        if (objectMoveCursorActive) scheduleObjectMoveCursorUpdate();

        if (pendingObjectGesture) {
            const gesture = pendingObjectGesture;
            const dxScreen = event.e.clientX - gesture.clientX;
            const dyScreen = event.e.clientY - gesture.clientY;

            if (!gesture.moved && Math.hypot(dxScreen, dyScreen) >= OBJECT_DRAG_THRESHOLD) {
                gesture.moved = true;
                objectMoveCursorActive = true;
                setTool("select");
                updateToolCursor();
                scheduleObjectMoveCursorUpdate();
                if (canvas.getObjects().includes(gesture.target)) {
                    canvas.setActiveObject(gesture.target);
                }
            }

            if (gesture.moved && canvas.getObjects().includes(gesture.target)) {
                const point = canvas.getScenePoint(event.e);
                gesture.target.set({
                    left: gesture.target.left + (point.x - gesture.lastX),
                    top: gesture.target.top + (point.y - gesture.lastY)
                });
                gesture.lastX = point.x;
                gesture.lastY = point.y;
                gesture.target.setCoords();
                if (gesture.target.fuzeMagnifierId && typeof syncMagnifierGeometry === "function") {
                    syncMagnifierGeometry(gesture.target.fuzeMagnifierId);
                }
                canvas.requestRenderAll();
            }
            return;
        }

        if (currentTool === "curvedArrow" && curvedArrowStage === 1 && curvedArrowStart && curvedArrowEnd) {
            const point = getArrowScenePointFromPointer(event.e);
            curvedArrowControl = { x: point.x, y: point.y };
            const replacement = createCurvedArrow(
                curvedArrowStart.x, curvedArrowStart.y,
                curvedArrowControl.x, curvedArrowControl.y,
                curvedArrowEnd.x, curvedArrowEnd.y,
                getColor(), getStrokeWidth(), getStrokeOpacity()
            );
            if (replacement) {
                const index = canvas.getObjects().indexOf(temporaryObject);
                if (temporaryObject) canvas.remove(temporaryObject);
                temporaryObject = replacement;
                canvas.insertAt(Math.max(0, index), replacement);
                canvas.requestRenderAll();
            }
            return;
        }

        drawingMove(event);
    });

    canvas.on("mouse:up", event => {
        objectMoveCursorActive = false;
        if (objectMoveCursorFrame) {
            cancelAnimationFrame(objectMoveCursorFrame);
            objectMoveCursorFrame = 0;
        }
        updateToolCursor(event?.target || null);

        if (pendingObjectGesture) {
            const gesture = pendingObjectGesture;
            pendingObjectGesture = null;

            if (!gesture.moved) {
                // Un simple clic sur un objet avec un outil de tracé sélectionne
                // l'objet et revient en mode Sélection, sans créer de forme.
                setTool("select");
                if (gesture.target && canvas.getObjects().includes(gesture.target)) {
                    canvas.setActiveObject(gesture.target);
                    canvas.requestRenderAll();
                }
            } else {
                if (gesture.target.fuzeMagnifierId &&
                    gesture.target.fuzeMagnifierRole === "source" &&
                    typeof refreshMagnifierSnapshot === "function") {
                    refreshMagnifierSnapshot(gesture.target.fuzeMagnifierId);
                }
                canvas.requestRenderAll();
                saveHistory();
                updateEmptyMessage();
            }
            return;
        }

        // Fin de la première phase : mémoriser le point d'arrivée et attendre
        // que l'utilisateur règle la courbure à la souris.
        if (currentTool === "curvedArrow" && curvedArrowStage === 0 && drawing) {
            const pointer = getArrowScenePointFromPointer(event.e);
            curvedArrowEnd = { x: pointer.x, y: pointer.y };
            drawing = false;
            rawDrawStart = null;
            if (temporaryObject) canvas.remove(temporaryObject);
            temporaryObject = null;
            if (Math.hypot(curvedArrowEnd.x - curvedArrowStart.x, curvedArrowEnd.y - curvedArrowStart.y) < 8) {
                curvedArrowStage = 0;
                curvedArrowStart = curvedArrowEnd = curvedArrowControl = null;
                canvas.requestRenderAll();
                return;
            }
            curvedArrowStage = 1;
            curvedArrowControl = { x: (curvedArrowStart.x + curvedArrowEnd.x) / 2, y: (curvedArrowStart.y + curvedArrowEnd.y) / 2 };
            temporaryObject = createCurvedArrow(
                curvedArrowStart.x, curvedArrowStart.y,
                curvedArrowControl.x, curvedArrowControl.y,
                curvedArrowEnd.x, curvedArrowEnd.y,
                getColor(), getStrokeWidth(), getStrokeOpacity()
            );
            if (temporaryObject) canvas.add(temporaryObject);
            updateStatus(FUZE_LANGUAGE === "en"
                ? "Move the mouse to adjust the curve, then click to confirm"
                : "Déplacez la souris pour régler la courbure, puis cliquez pour valider");
            canvas.requestRenderAll();
            return;
        }

        // Deuxième clic : transformer l'aperçu en objet définitif et
        // enregistrer une seule entrée d'historique.
        if (currentTool === "curvedArrow" && curvedArrowStage === 1) {
            if (temporaryObject) {
                temporaryObject.set({ selectable: true, evented: true });
                temporaryObject.arrowColor = getColor();
                temporaryObject.arrowStrokeWidth = getStrokeWidth();
                canvas.setActiveObject(temporaryObject);
                trackEvent("element_created", { element_type: "curved_arrow" });
                canvas.requestRenderAll();
                saveHistory();
                updateEmptyMessage();
            }
            temporaryObject = null;
            curvedArrowStage = 0;
            curvedArrowStart = curvedArrowEnd = curvedArrowControl = null;
            updateStatus(FUZE_LANGUAGE === "en" ? "Curved arrow created" : "Flèche courbe créée");
            return;
        }

        if (shapeDrawGesture) {
            const gesture = shapeDrawGesture;
            shapeDrawGesture = null;
            const dx = (event?.e?.clientX ?? gesture.clientX) - gesture.clientX;
            const dy = (event?.e?.clientY ?? gesture.clientY) - gesture.clientY;

            // Rectangle, cercle, highlight, loupe et blur nécessitent un vrai
            // glissement. Un clic seul annule l'aperçu et revient à la sélection.
            if (Math.hypot(dx, dy) < OBJECT_DRAG_THRESHOLD) {
                if (temporaryObject) canvas.remove(temporaryObject);
                temporaryObject = null;
                drawing = false;
                drawStart = null;
                rawDrawStart = null;
                lastDrawingPoint = null;
                freehandPoints = [];

                const clickedObject = gesture.target &&
                    canvas.getObjects().includes(gesture.target) &&
                    gesture.target.fuzeTool !== "border" &&
                    !gesture.target.fuzeBorderOwnerId &&
                    gesture.target.fuzeMagnifierRole !== "connector"
                    ? gesture.target
                    : null;

                setTool("select");
                canvas.discardActiveObject();
                if (clickedObject && clickedObject.selectable !== false) {
                    canvas.setActiveObject(clickedObject);
                }
                canvas.requestRenderAll();
                return;
            }
        }

        finishDrawing();
    });

    // Gestion du curseur move en mode Sélection via les événements DOM natifs.
    // Les événements Fabric mouse:down/mouse:move ne sont pas toujours suffisants :
    // Fabric peut réécrire le curseur après leur émission. Le pointerdown en phase
    // capture identifie la cible avant le traitement Fabric, puis la restauration
    // est réappliquée après celui-ci.
    function isMoveCursorTarget(target) {
        return !!target &&
            target.selectable !== false &&
            target.evented !== false &&
            target.fuzeTool !== "border" &&
            !target.fuzeBorderOwnerId &&
            target.fuzeMagnifierRole !== "connector";
    }

    const moveCursorCanvasElement = canvas.upperCanvasEl;

    moveCursorCanvasElement.addEventListener("pointerdown", event => {
        if (currentTool !== "select" || event.button !== 0) return;

        const target = canvas.findTarget(event);
        if (!isMoveCursorTarget(target)) return;

        objectMoveCursorActive = true;
        updateToolCursor();

        // Laisser Fabric terminer son traitement du pointerdown avant de
        // réimposer le curseur personnalisé.
        window.setTimeout(() => {
            if (objectMoveCursorActive && event.buttons !== 0) {
                updateToolCursor();
            }
        }, 0);
    }, true);

    moveCursorCanvasElement.addEventListener("pointermove", event => {
        if (!objectMoveCursorActive || !(event.buttons & 1)) return;

        requestAnimationFrame(() => {
            if (objectMoveCursorActive) {
                moveCursorCanvasElement.style.cursor = MOVE_CURSOR;
            }
        });
    }, true);

    function endObjectMoveCursor() {
        objectMoveCursorActive = false;
        if (objectMoveCursorFrame) {
            cancelAnimationFrame(objectMoveCursorFrame);
            objectMoveCursorFrame = 0;
        }
        updateToolCursor();
    }

    // pointerup est capturé avant Fabric ; différer la restauration pour qu'elle
    // intervienne après le dernier traitement de curseur de Fabric.
    window.addEventListener("pointerup", () => {
        window.setTimeout(endObjectMoveCursor, 0);
    }, true);
    window.addEventListener("pointercancel", endObjectMoveCursor, true);
    window.addEventListener("blur", endObjectMoveCursor);

    // Fabric peut rétablir son curseur au survol. On réapplique le curseur
    // de l'outil après son traitement ; le curseur move est réservé aux gestes
    // de déplacement réellement engagés.
    canvas.on("mouse:move", event => {
        updateToolCursor(event?.target || null);
    });

    canvas.on("mouse:over", event => {
        updateToolCursor(event?.target || null);
    });

    // Réévaluer le tracé et les poignées dès que Ctrl, Shift ou Alt change,
    // même si la souris reste immobile.
    document.addEventListener("keydown", event => {
        if (event.repeat || !["Control", "Shift", "Alt"].includes(event.key)) return;
        if (drawing && lastDrawingPoint) {
            updateTemporaryDrawingAtPoint(lastDrawingPoint, !!event.shiftKey, !!event.ctrlKey);
        }
        if (draggingArrowHandle && lastArrowHandlePoint) {
            updateArrowHandleAtPoint(lastArrowHandlePoint, !!event.ctrlKey, !!event.shiftKey, !!event.altKey);
        }
    });

    document.addEventListener("keyup", event => {
        if (!["Control", "Shift", "Alt"].includes(event.key)) return;
        if (drawing && lastDrawingPoint) {
            updateTemporaryDrawingAtPoint(lastDrawingPoint, !!event.shiftKey, !!event.ctrlKey);
        }
        if (draggingArrowHandle && lastArrowHandlePoint) {
            updateArrowHandleAtPoint(lastArrowHandlePoint, !!event.ctrlKey, !!event.shiftKey, !!event.altKey);
        }
    });

    /* =====================================================
    NUMÉROS ENTOURÉS
    ===================================================== */

    function getNextFuzeNumber() {
        const used = new Set(
            canvas.getObjects()
                .filter(object => object.fuzeTool === "number" && Number.isInteger(object.fuzeNumber))
                .map(object => object.fuzeNumber)
        );

        let number = 1;
        while (used.has(number)) number++;
        return number;
    }

    function getNumberTextOffset(thickness) {
        return {
            x: thickness * 0.5,
            y: -thickness * 0.5
        };
    }

    function createFuzeNumberObject(number, x, y, fontSize, color, opacity, strokeWidth = getStrokeWidth()) {
        // Un léger décalage optique compense les marges internes de la police Arial.
        const textOffset = fontSize * 0.06;
        const offsets = getNumberTextOffset(strokeWidth);
        const label = new fabric.Text(String(number), {
            left: offsets.x,
            top: -offsets.y,
            originX: "center",
            originY: "center",
            fontFamily: "Arial",
            fontSize,
            fontWeight: "bold",
            fill: color,
            textAlign: "center",
            objectCaching: false
        });
        // Cercle plus compact, avec une marge suffisante pour le texte et son contour.
        const radius = Math.max(10, (label.width / 2) + (strokeWidth / 2) + 3, (label.height / 2) + (strokeWidth / 2) + 3);
        const circle = new fabric.Circle({
            left: -radius,
            top: -radius,
            radius,
            originX: "left",
            originY: "top",
            fill: "rgba(255,255,255,0)",
            stroke: color,
            strokeWidth,
            objectCaching: false
        });

        const group = new fabric.Group([circle, label], {
            left: x,
            top: y,
            originX: "center",
            originY: "center",
            opacity,
            selectable: false,
            evented: false,
            objectCaching: false,
            subTargetCheck: false
        });
        group.fuzeTool = "number";
        group.fuzeNumber = number;
        return group;
    }

    function addNumberAt(event) {
        const pointer = canvas.getScenePoint(event);
        const number = getNextFuzeNumber();
        const object = createFuzeNumberObject(
            number,
            pointer.x,
            pointer.y,
            getFontSize(),
            getColor(),
            getStrokeOpacity(),
            getStrokeWidth()
        );

        canvas.add(object);
        canvas.requestRenderAll();
        trackEvent("element_created", { element_type: "number" });
        saveHistory();
        updateEmptyMessage();
        updateStatus(FUZE_LANGUAGE === "en" ? `Number added: ${number}` : `Numéro ajouté : ${number}`);
    }

    function updateFuzeNumberStyle(object, source = null) {
        if (!object || object.fuzeTool !== "number") return;

        const color = getColor();
        const opacity = getStrokeOpacity();
        const objects = object.getObjects();
        const circle = objects.find(item => item.type === "circle");
        const label = objects.find(item => item.type === "text");
        if (!circle || !label) return;

        circle.set({
            stroke: color,
            strokeWidth: getStrokeWidth()
        });
        label.set({ fill: color });
        object.set({ opacity });

        if (source === "fontSize") {
            const replacement = createFuzeNumberObject(
                object.fuzeNumber,
                object.left,
                object.top,
                getFontSize(),
                color,
                opacity
            );
            replacement.set({
                angle: object.angle,
                scaleX: object.scaleX,
                scaleY: object.scaleY,
                selectable: true,
                evented: true
            });
            const index = canvas.getObjects().indexOf(object);
            if (index !== -1) {
                canvas.remove(object);
                canvas.insertAt(index, replacement);
                canvas.setActiveObject(replacement);
            }
        }
        object.setCoords();
        canvas.requestRenderAll();
        saveHistory();
        updateStatus(FUZE_LANGUAGE === "en" ? "Number updated" : "Numéro modifié");
    }

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

                    // On utilise l'origine haute et on recalcule explicitement
                    // le haut à partir de la hauteur réelle du texte après sa
                    // construction. Cela évite les écarts liés aux métriques
                    // internes de Fabric selon la taille de police.
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

                    // Les nouveaux textes sont centrés par défaut.
                    textAlign:
                        "center",

                    editable:
                        true,


                    /* =====================================
                    HALO BLANC
                    ===================================== */

                    stroke:
                        "#ffffff",

                    // Le contour blanc et son halo suivent la taille du texte.
                    strokeWidth:
                        Math.max(2, getFontSize() * 0.25),

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
                                Math.max(3, getFontSize() * 0.3125),

                            offsetX:
                                0,

                            offsetY:
                                0
                        })
                }
            );


        /* =================================================
        ANCRAGE SUR LE POINT CHAUD DU CURSEUR
        ================================================= */

        // Le coin inférieur gauche de la boîte du texte doit rester exactement
        // au point cliqué, quelle que soit la taille de police.
        // On le calcule après construction, lorsque Fabric a calculé text.height.
        text.initDimensions();
        text.set({
            left: pointer.x,
            top: pointer.y - text.height,
            originX: "left",
            originY: "top"
        });
        text.setCoords();

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
        // Le mode Texte reste actif pour permettre plusieurs créations.
        // S ou Échap permet de revenir explicitement au mode Select.
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

    // Échap doit quitter immédiatement l'édition du texte Fabric et revenir
    // au mode Sélection. Le listener en capture est volontaire : le textarea
    // caché utilisé par Fabric peut intercepter la touche avant le listener
    // clavier général de shortcuts.js.
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        const activeText = canvas.getActiveObject();
        const textBeingEdited =
            (editingText && editingText.isEditing && editingText) ||
            (activeText && activeText.isEditing && activeText);

        if (!textBeingEdited) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        textBeingEdited.exitEditing();
        if (currentTool !== "select") setTool("select");
        canvas.requestRenderAll();
    }, true);


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
            const object = event.target;

            // Un redimensionnement, une rotation ou un déplacement via les
            // contrôles Fabric doit quitter l'outil de dessin dès le premier
            // mouvement effectif, sans interrompre la transformation en cours.
            if (currentTool !== "select" &&
                ["object:moving", "object:scaling", "object:rotating"].includes(eventName)) {
                setTool("select");
            }

            if (eventName === "object:moving" && object && event.e?.shiftKey) {
                // Aimante la position de l'objet ou du groupe sélectionné
                // à la grille de 10 px tant que Shift est enfoncée.
                const snappedLeft = snapToGrid(object.left);
                const snappedTop = snapToGrid(object.top);
                if (object.left !== snappedLeft || object.top !== snappedTop) {
                    object.set({ left: snappedLeft, top: snappedTop });
                    object.setCoords();
                }
            }

            if (object && object.type === "image") {
                syncImageBorder(object);
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
                isEditableArrow(object)
            ) {

                // Les flèches s'éditent uniquement avec leurs handles dédiés.
                // Ne pas afficher le cadre Fabric (poignées de taille/rotation),
                // notamment après le rechargement d'un fichier .fuze.
                object.set({
                    hasControls: false,
                    hasBorders: false,
                    lockScalingX: true,
                    lockScalingY: true,
                    lockRotation: true
                });

                editingArrow =
                    object;

                showArrowHandles(
                    object
                );

            } else {

                editingArrow = null;

                hideArrowHandles();
            }


            rememberActiveSelectionPosition(canvas.getActiveObject());
            syncControlsFromSelectedObject();
            queueMicrotask(() => syncControlsFromSelectedObject());
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
                isEditableArrow(object)
            ) {

                // Les flèches s'éditent uniquement avec leurs handles dédiés.
                // Ne pas afficher le cadre Fabric (poignées de taille/rotation),
                // notamment après le rechargement d'un fichier .fuze.
                object.set({
                    hasControls: false,
                    hasBorders: false,
                    lockScalingX: true,
                    lockScalingY: true,
                    lockRotation: true
                });

                editingArrow =
                    object;

                showArrowHandles(
                    object
                );

            } else {

                editingArrow = null;

                hideArrowHandles();
            }


            rememberActiveSelectionPosition(canvas.getActiveObject());
            syncControlsFromSelectedObject();
            queueMicrotask(() => syncControlsFromSelectedObject());
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

            // Fabric déclenche object:moving sur l'ActiveSelection lors d'un
            // déplacement multiple, et non sur chacun de ses objets enfants.
            // La matrice de la flèche inclut la transformation du groupe :
            // recalculer sa position permet de suivre les handles en temps réel.
            if (isActiveSelectionObject(object)) {
                // Le groupe ne fait que translater ses enfants (pas de scale/rotation).
                // On applique exactement ce delta aux coordonnées de scène des flèches.
                // Cela évite les conversions de matrice qui désynchronisent les handles
                // lorsque Fabric détruit ensuite l'ActiveSelection.
                if (!Number.isFinite(object.__fuzeLastLeft) || !Number.isFinite(object.__fuzeLastTop)) {
                    rememberActiveSelectionPosition(object);
                }

                const dx = object.left - object.__fuzeLastLeft;
                const dy = object.top - object.__fuzeLastTop;
                translateActiveSelectionArrowEndpoints(object, dx, dy);
                object.__fuzeLastLeft = object.left;
                object.__fuzeLastTop = object.top;

                if (editingArrow && object.getObjects().includes(editingArrow)) {
                    positionArrowHandles(editingArrow);
                }
                return;
            }

            if (
                !isEditableArrow(object)
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
            if (object.arrowType === "curved") {
                object.cx += dx;
                object.cy += dy;
            }


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

            // Repositionnement final après le déplacement de l'ActiveSelection.
            if (isActiveSelectionObject(object)) {
                // Les coordonnées x1/y1/x2/y2 ont déjà été translatées à chaque
                // événement object:moving. Ne pas les recalculer ici : à ce stade,
                // Fabric peut encore exposer les transformations temporaires du groupe.
                rememberActiveSelectionPosition(object);
                if (editingArrow && object.getObjects().includes(editingArrow)) {
                    positionArrowHandles(editingArrow);
                }
                return;
            }

            if (
                isEditableArrow(object)
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


    // Événement Fabric standard déclenché à la fin du déplacement du groupe.
    // On mémorise les coordonnées de scène de chaque flèche avant la
    // destruction de l'ActiveSelection lors de la désélection.
    canvas.on("object:modified", event => {
        const object = event.target;

        // Fabric applique parfois le facteur de transformation au contour
        // lors du redimensionnement. On reporte l'échelle dans la géométrie
        // et on conserve strokeWidth à sa valeur initiale.
        if (object && object.strokeWidth > 0 && object.strokeUniform !== true &&
            ["rect", "ellipse"].includes(object.type)) {
            object.set({ strokeUniform: true });
        }
        if (object && object.strokeWidth > 0 && ["rect", "ellipse"].includes(object.type)) {
            const sx = Number(object.scaleX) || 1;
            const sy = Number(object.scaleY) || 1;
            if (Math.abs(sx - 1) > 0.0001 || Math.abs(sy - 1) > 0.0001) {
                if (object.type === "rect") {
                    object.set({ width: object.width * sx, height: object.height * sy, scaleX: 1, scaleY: 1 });
                } else {
                    object.set({ rx: object.rx * sx, ry: object.ry * sy, scaleX: 1, scaleY: 1 });
                }
                object.setCoords();
            }
        }

        if (isActiveSelectionObject(object)) {
            // Les coordonnées des flèches ont été mises à jour par delta pendant
            // le déplacement. On ne touche pas à leur géométrie au commit.
            rememberActiveSelectionPosition(object);
            if (editingArrow && object.getObjects().includes(editingArrow)) {
                positionArrowHandles(editingArrow);
            }
            delete object.__fuzeLastLeft;
            delete object.__fuzeLastTop;
        }
    });

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
                    "grey";


                canvas.renderAll();


                saveHistory();

                updateEmptyMessage();

                updateStatus(
                    "Canvas effacé"
                );
            }
        );


