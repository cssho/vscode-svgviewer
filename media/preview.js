const regexp = /scale\(([0-9\.]+)\)/g;
window.addEventListener("load", function () {
    document.onwheel = function (event) {
        if (event.ctrlKey) {
            if (event.wheelDeltaY < 0) zoomOut();
            else zoomIn();
        }
    }
    document.getElementById("zoom_in").addEventListener('click', zoomIn);
    document.getElementById("zoom_out").addEventListener('click', zoomOut);
}, false);

function zoomIn() {
    var svgimg = document.getElementById('svgimg');
    var zoomFloat = currentZoomValue(svgimg);
    zoomFloat += zoomFloat * 0.1;
    svgimg.style.transform = 'scale(' + zoomFloat + ')';
}

function zoomOut() {
    var svgimg = document.getElementById('svgimg');
    var zoomFloat = currentZoomValue(svgimg);
    zoomFloat -= zoomFloat * 0.1;
    if (zoomFloat < 0.1) return;
    svgimg.style.transform = 'scale(' + zoomFloat + ')';
};

function currentZoomValue(svgimg) {
    var zoom;
    if (svgimg.style.transform) {
        var array;
        while ((array = regexp.exec(svgimg.style.transform)) !== null) {
            zoom = array[1];
        }
    } else
        zoom = '1.0';
    var zoomFloat = parseFloat(zoom);
    return zoomFloat;
}