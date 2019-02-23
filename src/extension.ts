'use strict';

import * as vscode from 'vscode';
import { SvgDocumentContentProvider } from './svgProvider';
import { CommandManager } from './commandManager';
import { ShowPreviewCommand } from './commands/showPreview'

import exec = require('sync-exec');
import fs = require('pn/fs');
import path = require('path');
import phantomjs = require('phantomjs-prebuilt');
import { SvgWebviewManager } from './features/svgWebviewManager';
import { SaveAsCommand, SaveAsSizeCommand, CopyDataUriCommand } from './commands/saveFile';

export function activate(context: vscode.ExtensionContext) {


    const newProvider = new SvgDocumentContentProvider(context);
    const webviewManager = new SvgWebviewManager(newProvider);
    context.subscriptions.push(webviewManager);
    const commandManager = new CommandManager();
    commandManager.register(new ShowPreviewCommand(webviewManager));
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
