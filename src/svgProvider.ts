'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import fs = require('fs');
import { Configuration } from './configuration';

export class SvgDocumentContentProvider implements vscode.TextDocumentContentProvider {

    private snippet(properties: string, state: any): string {
        const showTransGrid = Configuration.showTransGrid();
        const transparencycolor = Configuration.transparencyColor();
        let transparencyGridCss = '';
        if (showTransGrid) {
            if (transparencycolor != null && transparencycolor !== "") {
                transparencyGridCss = `
<style type="text/css">
.svgv-bg img {
    background: `+ transparencycolor + `;
    transform-origin: top left;
}
</style>`;
            } else {
                transparencyGridCss = `<link rel="stylesheet" href="${this.getPath('media/background.css')}" type="text/css"></style>`;
            }
        }
        let matches: RegExpExecArray;
        let css: string[] = new Array();
        while (matches = SvgDocumentContentProvider.stylesheetRegex.exec(properties)) {
            css.push(matches[1]);
        }
        let html = `<!DOCTYPE html><html><head>
<meta id="vscode-svg-preview-data" data-state="${JSON.stringify(state || {}).replace(/"/g, '&quot;')}">
${transparencyGridCss}
<script src="${this.getPath('media/preview.js')}"></script>
<link rel="stylesheet" href="${this.getPath('media/preview.css')}" type="text/css"></style>
</head><body>
        ${this.buttonHtml()}
        <div class="svgv-bg"><img id="svgimg" src="data:image/svg+xml,${encodeURIComponent(this.insertCss(properties, css))}"></div>
        </body></html>`;
        return html;
    }
    public async provideTextDocumentContent(sourceUri: vscode.Uri, state: any): Promise<string> {
        const document = await vscode.workspace.openTextDocument(sourceUri);
        this.resourceDir = path.dirname(sourceUri.fsPath);
        return this.snippet(document.getText(), state);
    }

    private getPath(file: string): vscode.Uri {
        const onDiskPath = vscode.Uri.file(
            path.join(this.context.extensionPath, file)
        );
        return onDiskPath.with({ scheme: 'vscode-resource' });
    }
    public constructor(protected context: vscode.ExtensionContext) { }

    get localResourceRoot(): vscode.Uri {
        return vscode.Uri.file(path.join(this.context.extensionPath, 'media'));
    }

    private buttonHtml(): string {
        return vscode.workspace.getConfiguration('svgviewer').get('showzoominout') ?
            `<div class="svgv-zoom-container">
            <button class="svgv-btn" type="button" title="Zoom in" id="zoom_in">+</button>
            <button class="svgv-btn" type="button" title="Zoom out" id="zoom_out">-</button>
            </div>` : '';
    }

    private insertCss(svg: string, css: string[]): string {

        if (css == null || css.length == 0) return svg;

        let defsEndIndex = svg.toLowerCase().indexOf('</defs>');
        if (defsEndIndex === -1) {
            let svgEndIndex = svg.toLowerCase().indexOf('</svg>');
            return svg.slice(0, svgEndIndex)
                + `<defs>${this.loadCss(css)}</defs>`
                + svg.slice(svgEndIndex, svg.length);
        }
        return svg.slice(0, defsEndIndex)
            + this.loadCss(css)
            + svg.slice(defsEndIndex, svg.length);
    }

    private loadCss(css: string[]): string {
        let result = "";
        css.forEach(x => {
            result += `<style type="text/css"><![CDATA[${fs.readFileSync(this.getWorkspacePath(x))}]]></style>`;
        });
        return result;
    }

    private getWorkspacePath(file: string): string {
        return path.join(this.resourceDir, file);
    }

    private resourceDir: string;

    private static readonly stylesheetRegex: RegExp = /<\?\s*xml-stylesheet\s+.*href="(.+?)".*\s*\?>/gi;

    private static readonly svgRegexp = /<svg .*<\/svg>/s;
    private static readonly noSvgErrorNessage = `Active editor doesn't show a SVG document - no properties to preview.`;
    public static checkNoSvg(document: vscode.TextDocument, displayMessage: boolean = true) {
        if (!document) {
            vscode.window.showWarningMessage(SvgDocumentContentProvider.noSvgErrorNessage);
            return true;
        }
        let isSvg = document.getText().match(SvgDocumentContentProvider.svgRegexp);
        if (!isSvg && displayMessage) {
            vscode.window.showWarningMessage(SvgDocumentContentProvider.noSvgErrorNessage);
        }
        return !isSvg;
    }

}