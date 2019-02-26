import * as vscode from 'vscode';
import { ViewColumn } from 'vscode';

export class Configuration {
    public static viewColumn(): vscode.ViewColumn {
        switch (vscode.workspace.getConfiguration('svgviewer').get('previewcolumn')) {
            case "Active": return ViewColumn.Active;
            case "Beside": return ViewColumn.Beside;
            default: return ViewColumn.Beside;
        }
    }

    public static showTransGrid(): boolean {
        return vscode.workspace.getConfiguration('svgviewer').get('transparencygrid');
    }

    public static transparencyColor(): string {
        return vscode.workspace.getConfiguration('svgviewer').get('transparencycolor');
    }

    public static enableAutoPreview(): boolean {
        return vscode.workspace.getConfiguration('svgviewer').get('enableautopreview');
    }
}