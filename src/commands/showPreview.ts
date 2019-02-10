import * as vscode from 'vscode';

import { Command } from '../commandManager';
import { SvgPreviewWebviewManager } from '../features/svgPreviewWebviewManager';
import { getViewColumn } from '../configuration';
import { checkNoSvg } from '../extension';

async function showPreview(
    webviewManager: SvgPreviewWebviewManager,
    uri: vscode.Uri
) {
    let resource = uri;
    if (!(resource instanceof vscode.Uri)) {
        if (vscode.window.activeTextEditor) {
            resource = vscode.window.activeTextEditor.document.uri;
        }
        if (!(resource instanceof vscode.Uri)) return;
    }
    const textDocument = await vscode.workspace.openTextDocument(resource);
    if (checkNoSvg(textDocument)) return;
    const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    webviewManager.preview(resource, {
        resourceColumn: resourceColumn,
        previewColumn: getViewColumn()
    })
}

export class ShowPreviewCommand implements Command {
    public readonly id = 'svgviewer.open';

    public constructor(
        private readonly webviewManager: SvgPreviewWebviewManager
    ) { }

    public execute(mainUri?: vscode.Uri, allUris?: vscode.Uri[]) {
        for (const uri of Array.isArray(allUris) ? allUris : [mainUri]) {
            showPreview(this.webviewManager, uri);
        }
    }
}
