/* =====================================================
   FORMAT DE PROJET FUZE (.fuze) — JSON versionné.
   Le document Fabric conserve les objets, images intégrées,
   propriétés personnalisées et l'ordre des calques.
===================================================== */
const FUZE_FILE_VERSION = 1;
const fuzeFileInput = document.getElementById("fuzeFileInput");
let currentFuzeFileHandle = null;
let currentFuzeFileName = null;

function buildFuzeDocument() {
    return {
        format: "FUZE",
        version: FUZE_FILE_VERSION,
        app: "Fuze",
        canvas: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            data: canvas.toObject(SERIALIZED_PROPERTIES)
        }
    };
}

function serializeFuzeDocument() {
    return JSON.stringify(buildFuzeDocument(), null, 2);
}

async function writeFuzeToHandle(handle) {
    const writable = await handle.createWritable();
    try {
        await writable.write(new Blob(
            [serializeFuzeDocument()],
            { type: "application/vnd.fuze+json;charset=utf-8" }
        ));
        await writable.close();
    } catch (error) {
        try { await writable.abort(); } catch (_) {}
        throw error;
    }
}

async function saveFuzeFile() {
    try {
        // Si le document vient d'être ouvert, réécrire directement le même fichier.
        if (currentFuzeFileHandle) {
            await writeFuzeToHandle(currentFuzeFileHandle);
            updateStatus("Fichier Fuze enregistré");
            return;
        }

        // Demander explicitement le nom et l'emplacement lors du premier enregistrement.
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: currentFuzeFileName || "monfichier.fuze",
                types: [{
                    description: "Fichier Fuze",
                    accept: { "application/vnd.fuze+json": [".fuze"] }
                }]
            });
            await writeFuzeToHandle(handle);
            currentFuzeFileHandle = handle;
            currentFuzeFileName = handle.name;
            updateStatus("Fichier Fuze enregistré");
            return;
        }

        // Repli pour les navigateurs sans File System Access API :
        // le téléchargement déclenche la boîte de dialogue du navigateur
        // lorsque son réglage « demander où enregistrer » est activé.
        const blob = new Blob(
            [serializeFuzeDocument()],
            { type: "application/vnd.fuze+json;charset=utf-8" }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = currentFuzeFileName || "monfichier.fuze";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        updateStatus("Téléchargement du fichier Fuze lancé");
    } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Erreur d’enregistrement Fuze :", error);
        updateStatus("Impossible d’enregistrer le fichier Fuze");
        alert("Impossible d’enregistrer le fichier Fuze.");
    }
}

async function loadFuzeDocumentText(text, fileName, handle = null) {
    const documentData = JSON.parse(text);
    if (
        documentData?.format !== "FUZE" ||
        documentData?.version !== FUZE_FILE_VERSION ||
        !documentData?.canvas?.data ||
        !Array.isArray(documentData.canvas.data.objects)
    ) {
        throw new Error("Format Fuze invalide ou version non prise en charge");
    }

    editingText = null;
    editingTextChanged = false;
    editingArrow = null;
    hideArrowHandles();

    restoringHistory = true;
    try {
        await canvas.loadFromJSON(documentData.canvas.data);
        canvas.setDimensions({
            width: CANVAS_WIDTH * zoom,
            height: CANVAS_HEIGHT * zoom
        });
        canvas.setZoom(zoom);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    } finally {
        restoringHistory = false;
    }

    currentFuzeFileHandle = handle;
    currentFuzeFileName = fileName || "monfichier.fuze";

    history = [];
    historyIndex = -1;
    saveHistory();
    updateEmptyMessage();
    updateUndoRedoButtons();
    updateStatus("Fichier Fuze ouvert");
}

async function openFuzeFile(file, handle = null) {
    if (!file) return;
    try {
        await loadFuzeDocumentText(await file.text(), file.name, handle);
    } catch (error) {
        console.error("Erreur d’ouverture Fuze :", error);
        updateStatus("Impossible d’ouvrir ce fichier Fuze");
        alert("Ce fichier Fuze est invalide ou ne peut pas être lu.");
    } finally {
        fuzeFileInput.value = "";
    }
}

async function chooseFuzeFile() {
    // Avec cette API, on conserve le handle pour permettre Save sans nouvelle boîte.
    if (window.showOpenFilePicker) {
        try {
            const [handle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{
                    description: "Fichier Fuze",
                    accept: { "application/vnd.fuze+json": [".fuze"] }
                }]
            });
            if (handle) await openFuzeFile(await handle.getFile(), handle);
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Erreur d’ouverture Fuze :", error);
                alert("Impossible d’ouvrir ce fichier Fuze.");
            }
        }
    } else {
        fuzeFileInput.click();
    }
}

fuzeFileInput.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) openFuzeFile(file);
});

document.addEventListener("click", event => {
    const actionButton = event.target.closest('[data-action="open-fuze"], [data-action="save-fuze"]');
    if (!actionButton) return;
    if (actionButton.dataset.action === "open-fuze") chooseFuzeFile();
    else saveFuzeFile();
    document.querySelectorAll(".toolbar-menu").forEach(menu => menu.removeAttribute("open"));
});
