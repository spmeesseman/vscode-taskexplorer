
(function () {

    let toggleBtn = document.getElementById("btnToggleReleaseNotes");

    const showReleaseNotes = () => {
        var x = document.getElementById("releaseNotesDiv");
        var showing = x.classList.toggle('is-show');
        toggleBtn.classList.remove(!showing ? "fa-chevron-down" : "fa-chevron-up");
        toggleBtn.classList.add(!showing ? "fa-chevron-up" : "fa-chevron-down");
    };

    toggleBtn = document.getElementById("btnToggleReleaseNotes");
    if (toggleBtn)
    {
        toggleBtn.onclick = showReleaseNotes;
    }

}());
