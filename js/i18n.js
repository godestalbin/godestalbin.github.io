
/* ===== Extracted from original script.js, lines 1-123 ===== */
"use strict";

/* =====================================================
   INTERNATIONALISATION — français / anglais
   La langue suit la préférence du navigateur.
===================================================== */
const FUZE_LANGUAGE = (navigator.language || navigator.userLanguage || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
document.documentElement.lang = FUZE_LANGUAGE;

const FUZE_I18N = {
    fr: {
        file: "Fichier", edit: "Édition", help: "Aide", helpFeatures: "Aide et fonctionnalités", openImage: "Ouvrir une image",
        copyAnnotated: "Copier l’image annotée", savePng: "Enregistrer en PNG",
        clearPanel: "Effacer le canvas", select: "Sélection", text: "Texte",
        arrow: "Flèche", rectangle: "Rectangle", circle: "Cercle", felt: "Feutre",
        highlight: "Highlight", imageSize: "Taille image",
        highlight: "Highlight", blur: "Brouillage", imageSize: "Taille image",
        color: "Couleur", thickness: "Épaisseur", transparency: "Transparence",
        textSize: "Taille du texte", zoom: "Zoom", toolbar: "Outils Fuze",
        imageSizeTitle: "Taille appliquée aux images chargées ou collées",
        imageSizeAria: "Taille de l’image", strokeColor: "Couleur du trait",
        eyedropperTitle: "Prélever une couleur sur le canvas (Échap pour annuler)",
        eyedropper: "Pipette", thicknessTitle: "Épaisseur du trait", thicknessAria: "Épaisseur",
        transparencyTitle: "Transparence du surlignage", transparencyAria: "Transparence",
        textSizeTitle: "Taille du texte", zoomTitle: "Niveau de zoom",
        arrowStart: "Début de la flèche", arrowEnd: "Pointe de la flèche",
        addImage: "Ajoutez une image pour commencer", ready: "Prêt"
    },
    en: {
        file: "File", edit: "Edit", help: "Help", helpFeatures: "Help & features", openImage: "Open image",
        copyAnnotated: "Copy annotated image", savePng: "Save as PNG",
        clearPanel: "Clear canvas", select: "Select", text: "Text",
        arrow: "Arrow", rectangle: "Rectangle", circle: "Circle", felt: "Felt",
        highlight: "Highlight", imageSize: "Image size",
        highlight: "Highlight", blur: "Blur", imageSize: "Image size",
        color: "Color", thickness: "Thickness", transparency: "Transparency",
        textSize: "Text size", zoom: "Zoom", toolbar: "Fuze tools",
        imageSizeTitle: "Size applied to loaded or pasted images",
        imageSizeAria: "Image size", strokeColor: "Stroke color",
        eyedropperTitle: "Pick a color from the canvas (Esc to cancel)",
        eyedropper: "Eyedropper", thicknessTitle: "Stroke thickness", thicknessAria: "Thickness",
        transparencyTitle: "Highlight transparency", transparencyAria: "Transparency",
        textSizeTitle: "Text size", zoomTitle: "Zoom level",
        arrowStart: "Arrow start", arrowEnd: "Arrow tip",
        addImage: "Add an image to get started", ready: "Ready"
    }
};
const fuzeT = key => (FUZE_I18N[FUZE_LANGUAGE] || FUZE_I18N.fr)[key] || key;

function applyFuzeLanguage() {
    const setSummary = (selector, key) => {
        const el = document.querySelector(selector);
        if (el) {
            const firstText = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
            if (firstText) firstText.textContent = fuzeT(key) + " ";
        }
    };
    setSummary("#fileMenu > summary", "file");
    setSummary("#editMenu > summary", "edit");
    const helpButton = document.getElementById("openHelpButton");
    if (helpButton) helpButton.textContent = fuzeT("help");
    const menuLabels = [
        ['[data-action="open-image"]', 'openImage'],
        ['[data-action="copy-png"]', 'copyAnnotated'],
        ['[data-action="save-png"]', 'savePng'],
        ['[data-action="clear-panel"]', 'clearPanel'],
        ['[data-tool="select"]', 'select'], ['[data-tool="text"]', 'text'],
        ['[data-tool="arrow"]', 'arrow'], ['[data-tool="rectangle"]', 'rectangle'],
        ['[data-tool="circle"]', 'circle'], ['[data-tool="felt"]', 'felt'],
        ['[data-tool="highlight"]', 'highlight'],
        ['[data-tool="blur"]', 'blur']
    ];
    for (const [selector, key] of menuLabels) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const firstText = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
        if (firstText) firstText.textContent = fuzeT(key) + " ";
    }
    const toolbarLabels = [
        ['.image-size-control .toolbar-label', 'imageSize'],
        ['.color-control .toolbar-label', 'color'],
        ['.compact-control .toolbar-label', 'thickness'],
        ['.transparency-control .toolbar-label', 'transparency'],
        ['label.control-group.compact-control:nth-of-type(1) .toolbar-label', 'thickness'],
        ['.zoom-control .toolbar-label', 'zoom']
    ];
    for (const [selector, key] of toolbarLabels) {
        const el = document.querySelector(selector);
        if (el) el.textContent = fuzeT(key);
    }
    // The two compact controls have the same CSS class; identify text-size control by its input.
    const fontLabel = document.querySelector('label:has(#fontSizeInput) .toolbar-label');
    if (fontLabel) fontLabel.textContent = fuzeT('textSize');
    const imageLabel = document.querySelector('label:has(#imageResizeSelect)');
    if (imageLabel) imageLabel.title = fuzeT('imageSizeTitle');
    const color = document.getElementById('colorInput');
    if (color) { color.setAttribute('aria-label', fuzeT('strokeColor')); color.title = fuzeT('strokeColor'); }
    const eyedropper = document.getElementById('eyedropperButton');
    if (eyedropper) { eyedropper.title = fuzeT('eyedropperTitle'); eyedropper.setAttribute('aria-label', fuzeT('eyedropper')); }
    const thicknessLabel = document.querySelector('label:has(#strokeWidthInput)');
    if (thicknessLabel) thicknessLabel.title = fuzeT('thicknessTitle');
    const thickness = document.getElementById('strokeWidthInput');
    if (thickness) thickness.setAttribute('aria-label', fuzeT('thicknessAria'));
    const opacityLabel = document.querySelector('label:has(#strokeOpacityInput)');
    if (opacityLabel) opacityLabel.title = fuzeT('transparencyTitle');
    const opacity = document.getElementById('strokeOpacityInput');
    if (opacity) opacity.setAttribute('aria-label', fuzeT('transparencyAria'));
    const fontSize = document.getElementById('fontSizeInput');
    if (fontSize) fontSize.title = fuzeT('textSizeTitle');
    const zoomSelect = document.getElementById('zoomSelect');
    if (zoomSelect) zoomSelect.setAttribute('aria-label', fuzeT('zoomTitle'));
    const start = document.getElementById('arrowHandleStart');
    const end = document.getElementById('arrowHandleEnd');
    if (start) start.title = fuzeT('arrowStart');
    if (end) end.title = fuzeT('arrowEnd');
    const empty = document.getElementById('emptyMessage');
    if (empty) empty.textContent = fuzeT('addImage');
    const initialStatus = document.getElementById('statusText');
    if (initialStatus) initialStatus.textContent = fuzeT('ready');
    const toolbar = document.querySelector('.toolbar[role="toolbar"]');
    if (toolbar) toolbar.setAttribute('aria-label', fuzeT('toolbar'));
}



