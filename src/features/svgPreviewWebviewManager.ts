import * as vscode from 'vscode';
import { SvgDocumentContentProvider } from '../svgProvider';
import { SvgPreview, PreviewSettings } from './svgPreview';

export class SvgPreviewWebviewManager implements vscode.WebviewPanelSerializer {
    private readonly previews: SvgPreview[] = [];
    private activePreview: SvgPreview | undefined = undefined;

    private readonly disposables: vscode.Disposable[] = [];

    public constructor(
        private readonly contentProvider: SvgDocumentContentProvider,
        private readonly context: vscode.ExtensionContext
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
        while (this.previews.length) {
            const item = this.previews.pop();
            if (item) {
                item.dispose();
            }
        }
    }

    public refresh() {
        for (const preview of this.previews) {
            preview.refresh();
        }
    }


    public preview(
        resource: vscode.Uri,
        previewSettings: PreviewSettings
    ): void {
        let preview = this.getExistingPreview(resource, previewSettings);
        if (preview) {
            preview.reveal(previewSettings.previewColumn);
        } else {
            preview = this.createNewPreview(resource, previewSettings);
        }

        preview.update(resource);
    }

    public get activePreviewResource() {
        return this.activePreview && this.activePreview.resource;
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

    private getExistingPreview(
        resource: vscode.Uri,
        previewSettings: PreviewSettings
    ): SvgPreview | undefined {
        return this.previews.find(preview =>
            preview.matchesResource(resource, previewSettings.previewColumn));
    }

    private createNewPreview(
        resource: vscode.Uri,
        previewSettings: PreviewSettings
    ): SvgPreview {
        const preview = SvgPreview.create(
            resource,
            previewSettings.previewColumn,
            this.contentProvider, this.context);

        this.setPreviewActiveContext(true);
        this.activePreview = preview;
        return this.registerPreview(preview);
    }

    private registerPreview(
        preview: SvgPreview
    ): SvgPreview {
        this.previews.push(preview);

        preview.onDispose(() => {
            const existing = this.previews.indexOf(preview);
            if (existing === -1) {
                return;
            }

            this.previews.splice(existing, 1);
            if (this.activePreview === preview) {
                this.setPreviewActiveContext(false);
                this.activePreview = undefined;
            }
        });

        preview.onDidChangeViewState(({ webviewPanel }) => {
            let tmpDispose = this.previews.filter(otherPreview => preview !== otherPreview && preview!.matches(otherPreview));
            while (tmpDispose.length) {
                const item = tmpDispose.pop();
                if (item) {
                    item.dispose();
                }
            }
            this.setPreviewActiveContext(webviewPanel.active);
            this.activePreview = webviewPanel.active ? preview : undefined;
        });

        return preview;
    }

    private setPreviewActiveContext(value: boolean) {
        vscode.commands.executeCommand('setContext', SvgPreviewWebviewManager.svgPreviewActiveContextKey, value);
    }

    private static readonly svgPreviewActiveContextKey = 'svgPreviewFocus';
}