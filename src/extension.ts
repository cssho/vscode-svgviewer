'use strict';

import * as vscode from 'vscode';
import { SvgDocumentContentProvider } from './svgProvider';

const exec = require('sync-exec');
const fs = require('pn/fs');
const tmp = require('tmp');
const cp = require('copy-paste');
const svgexport = require('svgexport');
const path = require('path');
const phantomjs = require('phantomjs-prebuilt');
export function activate(context: vscode.ExtensionContext) {

    console.log('SVG Viewer is now active!');
    
    // Check PhantomJS Binary   
    if (!fs.existsSync(phantomjs.path)) {
        exec('npm rebuild', { cwd: context.extensionPath });
        process.env.PHANTOMJS_PLATFORM = process.platform;
        process.env.PHANTOMJS_ARCH = process.arch;
        phantomjs.path = process.platform === 'win32' ?
            path.join(path.dirname(phantomjs.path), 'phantomjs.exe') :
            path.join(path.dirname(phantomjs.path), 'phantom', 'bin', 'phantomjs');
    }

    let previewUri = vscode.Uri.parse('svg-preview://authority/svg-preview');

    let provider = new SvgDocumentContentProvider();
    let registration = vscode.workspace.registerTextDocumentContentProvider('svg-preview', provider);

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document === vscode.window.activeTextEditor.document && !checkNoSvg(vscode.window.activeTextEditor, false)) {
            provider.update(previewUri);
        }
    });

    let open = vscode.commands.registerTextEditorCommand('svgviewer.open', (te, t) => {
        if (checkNoSvg(te)) return;
        provider.update(previewUri);
        return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two)
            .then(s => console.log('done.'), vscode.window.showErrorMessage);

    });

    context.subscriptions.push(open);

    let saveas = vscode.commands.registerTextEditorCommand('svgviewer.saveas', (te, t) => {
        if (checkNoSvg(te)) return;
        let editor = vscode.window.activeTextEditor;
        let text = editor.document.getText();
        let tmpobj = tmp.fileSync({ 'postfix': '.svg' });
        let pngpath = editor.document.uri.fsPath.replace('.svg', '.png');
        exportPng(tmpobj, text, pngpath);
    });

    context.subscriptions.push(saveas);

    let saveassize = vscode.commands.registerTextEditorCommand('svgviewer.saveassize', (te, t) => {
        if (checkNoSvg(te)) return;
        let editor = vscode.window.activeTextEditor;
        let text = editor.document.getText();
        let tmpobj = tmp.fileSync({ 'postfix': '.svg' });
        let pngpath = editor.document.uri.fsPath.replace('.svg', '.png');
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
    });

    context.subscriptions.push(saveassize);

    let copydu = vscode.commands.registerTextEditorCommand('svgviewer.copydui', (te, t) => {
        if (checkNoSvg(te)) return;
        let editor = vscode.window.activeTextEditor;
        let text = editor.document.getText();
        cp.copy('data:image/svg+xml,' + encodeURIComponent(text));
    });

    context.subscriptions.push(copydu);
}
function creatInputBox(param: string): Thenable<string> {
    return vscode.window.showInputBox({
        prompt: `Set ${param} of the png.`,
        placeHolder: `${param}`,
        validateInput: checkSizeInput
    });
}
function checkNoSvg(editor: vscode.TextEditor, displayMessage: boolean = true) {

    let isNGType = !(editor.document.languageId === 'xml') || editor.document.getText().indexOf('</svg>') < 0;
    if (isNGType && displayMessage) {
        vscode.window.showWarningMessage("Active editor doesn't show a SVG document - no properties to preview.");
    }
    return isNGType;
}

function checkSizeInput(value: string): string {
    return value !== '' && !isNaN(Number(value)) && Number(value) > 0
        ? null : 'Please set number.';
}

function exportPng(tmpobj: any, text: string, pngpath: string, w?: number, h?: number) {
    console.log(`export width:${w} height:${h}`);
    let result = fs.writeFile(tmpobj.name, text, 'utf-8')
        .then(x => {
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
        .catch(e => vscode.window.showErrorMessage(e.message));
}

export function deactivate() {
}