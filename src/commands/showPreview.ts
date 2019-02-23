import * as vscode from 'vscode';

import { Command } from '../commandManager';
import { SvgWebviewManager } from '../features/svgWebviewManager';
import { Configuration } from '../configuration';
import { SvgDocumentContentProvider } from '../svgProvider';

async function showPreview(
    webviewManager: SvgWebviewManager,
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
    if (SvgDocumentContentProvider.checkNoSvg(textDocument)) return;
    const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    webviewManager.view(resource, {
        resourceColumn: resourceColumn,
        viewColumn: Configuration.getViewColumn()
    });
}

export class ShowPreviewCommand implements Command {
    public readonly id = 'svgviewer.open';

    public constructor(
        private readonly webviewManager: SvgWebviewManager
    ) { }

    public execute(mainUri?: vscode.Uri, allUris?: vscode.Uri[]) {
        for (const uri of Array.isArray(allUris) ? allUris : [mainUri]) {
            showPreview(this.webviewManager, uri);
        }
    }
}
