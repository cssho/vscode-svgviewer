import * as vscode from 'vscode';
import * as path from 'path';
import { NewSvgDocumentContentProvider } from '../svgProvider';
import { checkNoSvg } from '../extension';

export class SvgPreview {

    public static viewType = 'svg.preview';

    private _resource: vscode.Uri;

    private readonly editor: vscode.WebviewPanel;
    private throttleTimer: any;
    private firstUpdate = true;
    private disposed: boolean = false;
    private disposables: vscode.Disposable[] = [];
    public static async revive(
        webview: vscode.WebviewPanel,
        state: any,
        contentProvider: NewSvgDocumentContentProvider
    ): Promise<SvgPreview> {
        const resource = vscode.Uri.parse(state.resource);

        const preview = new SvgPreview(
            webview,
            resource,
            contentProvider);

        preview.editor.webview.options = SvgPreview.getWebviewOptions();

        await preview.doUpdate();
        return preview;
    }

    public static create(
        resource: vscode.Uri,
        previewColumn: vscode.ViewColumn,
        contentProvider: NewSvgDocumentContentProvider
    ): SvgPreview {
        const webview = vscode.window.createWebviewPanel(
            SvgPreview.viewType,
            SvgPreview.getPreviewTitle(resource),
            previewColumn, {
                enableFindWidget: true
            });

        return new SvgPreview(
            webview,
            resource,
            contentProvider);
    }

    private constructor(
        webview: vscode.WebviewPanel,
        resource: vscode.Uri,
        private readonly contentProvider: NewSvgDocumentContentProvider,
    ) {
        this._resource = resource;
        this.editor = webview;

        this.editor.onDidDispose(() => {
            this.dispose();
        }, null, this.disposables);

        this.editor.onDidChangeViewState(e => {
            this.onDidChangeViewStateEmitter.fire(e);
        }, null, this.disposables);

        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isPreviewOf(event.document.uri)) {
                this.refresh();
            }
        }, null, this.disposables);

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && !checkNoSvg(editor.document)) {
                this.update(editor.document.uri);
            }
        }, null, this.disposables);
    }

    private readonly onDisposeEmitter = new vscode.EventEmitter<void>();
    public readonly onDispose = this.onDisposeEmitter.event;

    private readonly onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
    public readonly onDidChangeViewState = this.onDidChangeViewStateEmitter.event;

    public get resource(): vscode.Uri {
        return this._resource;
    }

    public get state() {
        return {
            resource: this.resource.toString()
        };
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
        otherResource: vscode.Uri,
        otherPosition: vscode.ViewColumn | undefined
    ): boolean {
        if (this.position !== otherPosition) {
            return false;
        }

        return this.isPreviewOf(otherResource);
    }

    public matches(otherPreview: SvgPreview): boolean {
        return this.matchesResource(otherPreview._resource, otherPreview.position);
    }

    public reveal(viewColumn: vscode.ViewColumn) {
        this.editor.reveal(viewColumn);
    }

    private isPreviewOf(resource: vscode.Uri): boolean {
        return this._resource.fsPath === resource.fsPath;
    }

    private static getPreviewTitle(resource: vscode.Uri): string {
        return `Preview ${path.basename(resource.fsPath)}`;
    }

    private async doUpdate(): Promise<void> {
        const resource = this._resource;

        clearTimeout(this.throttleTimer);
        this.throttleTimer = undefined;

        const document = await vscode.workspace.openTextDocument(resource);

        const content = await this.contentProvider.provideTextDocumentContent(document.uri);
        if (this._resource === resource) {
            this.editor.title = SvgPreview.getPreviewTitle(this._resource);
            this.editor.webview.options = SvgPreview.getWebviewOptions();
            this.editor.webview.html = content;
        }
    }

    private static getWebviewOptions(
    ): vscode.WebviewOptions {
        return {
            enableScripts: true
        };
    }

}

export interface PreviewSettings {
    readonly resourceColumn: vscode.ViewColumn;
    readonly previewColumn: vscode.ViewColumn;
}