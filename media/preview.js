const regexp = /scale\(([0-9\.]+)\)/g;

const vscode = acquireVsCodeApi();

// Set VS Code state
let state = JSON.parse(document.getElementById('vscode-svg-preview-data').getAttribute('data-state'));
vscode.setState(state);

window.addEventListener("load", function () {
    document.onwheel = function (event) {
        if (event.ctrlKey) {
            if (event.wheelDeltaY < 0) zoomOut();
            else zoomIn();
        }
    }
    document.getElementById("zoom_in").addEventListener('click', zoomIn);
    document.getElementById("zoom_out").addEventListener('click', zoomOut);
    document.getElementById("zoom_reset").addEventListener('click', zoomReset);
    svgimg.style.transform = 'scale(' + state.zoom + ')';
}, false);

function zoomIn() {
    var svgimg = document.getElementById('svgimg');
    var zoomFloat = currentZoomValue(svgimg);
    zoomFloat += zoomFloat * 0.1;
    
    setZoom(svgimg, zoomFloat);
}

function zoomOut() {
    var svgimg = document.getElementById('svgimg');
    var zoomFloat = currentZoomValue(svgimg);
    zoomFloat -= zoomFloat * 0.1;
    if (zoomFloat < 0.1) return;
    setZoom(svgimg, zoomFloat);
};

function setZoom(svgimg, zoomFloat) {
    svgimg.style.transform = 'scale(' + zoomFloat + ')';
    state.zoom = zoomFloat;
    vscode.setState(state);
    
    vscode.postMessage({
        command: 'setState',
        body: state
    });
}

function zoomReset() {
    var svgimg = document.getElementById('svgimg');
    setZoom(svgimg, 1.0);
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
