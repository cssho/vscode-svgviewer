'use strict';

import * as vscode from 'vscode';
import fs = require('fs')

export class SvgDocumentContentProvider implements vscode.TextDocumentContentProvider {
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

    protected extractSnippet(): string {
        let editor = vscode.window.activeTextEditor;
        let text = editor ? editor.document.getText() : '';
        return this.snippet(text);
    }

    private errorSnippet(error: string): string {
        return `
                <body>
                    ${error}
                </body>`;
    }

    protected snippet(properties): string {
        let showTransGrid = vscode.workspace.getConfiguration('svgviewer').get('transparencygrid');
        let transparencyGridCss = '';
        if (showTransGrid) {
            transparencyGridCss = `
<style type="text/css">
.svgbg img {
  background:initial;
  background-image: url(data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAeUlEQVRYR+3XMQ4AIQhEUTiU9+/hUGy9Wk2G8luDIS8EMWdmYvF09+JtEUmBpieCJiA96AIiiKAswEsik10JCCIoCrAsiGBPOIK2YFWt/knOOW5Nv/ykQNMTQRMwEERQFWAOqmJ3PIIIigIMahHs3ahZt0xCetAEjA99oc8dGNmnIAAAAABJRU5ErkJggg==);
  background-position: left,top;
}
</style>`;
        }
        return `<!DOCTYPE html><html><head>${transparencyGridCss}</head><body><div class="svgbg"><img src="data:image/svg+xml,${encodeURIComponent(properties)}"></div></body></html>`;
    }
}

export class SvgFileContentProvider extends SvgDocumentContentProvider {
    filename: string;
    constructor(previewUri: vscode.Uri, filename: string) {
        super();
        this.filename = filename;
        vscode.workspace.createFileSystemWatcher(this.filename, true, false, true).onDidChange((e: vscode.Uri) => {
            this.update(previewUri);
        });
    }

    protected extractSnippet(): string {
        let fileText = fs.readFileSync(this.filename, 'utf8');
        let text = fileText ? fileText : '';
        return super.snippet(text);
    }
}