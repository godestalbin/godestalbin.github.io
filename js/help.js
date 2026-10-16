/* Help modal: keep Fuze open while displaying the standalone, crawlable help page. */
(() => {
    const modal = document.getElementById("helpModal");
    const openButton = document.getElementById("openHelpButton");
    const closeButton = document.getElementById("closeHelpButton");
    const frame = document.getElementById("helpFrame");
    if (!modal || !openButton || !closeButton || !frame) return;

    let previousFocus = null;

    function openHelp() {
        previousFocus = document.activeElement;
        frame.src = "help.html";
        modal.hidden = false;
        document.body.classList.add("help-modal-open");
        closeButton.focus();
    }

    function closeHelp() {
        if (modal.hidden) return;
        modal.hidden = true;
        document.body.classList.remove("help-modal-open");
        frame.src = "about:blank";
        if (previousFocus && typeof previousFocus.focus === "function") {
            previousFocus.focus();
        } else {
            openButton.focus();
        }
    }

    openButton.addEventListener("click", openHelp);
    closeButton.addEventListener("click", closeHelp);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeHelp();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.hidden) {
            event.preventDefault();
            event.stopPropagation();
            closeHelp();
        }
    }, true);
})();
