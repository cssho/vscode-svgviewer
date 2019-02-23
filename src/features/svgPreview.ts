import * as vscode from 'vscode';
import * as path from 'path';
import { SvgDocumentContentProvider } from '../svgProvider';
import fs = require('pn/fs');
import { stat } from 'fs';

export class SvgPreview {
    private _resource: vscode.Uri;
    private _zoom: number;

    protected readonly editor: vscode.WebviewPanel;
    private throttleTimer: any;
    private firstUpdate = true;
    private disposed: boolean = false;
    protected disposables: vscode.Disposable[] = [];

    protected constructor(
        webview: vscode.WebviewPanel,
        resource: vscode.Uri,
        zoom: number,
        protected readonly contentProvider: SvgDocumentContentProvider
    ) {
        this._resource = resource;
        this._zoom = zoom
        this.editor = webview;

        this.editor.onDidDispose(() => {
            this.dispose();
        }, null, this.disposables);

        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isPreviewOf(event.document.uri)) {
                this.refresh();
            }
        }, null, this.disposables);

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && !SvgDocumentContentProvider.checkNoSvg(editor.document)) {
                this.update(editor.document.uri);
            }
        }, null, this.disposables);
    }

    public dispose() {
        if (this.disposed) {
            return;
        }
        while (this.disposables.length) {
            const item = this.disposables.pop();
            if (item) {
                item.dispose();
            }
        }

        this.disposed = true;
        this.onDisposeEmitter.fire();
        this.onDisposeEmitter.dispose();

        this.onDidChangeViewStateEmitter.dispose();
        this.editor.dispose();
    }



    private readonly onDisposeEmitter = new vscode.EventEmitter<void>();
    public readonly onDispose = this.onDisposeEmitter.event;

    private readonly onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
    public readonly onDidChangeViewState = this.onDidChangeViewStateEmitter.event;

    public get resource(): vscode.Uri {
        return this._resource;
    }

    public get zoom(): number {
        return this._zoom;
    }

    public get state() {
        return {
            resource: this.resource.toString(),
            zoom: this.zoom
        };
    }

    public update(resource: vscode.Uri) {
        const isResourceChange = resource.fsPath !== this._resource.fsPath;
        if (isResourceChange) {
            clearTimeout(this.throttleTimer);
            this.throttleTimer = undefined;
        }

        this._resource = resource;

        if (!this.throttleTimer) {
            if (isResourceChange || this.firstUpdate) {
                this.doUpdate();
            } else {
                this.throttleTimer = setTimeout(() => this.doUpdate(), 300);
            }
        }

        this.firstUpdate = false;
    }

    public refresh() {
        this.update(this._resource);
    }

    public get position(): vscode.ViewColumn | undefined {
        return this.editor.viewColumn;
    }

    public matchesResource(
        otherResource: vscode.Uri
    ): boolean {
        return this.isPreviewOf(otherResource);
    }

    public matches(otherView: SvgPreview): boolean {
        return this.matchesResource(otherView._resource);
    }

    public reveal(viewColumn: vscode.ViewColumn) {
        this.editor.reveal(viewColumn);
    }

    private isPreviewOf(resource: vscode.Uri): boolean {
        return this._resource.fsPath === resource.fsPath;
    }

    protected async doUpdate(): Promise<void> {
        const resource = this._resource;

        clearTimeout(this.throttleTimer);
        this.throttleTimer = undefined;

        const document = await vscode.workspace.openTextDocument(resource);

        const content = await this.contentProvider.provideTextDocumentContent(document.uri, this.state);
        if (this._resource === resource) {
            this.editor.title = SvgPreview.getPreviewTitle(this._resource);
            this.editor.webview.options = SvgPreview.getWebviewOptions(this.contentProvider);
            this.editor.webview.html = content;
        }
    }

    protected static getWebviewOptions(contentProvider: SvgDocumentContentProvider
    ): vscode.WebviewOptions {
        return {
            enableScripts: true,
            localResourceRoots: [contentProvider.localResourceRoot]
        };
    }

    protected static getPreviewTitle(resource: vscode.Uri): string {
        return `Preview ${path.basename(resource.fsPath)}`;
    }

    public static async revive(
        webview: vscode.WebviewPanel,
        state: any,
        contentProvider: SvgDocumentContentProvider
    ): Promise<SvgPreview> {
        const resource = vscode.Uri.parse(state.resource);
        const zoom: number = state.zoom instanceof Number ? state.zoom : 1.0;

        const preview = new SvgPreview(
            webview,
            resource,
            zoom,
            contentProvider);

        preview.editor.webview.options = SvgPreview.getWebviewOptions(contentProvider);

        await preview.doUpdate();
        return preview;
    }

    public static viewType = 'svg.preview';

    public static create(
        resource: vscode.Uri,
        previewColumn: vscode.ViewColumn,
        contentProvider: SvgDocumentContentProvider
    ): SvgPreview {
        const webview = vscode.window.createWebviewPanel(
            SvgPreview.viewType,
            SvgPreview.getPreviewTitle(resource),
            previewColumn, {
                enableFindWidget: true,
                localResourceRoots: [contentProvider.localResourceRoot]
            });

        return new SvgPreview(
            webview,
            resource,
            1.0,
            contentProvider);
    }
}
export interface ViewSettings {
    readonly resourceColumn: vscode.ViewColumn;
    readonly viewColumn: vscode.ViewColumn;
}
