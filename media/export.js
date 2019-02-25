$(() => {
    const vscode = acquireVsCodeApi();

    // Set VS Code state
    let state = JSON.parse(document.getElementById('vscode-svg-preview-data').getAttribute('data-state'));
    vscode.setState(state);
    let $exprt = $('#export');
    let $canvas = $('#canvas');
    let $image = $('#image');
    let $svg = $('svg');
    let $width = $('#width');
    let $height = $('#height');
    $width.val(Math.round($svg.width()));
    $height.val(Math.round($svg.height()));
    $width.keyup(handler($width)).mouseup(handler($width));
    $height.keyup(handler($height)).mouseup(handler($height));
    update();
    $exprt.on('click', () => vscode.postMessage({
        command: 'exportData',
        body: {
            dataUrl: $canvas[0].toDataURL('image/png'),
            output: decodeURIComponent($exprt.data('output')),
            resource: state.resource
        }
    }));

    function update() {
        let ew = parseInt($width.val(), 10),
            eh = parseInt($height.val(), 10);
        $canvas.attr({
            width: ew,
            height: eh
        });
        let context = $canvas[0].getContext('2d');
        context.clearRect(0, 0, ew, eh);
        let scale = Math.min(ew / $svg.width(), eh / $svg.height());
        let sw = Math.round($svg.width() * scale);
        let sh = Math.round($svg.height() * scale);
        context.drawImage(
            $image[0],
            (ew - sw) / 2,
            (eh - sh) / 2,
            sw,
            sh
        );
    }

    function handler($elem) {
        return function () {
            if (parseInt($elem.val(), 10) > 0) {
                return update();
            }
            $exprt.attr({
                href: '#'
            });
        }
    }
});

$(() => {
    $('input').focusin(function () {
        $(this).parent().addClass('active');
    }).focusout(function () {
        $(this).parent().removeClass('active');
    })
});