import * as vscode from 'vscode';
import { SvgDocumentContentProvider } from '../svgProvider';
import { SvgPreview, ViewSettings, SvgView } from './svgPreview';
import { SvgExport } from './svgExport';
import { ExportDocumentContentProvider } from '../exportProvider';

abstract class WebviewManager implements vscode.WebviewPanelSerializer {
    protected abstract readonly views: SvgView[];
    abstract deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any);

    protected readonly disposables: vscode.Disposable[] = [];

    public refresh() {
        for (const preview of this.views) {
            preview.refresh();
        }
    }

    public dispose(): void {
        while (this.disposables.length) {
            const item = this.disposables.pop();
            if (item) {
                item.dispose();
            }
        }
        while (this.views.length) {
            const item = this.views.pop();
            if (item) {
                item.dispose();
            }
        }
    }
}
export class SvgWebviewManager extends WebviewManager {
    protected readonly views: SvgPreview[] = [];
    public constructor(
        protected readonly contentProvider: SvgDocumentContentProvider
    ) {
        super();
        this.disposables.push(vscode.window.registerWebviewPanelSerializer(SvgPreview.viewType, this));
    }

    public view(
        resource: vscode.Uri,
        viewSettings: ViewSettings
    ): void {
        let view = this.getExistingView(resource);
        if (view) {
            view.reveal();
        } else {
            view = this.createView(resource, viewSettings);
        }

        view.update(resource);
    }


    public async deserializeWebviewPanel(
        webview: vscode.WebviewPanel,
        state: any
    ): Promise<void> {
        const preview = await SvgPreview.revive(
            webview,
            state,
            this.contentProvider);

        this.registerView(preview);
    }

    private getExistingView(
        resource: vscode.Uri
    ): SvgPreview | undefined {
        return this.views.find(preview =>
            preview.matchesResource(resource));
    }

    private createView(
        resource: vscode.Uri,
        previewSettings: ViewSettings
    ): SvgPreview {
        const preview = SvgPreview.create(
            resource,
            previewSettings.viewColumn,
            this.contentProvider);

        this.setViewActiveContext(true);
        return this.registerView(preview);
    }

    private registerView(
        preview: SvgPreview
    ): SvgPreview {
        this.views.push(preview);

        preview.onDispose(() => {
            const existing = this.views.indexOf(preview);
            if (existing === -1) {
                return;
            }

            this.views.splice(existing, 1);
        });

        return preview;
    }

    private setViewActiveContext(value: boolean) {
        vscode.commands.executeCommand('setContext', SvgWebviewManager.svgActiveContextKey, value);
    }

    protected static readonly svgActiveContextKey: string = 'svgPreviewFocus';
}

export class SvgExportWebviewManager extends WebviewManager {
    protected readonly views: SvgExport[] = [];
    public constructor(
        protected readonly contentProvider: ExportDocumentContentProvider
    ) {
        super();
        this.disposables.push(vscode.window.registerWebviewPanelSerializer(SvgExport.viewType, this));
    }

    public async deserializeWebviewPanel(
        webview: vscode.WebviewPanel,
        state: any
    ): Promise<void> {
        const exp = await SvgExport.revive(
            webview,
            state,
            this.contentProvider);

        this.registerView(exp);
    }

    public view(
        resource: vscode.Uri,
        viewSettings: ViewSettings
    ): void {
        let view = this.getExistingView(resource);
        if (view) {
            view.reveal();
        } else {
            view = this.createView(resource, viewSettings);
        }

        view.update(resource);
    }

    private getExistingView(
        resource: vscode.Uri
    ): SvgExport | undefined {
        return this.views.find(preview =>
            preview.matchesResource(resource));
    }

    private registerView(
        view: SvgExport
    ): SvgExport {
        this.views.push(view);

        view.onDispose(() => {
            const existing = this.views.indexOf(view);
            if (existing === -1) {
                return;
            }

            this.views.splice(existing, 1);
        });

        return view;
    }

    private createView(
        resource: vscode.Uri,
        previewSettings: ViewSettings
    ): SvgExport {
        const preview = SvgExport.create(
            resource,
            previewSettings.viewColumn,
            this.contentProvider);

        this.setViewActiveContext(true);
        return this.registerView(preview);
    }

    private setViewActiveContext(value: boolean) {
        vscode.commands.executeCommand('setContext', SvgExportWebviewManager.svgActiveContextKey, value);
    }

    protected static readonly svgActiveContextKey: string = 'svgExportFocus';
}