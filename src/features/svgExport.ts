import * as vscode from 'vscode';
import * as path from 'path';
import { SvgPreview, SvgView } from "./svgPreview";
import { ExportDocumentContentProvider } from '../exportProvider';

import fs = require('pn/fs');

interface ExportDataMessage {
    readonly command: 'exportData';
    readonly body: {
        dataUrl: string;
        output: string;
        resource: string;
    }
}
export class SvgExport extends SvgView {
    protected static viewTitle(resource: vscode.Uri): string {
        return `Export ${path.basename(resource.fsPath)}`;
    }
    public static viewType = 'svg.export';

    public static async revive(
        webview: vscode.WebviewPanel,
        state: any,
        contentProvider: ExportDocumentContentProvider
    ): Promise<SvgExport> {
        const resource = vscode.Uri.parse(state.resource);

        const exp = new SvgExport(
            webview,
            resource,
            contentProvider);

        exp.editor.webview.options = SvgView.getWebviewOptions(contentProvider);

        await exp.doUpdate();
        return exp;
    }

    protected constructor(
        webview: vscode.WebviewPanel,
        resource: vscode.Uri,
        protected readonly contentProvider: ExportDocumentContentProvider
    ) {
        super(webview, resource, contentProvider);
        this.editor.webview.onDidReceiveMessage((e: ExportDataMessage) => {
            if (e.body.resource !== this._resource.toString()) {
                return;
            }

            switch (e.command) {
                case 'exportData':
                    let data = Buffer.from(e.body.dataUrl.split(',')[1], 'base64');
                    fs.writeFileSync(e.body.output, data);
                    vscode.window.showInformationMessage('export done. ' + e.body.output);
                    break;
            }
        }, null, super.disposables);
    }

    public get state() {
        return {
            resource: this.resource.toString()
        };
    }
    protected async doUpdate(): Promise<void> {
        const resource = this._resource;

        clearTimeout(this.throttleTimer);
        this.throttleTimer = undefined;

        const document = await vscode.workspace.openTextDocument(resource);

        const content = await this.contentProvider.provideTextDocumentContent(document.uri, this.state);
        if (this._resource === resource) {
            this.editor.title = SvgExport.viewTitle(this._resource);
            this.editor.webview.options = SvgPreview.getWebviewOptions(this.contentProvider);
            this.editor.webview.html = content;
        }
    }
    public static create(
        resource: vscode.Uri,
        previewColumn: vscode.ViewColumn,
        contentProvider: ExportDocumentContentProvider
    ): SvgExport {
        const webview = vscode.window.createWebviewPanel(
            SvgExport.viewType,
            SvgExport.viewTitle(resource),
            previewColumn, {
                enableFindWidget: true,
                localResourceRoots: contentProvider.localResourceRoots
            });

        return new SvgExport(
            webview,
            resource,
            contentProvider);
    }
}