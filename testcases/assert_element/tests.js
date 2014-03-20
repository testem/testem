test("DOM", function () {
    // Imagine that we're creating DOM nodes, somehow
    var modalDialog = document.createElement("div");
    modalDialog.id = "modal";
    document.body.appendChild(modalDialog);

    // Now imagine that something happens, like open the dialog or whatever...
    // and we want to check that what's in the DOM is the reference we have
    equal(modalDialog, document.getElementById("modal"));
});