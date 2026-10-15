
/* ===== Extracted from original script.js, lines 124-218 ===== */
/* =====================================================
   CONSTANTES
===================================================== */

applyFuzeLanguage();

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 750;

const DEFAULT_COLOR = "#4751e1";
const DEFAULT_STROKE_WIDTH = 6;
const DEFAULT_STROKE_WIDTHS = { rectangle: 6, circle: 6, highlight: 2, felt: 10 };


/* =====================================================
   ÉTAT
===================================================== */

let currentTool = "select";

let zoom = 1;

let drawing = false;
let drawStart = null;
let temporaryObject = null;
let freehandPoints = [];
let blurUpdateInProgress = false;

let history = [];
let historyIndex = -1;
let restoringHistory = false;

let draggingArrowHandle = null;
let editingArrow = null;
let editingText = null;
let editingTextChanged = false;

/* =====================================================
   DOM
===================================================== */

const canvasElement =
    document.getElementById("canvas");

const stage =
    document.getElementById("stage");

const workspace =
    document.getElementById("workspace");

const emptyMessage =
    document.getElementById("emptyMessage");

const statusText =
    document.getElementById("statusText");

const zoomStatus =
    document.getElementById("zoomStatus");

const colorInput =
    document.getElementById("colorInput");

const eyedropperButton =
    document.getElementById("eyedropperButton");

let eyedropperActive = false;

const strokeWidthInput =
    document.getElementById("strokeWidthInput");

const strokeOpacityInput =
    document.getElementById("strokeOpacityInput");
const strokeOpacityValue =
    document.getElementById("strokeOpacityValue");

const fontSizeInput =
    document.getElementById("fontSizeInput");

const imageInput =
    document.getElementById("imageInput");

const imageResizeSelect =
    document.getElementById("imageResizeSelect");

function getImageImportScale() {
    const scale = Number(imageResizeSelect.value);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

const arrowHandleStart =
    document.getElementById("arrowHandleStart");

const arrowHandleEnd =
    document.getElementById("arrowHandleEnd");

