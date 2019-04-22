import * as vscode from 'vscode';
import { Command } from '../commandManager';
import tmp = require('tmp');
import svgexport = require('svgexport');
import fs = require('pn/fs');
import cp = require('copy-paste');
import { SvgDocumentContentProvider } from '../svgProvider';

async function saveFileAs(uri: vscode.Uri) {
    let resource = uri;
    const textDocument = await loadTextDocument(resource);
    if (SvgDocumentContentProvider.checkNoSvg(textDocument)) return;
    const text = SvgDocumentContentProvider.addNamespace(textDocument.getText());
    const tmpobj = tmp.fileSync({ 'postfix': '.svg' });
    const pngpath = textDocument.fileName.replace('.svg', '.png');
    exportPng(tmpobj, text, pngpath);
}

async function saveFileAsSize(uri: vscode.Uri) {
    let resource = uri;
    const textDocument = await loadTextDocument(resource);
    if (SvgDocumentContentProvider.checkNoSvg(textDocument)) return;
    const text = SvgDocumentContentProvider.addNamespace(textDocument.getText());
    const tmpobj = tmp.fileSync({ 'postfix': '.svg' });
    const pngpath = textDocument.fileName.replace('.svg', '.png');
    creatInputBox('width')
        .then(width => {
            if (width) {
                creatInputBox('height')
                    .then(height => {
                        if (height) {
                            exportPng(tmpobj, text, pngpath, Number(width), Number(height));
                        }
                    });
            }
        });
}

async function loadTextDocument(resource: vscode.Uri): Promise<vscode.TextDocument> {
    if (!(resource instanceof vscode.Uri)) {
        if (vscode.window.activeTextEditor) {
            resource = vscode.window.activeTextEditor.document.uri;
        }
        if (!(resource instanceof vscode.Uri)) return null;
    }
    return await vscode.workspace.openTextDocument(resource);
}

async function copyDataUri(uri: vscode.Uri) {
    let resource = uri;
    const textDocument = await loadTextDocument(resource);
    if (SvgDocumentContentProvider.checkNoSvg(textDocument)) return;
    const text = textDocument.getText();
    cp.copy('data:image/svg+xml,' + encodeURIComponent(text));
}

export class SaveAsCommand implements Command {
    public readonly id = 'svgviewer.saveas';

    public constructor(
    ) { }

    public execute(mainUri?: vscode.Uri, allUris?: vscode.Uri[]) {
        for (const uri of Array.isArray(allUris) ? allUris : [mainUri]) {
            saveFileAs(uri);
        }
    }
}
export class SaveAsSizeCommand implements Command {
    public readonly id = 'svgviewer.saveassize';

    public constructor(
    ) { }

    public execute(mainUri?: vscode.Uri, allUris?: vscode.Uri[]) {
        for (const uri of Array.isArray(allUris) ? allUris : [mainUri]) {
            saveFileAsSize(uri);
        }
    }
}

export class CopyDataUriCommand implements Command {
    public readonly id = 'svgviewer.copydui';

    public constructor(
    ) { }

    public execute(mainUri?: vscode.Uri, allUris?: vscode.Uri[]) {
        copyDataUri(mainUri);
    }
}


function exportPng(tmpobj: any, text: string, pngpath: string, w?: number, h?: number) {
    console.log(`export width:${w} height:${h}`);
    fs.writeFile(tmpobj.name, text, 'utf-8')
        .then((_: any) => {
            svgexport.render(
                {
                    'input': tmpobj.name,
                    'output': `${pngpath} pad ${w || ''}${w == null && h == null ? '' : ':'}${h || ''}`
                },
                function (err) {
                    if (!err) vscode.window.showInformationMessage('export done. ' + pngpath);
                    else vscode.window.showErrorMessage(err);
                });
        })
        .catch((e: any) => vscode.window.showErrorMessage(e.message));
}

function creatInputBox(param: string): Thenable<string | undefined> {
    return vscode.window.showInputBox({
        prompt: `Set ${param} of the png.`,
        placeHolder: `${param}`,
        validateInput: checkSizeInput
    });
}

function checkSizeInput(value: string): string | null {
    return value !== '' && !isNaN(Number(value)) && Number(value) > 0
        ? null : 'Please set number.';
}