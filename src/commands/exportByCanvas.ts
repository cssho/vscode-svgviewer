import * as vscode from 'vscode';
import { SvgExportWebviewManager } from "../features/svgWebviewManager";
import { ExportDocumentContentProvider } from '../exportProvider';
import { Configuration } from '../configuration';
import { Command } from '../commandManager';

async function showExport(
    webviewManager: SvgExportWebviewManager,
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
    if (ExportDocumentContentProvider.checkNoSvg(textDocument)) return;
    const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    webviewManager.view(resource, {
        resourceColumn: resourceColumn,
        viewColumn: Configuration.getViewColumn()
    });
}

export class ShowExportCommand implements Command {
    public readonly id = 'svgviewer.openexport';

    public constructor(
        private readonly webviewManager: SvgExportWebviewManager
    ) { }

    public execute(mainUri?: vscode.Uri, allUris?: vscode.Uri[]) {
        for (const uri of Array.isArray(allUris) ? allUris : [mainUri]) {
            showExport(this.webviewManager, uri);
        }
    }
}