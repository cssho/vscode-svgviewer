'use strict';

import * as vscode from 'vscode';
import { SvgDocumentContentProvider, SvgFileContentProvider, getSvgUri } from './svgProvider';
import { ExportDocumentContentProvider } from './exportProvider';

import exec = require('sync-exec');
import fs = require('pn/fs');
import tmp = require('tmp');
import cp = require('copy-paste');
import svgexport = require('svgexport');
import path = require('path');
import phantomjs = require('phantomjs-prebuilt');

export function activate(context: vscode.ExtensionContext) {

    // Check PhantomJS Binary
    if (!fs.existsSync(phantomjs.path)) {
        exec('npm rebuild', { cwd: context.extensionPath });
        process.env.PHANTOMJS_PLATFORM = process.platform;
        process.env.PHANTOMJS_ARCH = process.arch;
        phantomjs.path = process.platform === 'win32' ?
            path.join(path.dirname(phantomjs.path), 'phantomjs.exe') :
            path.join(path.dirname(phantomjs.path), 'phantom', 'bin', 'phantomjs');
    }

    let provider = new SvgDocumentContentProvider(context);
    let registration = vscode.workspace.registerTextDocumentContentProvider('svg-preview', provider);

    let fileUriProviders = new Map<string, { uri: vscode.Uri, provider: SvgFileContentProvider, registration: vscode.Disposable }>();

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (vscode.window.activeTextEditor) {
            if (e.document === vscode.window.activeTextEditor.document && !checkNoSvg(vscode.window.activeTextEditor.document, false)) {
                provider.update(getSvgUri(e.document.uri));
            }
        }
    });

    vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor) => {
        if (vscode.window.activeTextEditor) {
            if (textEditor.document === vscode.window.activeTextEditor.document && !checkNoSvg(vscode.window.activeTextEditor.document, false)) {
                provider.update(getSvgUri(textEditor.document.uri))
                let auto = vscode.workspace.getConfiguration('svgviewer').get('enableautopreview');
                if (auto && !provider.exist(getSvgUri(textEditor.document.uri))) {
                    return openPreview(textEditor.document.uri, textEditor.document.fileName);
                }
            }
        }
    });

    let open = vscode.commands.registerTextEditorCommand('svgviewer.open', (te, t) => {
        if (checkNoSvg(te.document)) return;
        provider.update(getSvgUri(te.document.uri))
        return openPreview(te.document.uri, te.document.fileName);
    });

    context.subscriptions.push(open);

    let openfile = vscode.commands.registerCommand('svgviewer.openfile', async function (uri) {
        if (!(uri instanceof vscode.Uri)) {
            return;
        }
        let document = await vscode.workspace.openTextDocument(uri);
        if (checkNoSvg(document, false)) {
            vscode.window.showWarningMessage("Selected file is not an SVG document - no properties to preview.");
            return;
        }

        let fName = vscode.workspace.asRelativePath(document.fileName);
        let fileUriProvider = fileUriProviders.get(fName);
        if (fileUriProvider == undefined) {
            let fileUri = getSvgUri(uri);
            let fileProvider = new SvgFileContentProvider(context, fileUri, document.fileName);
            let fileRegistration = vscode.workspace.registerTextDocumentContentProvider('svg-preview', fileProvider);
            fileUriProvider = { uri: fileUri, provider: fileProvider, registration: fileRegistration };
            fileUriProviders.set(fName, fileUriProvider);
        } else {
            fileUriProvider.provider.update(fileUriProvider.uri);
        }
        return openPreview(fileUriProvider.uri, fName);
    });

    context.subscriptions.push(openfile);

    let saveas = vscode.commands.registerTextEditorCommand('svgviewer.saveas', (te, t) => {
        if (checkNoSvg(te.document)) return;
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let text = editor.document.getText();
            let tmpobj = tmp.fileSync({ 'postfix': '.svg' });
            let pngpath = editor.document.uri.fsPath.replace('.svg', '.png');
            exportPng(tmpobj, text, pngpath);
        }
    });

    context.subscriptions.push(saveas);

    let saveassize = vscode.commands.registerTextEditorCommand('svgviewer.saveassize', (te, t) => {
        if (checkNoSvg(te.document)) return;
        let editor = vscode.window.activeTextEditor;
        if (!editor) return;
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
        if (checkNoSvg(te.document)) return;
        let editor = vscode.window.activeTextEditor;
        if (!editor) return;
        let text = editor.document.getText();
        cp.copy('data:image/svg+xml,' + encodeURIComponent(text));
    });

    context.subscriptions.push(copydu);

    let exportProvider = new ExportDocumentContentProvider(context);
    vscode.workspace.registerTextDocumentContentProvider('svg-export', exportProvider)

    let makeExportUri = (uri) => uri.with({
        scheme: 'svg-export',
        path: uri.path + '.rendered',
        query: uri.toString()
    });

    vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            exportProvider.update(makeExportUri(event.document.uri));
        }
    });

    let openexport = vscode.commands.registerCommand('svgviewer.openexport', async function (uri) {
        if (!(uri instanceof vscode.Uri)) {
            if (vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            } else {
                return;
            }
        }
        let document = await vscode.workspace.openTextDocument(uri);
        if (checkNoSvg(document)) {
            vscode.window.showWarningMessage("Active editor doesn't show a SVG document - no properties to preview.");
            return;
        }

        return vscode.commands.executeCommand('vscode.previewHtml', makeExportUri(uri));
    });

    context.subscriptions.push(openexport);

    let savedu = vscode.commands.registerCommand('svgviewer.savedu', async function (args) {
        let data = new Buffer(args.du.split(',')[1], 'base64');
        fs.writeFileSync(args.output, data);
        vscode.window.showInformationMessage('export done. ' + args.output);
    });

    context.subscriptions.push(savedu);
}
function creatInputBox(param: string): Thenable<string | undefined> {
    return vscode.window.showInputBox({
        prompt: `Set ${param} of the png.`,
        placeHolder: `${param}`,
        validateInput: checkSizeInput
    });
}
function checkNoSvg(document: vscode.TextDocument, displayMessage: boolean = true) {

    let isNGType = document.languageId !== 'xml' && document.getText().indexOf('</svg>') < 0;
    if (isNGType && displayMessage) {
        vscode.window.showWarningMessage("Active editor doesn't show a SVG document - no properties to preview.");
    }
    return isNGType;
}

function checkSizeInput(value: string): string | null {
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

function openPreview(previewUri: vscode.Uri, fileName: string) {
    let viewColumn: number;
    switch (vscode.workspace.getConfiguration('svgviewer').get('previewcolumn')) {
        case "One":
            viewColumn = 1;
            break;
        case "Two":
            viewColumn = 2;
            break;
        case "Three":
            viewColumn = 3;
            break;
        default:
            viewColumn = 0;
            break;
    }
    if (viewColumn) {
        return vscode.commands.executeCommand('vscode.previewHtml', getSvgUri(previewUri), viewColumn, `Preview : ${fileName}`)
            .then(s => console.log('done.'), vscode.window.showErrorMessage);
    }
}

export function deactivate() {
}
