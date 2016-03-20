'use strict';

import * as vscode from 'vscode';

const fs = require('pn/fs');
const svg2png = require('svg2png');
const tmp = require('tmp');


export function activate(context: vscode.ExtensionContext) {

    console.log('SVG Viewer is now active!');

    let previewUri = vscode.Uri.parse('svg-preview://authority/svg-preview');

    class SvgDocumentContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

        public provideTextDocumentContent(uri: vscode.Uri): string {
            return this.createSvgSnippet();
        }

        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }

        public update(uri: vscode.Uri) {
            this._onDidChange.fire(uri);
        }

        private createSvgSnippet() {

            return this.extractSnippet();
        }

        private extractSnippet(): string {
            let editor = vscode.window.activeTextEditor;
            let text = editor.document.getText();
            return this.snippet(text);
        }

        private errorSnippet(error: string): string {
            return `
                <body>
                    ${error}
                </body>`;
        }

        private snippet(properties): string {
            let showTransGrid = vscode.workspace.getConfiguration('svgviewer').get('transparencygrid');
            let transparencyGridCss = '';
            if(showTransGrid)
            {
                transparencyGridCss = `
<style type="text/css">
.svgbg svg {
  background:initial;
  background-image: url(data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAeUlEQVRYR+3XMQ4AIQhEUTiU9+/hUGy9Wk2G8luDIS8EMWdmYvF09+JtEUmBpieCJiA96AIiiKAswEsik10JCCIoCrAsiGBPOIK2YFWt/knOOW5Nv/ykQNMTQRMwEERQFWAOqmJ3PIIIigIMahHs3ahZt0xCetAEjA99oc8dGNmnIAAAAABJRU5ErkJggg==);
  background-position: left,top;
}
</style>`;
            }
            return `<!DOCTYPE html><html><head>${transparencyGridCss}</head><body><div class="svgbg">${properties}</div></body></html>`;
        }
    }

    let provider = new SvgDocumentContentProvider();
    let registration = vscode.workspace.registerTextDocumentContentProvider('svg-preview', provider);

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document === vscode.window.activeTextEditor.document) {
            provider.update(previewUri);
        }
    });

    vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (e.textEditor === vscode.window.activeTextEditor) {
            provider.update(previewUri);
        }
    })

    let open = vscode.commands.registerTextEditorCommand('svgviewer.open', (te, t) => {
        if (checkNoSvg(te)) return;
        return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two)
            .then(s => console.log('done.'), vscode.window.showErrorMessage);

    });

    context.subscriptions.push(open);

    let saveas = vscode.commands.registerTextEditorCommand('svgviewer.saveas', (te, t) => {
        if (checkNoSvg(te)) return;
        let editor = vscode.window.activeTextEditor;
        let text = editor.document.getText();
        let tmpobj = tmp.fileSync();
        let pngpath = editor.document.uri.fsPath.replace('.svg', '.png');
        fs.writeFile(tmpobj.name, text, 'utf-8')
            .then(fs.readFile(tmpobj.name)
                .then(svg2png)
                .then(buffer => fs.writeFile(pngpath, buffer))
                .catch(e => console.error(e))
                .then(tmpobj.removeCallback())
                .then(vscode.window.showInformationMessage('export done. ' + pngpath)));
    });

    context.subscriptions.push(saveas);
}
function checkNoSvg(editor: vscode.TextEditor) {

    let isNGType = !(editor.document.languageId === 'xml') || editor.document.getText().indexOf('</svg>') < 0;
    if (isNGType) {
        vscode.window.showWarningMessage("Active editor doesn't show a SVG document - no properties to preview.");
    }
    return isNGType;
}

export function deactivate() {
}