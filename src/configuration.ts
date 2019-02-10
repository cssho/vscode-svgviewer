import * as vscode from 'vscode';
import { ViewColumn } from 'vscode';

export function getViewColumn(): vscode.ViewColumn | undefined {
    switch (vscode.workspace.getConfiguration('svgviewer').get('previewcolumn')) {
        case "One":
            return ViewColumn.One;
        case "Two":
            return ViewColumn.Two;
        case "Three":
            return ViewColumn.Three;
    }
}