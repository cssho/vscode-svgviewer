'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseContentProvider } from './svgProvider';

export class ExportDocumentContentProvider extends BaseContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    public async provideTextDocumentContent(uri: vscode.Uri, state: any): Promise<string> {
        let docUri = vscode.Uri.parse(uri.query);
        const document = await vscode.workspace.openTextDocument(docUri);
        return this.snippet(document, state);
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }
    
    private snippet(document: vscode.TextDocument, state: any): string {
        let showTransGrid = vscode.workspace.getConfiguration('svgviewer').get('transparencygrid');
        let css = `<link rel="stylesheet" type="text/css" href="${this.getPath('media/export.css')}">`;
        let jquery = `<script src="${this.getPath('node_modules/jquery/dist/jquery.js')}"></script>`;
        let exportjs = `<script src="${this.getPath('media/export.js')}"></script>`;
        let output = document.uri.fsPath.replace('.svg', '.png');
        let exportButton = `<a id="export" data-output="${encodeURIComponent(output)}" href="#" class="button">Export PNG</a>`;
        let canvas = `<canvas id="canvas" class="svgbg" data-showtransgrid="${showTransGrid}"></canvas>`;
        let svg = document.getText();
        let image = `<img id="image" src="${'data:image/svg+xml,' + encodeURIComponent(document.getText())}" alt="svg image" />`
        let width = `<div class="wrapper"><label for="width" class="label-name">Width</label><input id="width" type="number" placeholder="width"><label for="width"> px</label></div>`;
        let height = `<div class="wrapper"><label for="height" class="label-name">Height</label><input id="height" type="number" placeholder="height"><label for="height"> px</label></div>`;
        let options = `<h1>Options</h1><div class="form">${width}${height}${exportButton}</div>`;
        let stateMeta = `<meta id="vscode-svg-preview-data" data-state="${JSON.stringify(state || {}).replace(/"/g, '&quot;')}">`
        return `<!DOCTYPE html><html><head>${stateMeta}${css}${jquery}${exportjs}</head><body>${options}<h1>Preview</h1><div>${svg}${image}${canvas}</div></body></html>`;
    }

    get localResourceRoot(): vscode.Uri {
        return vscode.Uri.file(path.join(this.context.extensionPath, 'media'));
    }
}