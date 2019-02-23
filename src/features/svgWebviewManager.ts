import * as vscode from 'vscode';
import { SvgDocumentContentProvider } from '../svgProvider';
import { SvgPreview, ViewSettings } from './svgPreview';

export class SvgWebviewManager implements vscode.WebviewPanelSerializer {
    private readonly views: SvgPreview[] = [];

    private readonly disposables: vscode.Disposable[] = [];

    public constructor(
        private readonly contentProvider: SvgDocumentContentProvider
    ) {
        this.disposables.push(vscode.window.registerWebviewPanelSerializer(SvgPreview.viewType, this));
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

    public refresh() {
        for (const preview of this.views) {
            preview.refresh();
        }
    }


    public view(
        resource: vscode.Uri,
        viewSettings: ViewSettings
    ): void {
        let view = this.getExistingView(resource);
        if (view) {
            view.reveal(viewSettings.viewColumn);
        } else {
            view = this.createPreview(resource, viewSettings);
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

        this.registerPreview(preview);
    }

    private getExistingView(
        resource: vscode.Uri
    ): SvgPreview | undefined {
        return this.views.find(preview =>
            preview.matchesResource(resource));
    }

    private createPreview(
        resource: vscode.Uri,
        previewSettings: ViewSettings
    ): SvgPreview {
        const preview = SvgPreview.create(
            resource,
            previewSettings.viewColumn,
            this.contentProvider);

        this.setPreviewActiveContext(true);
        return this.registerPreview(preview);
    }

    private registerPreview(
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

    private setPreviewActiveContext(value: boolean) {
        vscode.commands.executeCommand('setContext', SvgWebviewManager.svgPreviewActiveContextKey, value);
    }

    private static readonly svgPreviewActiveContextKey = 'svgPreviewFocus';
}