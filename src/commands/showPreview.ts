import * as vscode from 'vscode';

import { Command } from '../commandManager';
import { SvgPreviewWebviewManager, } from '../svgProvider';
import { ViewColumn } from 'vscode';


function getViewColumn(): vscode.ViewColumn | undefined {
    switch (vscode.workspace.getConfiguration('svgviewer').get('previewcolumn')) {
        case "One":
            return ViewColumn.One;
        case "Two":
            return ViewColumn.Two;
        case "Three":
            return ViewColumn.Three;
    }
}

function showPreview(
    webviewManager: SvgPreviewWebviewManager,
    uri: vscode.Uri,title: string
) {
    let resource = uri;
    if (!(resource instanceof vscode.Uri)) {
        if (vscode.window.activeTextEditor) {
            // we are relaxed and don't check for markdown files
            resource = vscode.window.activeTextEditor.document.uri;
        }
    }

    if (!(resource instanceof vscode.Uri)) {
        if (!vscode.window.activeTextEditor) {
            // this is most likely toggling the preview
            //return vscode.commands.executeCommand('markdown.showSource');
        }
        // nothing found that could be shown or toggled
        return;
    }
    const column = getViewColumn();
    if (column) {
        const view = webviewManager.create(
            resource, column,title);


        return view;
    }
}

export class ShowPreviewCommand implements Command {
    public readonly id = 'svgviewer.open';

    public constructor(
        private readonly webviewManager: SvgPreviewWebviewManager
    ) { }

    public execute(mainUri?: vscode.Uri, allUris?: vscode.Uri[]) {
        for (const uri of (allUris || [mainUri])) {
            showPreview(this.webviewManager,  uri, 'hoge');
        }
    }
}