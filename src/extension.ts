'use strict';

import * as vscode from 'vscode';
import { SvgDocumentContentProvider } from './svgProvider';
import { CommandManager } from './commandManager';
import { ShowPreviewCommand } from './commands/showPreview'

import exec = require('sync-exec');
import fs = require('pn/fs');
import path = require('path');
import phantomjs = require('phantomjs-prebuilt');
import { SvgWebviewManager, SvgExportWebviewManager } from './features/svgWebviewManager';
import { SaveAsCommand, SaveAsSizeCommand, CopyDataUriCommand } from './commands/saveFile';
import { ExportDocumentContentProvider } from './exportProvider';
import { ShowExportCommand } from './commands/exportByCanvas';

export function activate(context: vscode.ExtensionContext) {


    const previewProvider = new SvgDocumentContentProvider(context);
    const webviewManager = new SvgWebviewManager(previewProvider);
    context.subscriptions.push(webviewManager);
    const exportProvider = new ExportDocumentContentProvider(context);
    const expWebviewManager = new SvgExportWebviewManager(exportProvider);
    context.subscriptions.push(expWebviewManager);
    const commandManager = new CommandManager();
    commandManager.register(new ShowPreviewCommand(webviewManager));
    commandManager.register(new ShowExportCommand(expWebviewManager));
    commandManager.register(new SaveAsCommand());
    commandManager.register(new SaveAsSizeCommand());
    commandManager.register(new CopyDataUriCommand());
    context.subscriptions.push(commandManager);

    // Check PhantomJS Binary
    if (!fs.existsSync(phantomjs.path)) {
        exec('npm rebuild', { cwd: context.extensionPath });
        process.env.PHANTOMJS_PLATFORM = process.platform;
        process.env.PHANTOMJS_ARCH = process.arch;
        phantomjs.path = process.platform === 'win32' ?
            path.join(path.dirname(phantomjs.path), 'phantomjs.exe') :
            path.join(path.dirname(phantomjs.path), 'phantom', 'bin', 'phantomjs');
    }
}




export function deactivate() {
}
