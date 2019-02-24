import * as vscode from 'vscode';
import * as path from 'path';
import { SvgDocumentContentProvider, BaseContentProvider } from '../svgProvider';
import { isNumber } from 'util';

export abstract class SvgView {

    protected _resource: vscode.Uri;
    protected readonly editor: vscode.WebviewPanel;

    protected throttleTimer: any;
    private firstUpdate = true;
    private disposed: boolean = false;
    protected disposables: vscode.Disposable[] = [];
    protected constructor(webview: vscode.WebviewPanel,
        resource: vscode.Uri) {
        this._resource = resource;
        this.editor = webview;

        this.editor.onDidDispose(() => {
            this.dispose();
        }, null, this.disposables);
        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isViewOf(event.document.uri)) {
                this.refresh();
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
        return this.isViewOf(otherResource);
    }

    public matches(otherView: SvgPreview): boolean {
        return this.matchesResource(otherView._resource);
    }

    public reveal(viewColumn: vscode.ViewColumn) {
        this.editor.reveal(viewColumn);
    }

    private isViewOf(resource: vscode.Uri): boolean {
        return this._resource.fsPath === resource.fsPath;
    }

    protected abstract async doUpdate(): Promise<void>;

    protected static getWebviewOptions(contentProvider: BaseContentProvider
    ): vscode.WebviewOptions {
        return {
            enableScripts: true,
            localResourceRoots: [contentProvider.localResourceRoot]
        };
    }
    abstract get state();

}
export class SvgPreview extends SvgView {
    private _zoom: number;

    protected constructor(
        webview: vscode.WebviewPanel,
        resource: vscode.Uri,
        zoom: number,
        private readonly contentProvider: SvgDocumentContentProvider
    ) {
        super(webview, resource);
        this._zoom = zoom
    }

    public get zoom(): number {
        return this._zoom;
    }

    get state() {
        return {
            resource: this.resource.toString(),
            zoom: this.zoom
        };
    }

    protected async doUpdate(): Promise<void> {
        const resource = this._resource;

        clearTimeout(this.throttleTimer);
        this.throttleTimer = undefined;

        const document = await vscode.workspace.openTextDocument(resource);

        const content = await this.contentProvider.provideTextDocumentContent(document.uri, this.state);
        if (this._resource === resource) {
            this.editor.title = SvgPreview.viewTitle(this._resource);
            this.editor.webview.options = SvgPreview.getWebviewOptions(this.contentProvider);
            this.editor.webview.html = content;
        }
    }

    protected static viewTitle(resource: vscode.Uri): string {
        return `Preview ${path.basename(resource.fsPath)}`;
    }

    public static async revive(
        webview: vscode.WebviewPanel,
        state: any,
        contentProvider: SvgDocumentContentProvider
    ): Promise<SvgPreview> {
        const resource = vscode.Uri.parse(state.resource);
        const zoom: number = isNumber(state.zoom) ? state.zoom : 1.0;

        const preview = new SvgPreview(
            webview,
            resource,
            zoom,
            contentProvider);

        preview.editor.webview.options = SvgView.getWebviewOptions(contentProvider);

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
            SvgPreview.viewTitle(resource),
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
