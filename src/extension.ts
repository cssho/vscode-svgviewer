'use strict';

import * as vscode from 'vscode';
import { SvgDocumentContentProvider } from './svgProvider';
import { ExportDocumentContentProvider } from './exportProvider';
import { CommandManager } from './commandManager';
import { ShowPreviewCommand } from './commands/showPreview'

import exec = require('sync-exec');
import fs = require('pn/fs');
import path = require('path');
import phantomjs = require('phantomjs-prebuilt');
import { SvgPreviewWebviewManager } from './features/svgPreviewWebviewManager';
import tmp = require('tmp');
import { SaveAsCommand, SaveAsSizeCommand, CopyDataUriCommand } from './commands/saveFile';
import svgexport = require('svgexport');

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

    const newProvider = new SvgDocumentContentProvider(context);
    const webviewManager = new SvgPreviewWebviewManager(newProvider, context);
    context.subscriptions.push(webviewManager);
    const commandManager = new CommandManager();
    commandManager.register(new ShowPreviewCommand(webviewManager));
    commandManager.register(new SaveAsCommand());
    commandManager.register(new SaveAsSizeCommand());
    commandManager.register(new CopyDataUriCommand());
    context.subscriptions.push(commandManager);

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
}
const noSvgErrorNessage = `Active editor doesn't show a SVG document - no properties to preview.`;
export function checkNoSvg(document: vscode.TextDocument, displayMessage: boolean = true) {
    if (!document) {
        vscode.window.showWarningMessage(noSvgErrorNessage);
        return true;
    }
    let isNGType = document.languageId !== 'xml' && document.getText().indexOf('</svg>') < 0;
    if (isNGType && displayMessage) {
        vscode.window.showWarningMessage(noSvgErrorNessage);
    }
    return isNGType;
}




export function deactivate() {
}
