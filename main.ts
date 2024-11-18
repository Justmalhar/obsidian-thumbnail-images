import { App, Modal, Plugin, PluginSettingTab, Setting, Notice, MarkdownView, requestUrl, DropdownComponent, ButtonComponent, normalizePath, TFile, DataAdapter } from 'obsidian';
import OpenAI from 'openai';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface PluginSettings {
    replicateApiToken: string;
    openaiApiKey: string;
    openaiBasePath: string;
    appName: string;
    siteUrl: string;
    useAutoPrompt: boolean;
    llmModel: string;
    defaultVersion: string;
    defaultModel: string;
    defaultNumOutputs: number;
    defaultInferenceSteps: number;
    defaultOutputFormat: string;
    outputFolder: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
    replicateApiToken: '',
    openaiApiKey: '',
    openaiBasePath: 'https://openrouter.ai/api/v1',
    appName: 'Obsidian Image Generator',
    siteUrl: 'https://obsidian.md',
    useAutoPrompt: false,
    llmModel: 'liquid/lfm-40b:free',
    defaultVersion: '42799c2b58e0a6ca82d3a1d90f655f6386542e325d2017e3256b092189f567b8',
    defaultModel: 'dev',
    defaultNumOutputs: 1,
    defaultInferenceSteps: 24,
    defaultOutputFormat: 'webp',
    outputFolder: 'generated-images'
}

interface GenerationConfig {
    version: string;
    model: string;
    numOutputs: number;
    inferenceSteps: number;
    outputFormat: string;
    prompt: string;
}

class PromptModal extends Modal {
    result: string;
    onSubmit: (config: GenerationConfig) => void;
    content: string;
    plugin: ImageGeneratorPlugin;
    config: GenerationConfig;
    promptInput: HTMLTextAreaElement;
    loadingPrompt: boolean = false;
    loadingEl: HTMLElement;

    constructor(app: App, plugin: ImageGeneratorPlugin, content: string, onSubmit: (config: GenerationConfig) => void) {
        super(app);
        this.plugin = plugin;
        this.content = content;
        this.onSubmit = onSubmit;
        this.config = {
            version: plugin.settings.defaultVersion,
            model: plugin.settings.defaultModel,
            numOutputs: plugin.settings.defaultNumOutputs,
            inferenceSteps: plugin.settings.defaultInferenceSteps,
            outputFormat: plugin.settings.defaultOutputFormat,
            prompt: ''
        };
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Generate Image", cls: "modal-title" });

        const settingsGrid = contentEl.createDiv({ cls: "settings-grid" });

        new Setting(settingsGrid)
            .setClass("setting-item")
            .setName('Version')
            .setDesc('Model version to use')
            .addText(text => text
                .setValue(this.config.version)
                .onChange(async (value) => {
                    this.config.version = value;
                }));

        new Setting(settingsGrid)
            .setClass("setting-item")
            .setName('Model')
            .setDesc('Model type to use')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'dev': 'Dev',
                    'schnell': 'Schnell'
                })
                .setValue(this.config.model)
                .onChange(async (value) => {
                    this.config.model = value;
                }));

        new Setting(settingsGrid)
            .setClass("setting-item")
            .setName('Number of Outputs')
            .setDesc('Number of images to generate')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    '1': '1',
                    '2': '2',
                    '3': '3',
                    '4': '4'
                })
                .setValue(this.config.numOutputs.toString())
                .onChange(async (value) => {
                    this.config.numOutputs = parseInt(value);
                }));

        const inferenceSteps = Array.from({length: 12}, (_, i) => (i + 1) * 4)
            .reduce((obj, num) => ({...obj, [num]: num.toString()}), {});

        new Setting(settingsGrid)
            .setClass("setting-item")
            .setName('Inference Steps')
            .setDesc('Number of inference steps')
            .addDropdown(dropdown => dropdown
                .addOptions(inferenceSteps)
                .setValue(this.config.inferenceSteps.toString())
                .onChange(async (value) => {
                    this.config.inferenceSteps = parseInt(value);
                }));

        new Setting(settingsGrid)
            .setClass("setting-item")
            .setName('Output Format')
            .setDesc('Image output format')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'png': 'PNG',
                    'webp': 'WebP',
                    'jpg': 'JPG'
                })
                .setValue(this.config.outputFormat)
                .onChange(async (value) => {
                    this.config.outputFormat = value;
                }));

        const promptContainer = contentEl.createDiv({ cls: "prompt-container" });
        const promptHeader = promptContainer.createDiv({ cls: "prompt-header" });
        promptHeader.createEl("h3", { text: "Image Prompt" });

        const generatePromptButton = new ButtonComponent(promptHeader)
            .setButtonText("Generate Prompt")
            .onClick(async () => {
                await this.generatePrompt();
            });

        this.promptInput = promptContainer.createEl("textarea", {
            cls: "prompt-textarea",
            attr: {
                placeholder: "Enter your image prompt or click 'Generate Prompt' to create one automatically"
            }
        });

        this.loadingEl = promptContainer.createDiv({ cls: "loading-prompt" });
        this.loadingEl.hide();

        const buttonContainer = contentEl.createDiv({ cls: "button-container" });

        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => {
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("Generate Image")
            .setCta()
            .onClick(() => {
                this.config.prompt = this.promptInput.value;
                this.close();
                this.onSubmit(this.config);
            });
    }

    async generatePrompt() {
        if (this.loadingPrompt) return;

        this.loadingPrompt = true;
        this.loadingEl.empty();
        this.loadingEl.show();
        
        const spinner = this.loadingEl.createDiv({ cls: "spinner" });
        this.loadingEl.createSpan({ text: "Generating prompt..." });

        try {
            const prompt = await this.generatePromptFromContent(this.content);
            this.promptInput.value = prompt;
        } catch (error) {
            new Notice('Failed to generate prompt. Please try again or enter manually.');
            console.error('Error generating prompt:', error);
        } finally {
            this.loadingPrompt = false;
            this.loadingEl.hide();
        }
    }

    async generatePromptFromContent(content: string): Promise<string> {
        const openai = new OpenAI({
            baseURL: this.plugin.settings.openaiBasePath,
            apiKey: this.plugin.settings.openaiApiKey,
            dangerouslyAllowBrowser: true,
            defaultHeaders: {
                "HTTP-Referer": this.plugin.settings.siteUrl,
                "X-Title": this.plugin.settings.appName,
            }
        });

        const response = await openai.chat.completions.create({
            model: this.plugin.settings.llmModel,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that generates image prompts based on text content."
                },
                {
                    role: "user",
                    content: `Generate a detailed image prompt based on this text: ${content}`
                }
            ]
        });

        return response.choices[0].message.content || "";
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class ImageGeneratorPlugin extends Plugin {
    settings: PluginSettings;
    loadingEl: HTMLElement | null = null;

    async onload() {
        await this.loadSettings();
        
        this.ensureOutputFolder();

        this.addRibbonIcon('image-plus', 'Generate Image', () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                const content = activeView.getViewData();
                this.showPromptModal(content);
            }
        });

        this.addSettingTab(new ImageGeneratorSettingTab(this.app, this));
    }

    ensureOutputFolder() {
        const adapter = this.app.vault.adapter as any;
        const folderPath = normalizePath(join(adapter.getBasePath(), this.settings.outputFolder));
        if (!existsSync(folderPath)) {
            try {
                mkdirSync(folderPath, { recursive: true });
            } catch (error) {
                console.error('Failed to create output folder:', error);
                new Notice('Failed to create output folder. Please check your settings.');
            }
        }
    }

    async downloadAndSaveImage(url: string, index: number): Promise<string> {
        try {
            const response = await requestUrl({
                url: url,
                method: 'GET'
            });

            if (!response.arrayBuffer) {
                throw new Error('Failed to download image');
            }

            const timestamp = Date.now();
            const fileName = `generated-image-${timestamp}-${index}.${this.settings.defaultOutputFormat}`;
            const filePath = normalizePath(join(this.settings.outputFolder, fileName));

            await this.app.vault.createBinary(filePath, response.arrayBuffer);

            return filePath;
        } catch (error) {
            console.error('Failed to download and save image:', error);
            throw error;
        }
    }

    async showPromptModal(content: string) {
        new PromptModal(
            this.app,
            this,
            content,
            (config) => this.generateImage(config)
        ).open();
    }

    async generateImage(config: GenerationConfig) {
        this.loadingEl = document.createElement('div');
        this.loadingEl.addClass('image-generator-loading');
        this.loadingEl.innerHTML = `
            <div class="spinner"></div>
            <div>Generating image...</div>
        `;
        document.body.appendChild(this.loadingEl);

        try {
            const createResponse = await requestUrl({
                url: 'https://api.replicate.com/v1/predictions',
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.settings.replicateApiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: config.version,
                    input: {
                        model: config.model,
                        prompt: config.prompt,
                        lora_scale: 1,
                        num_outputs: config.numOutputs,
                        aspect_ratio: "16:9",
                        output_format: config.outputFormat,
                        guidance_scale: 3.5,
                        output_quality: 100,
                        num_inference_steps: config.inferenceSteps
                    }
                })
            });

            const prediction = createResponse.json;
            let output: string[] = [];

            while (true) {
                const getResponse = await requestUrl({
                    url: `https://api.replicate.com/v1/predictions/${prediction.id}`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${this.settings.replicateApiToken}`,
                        'Content-Type': 'application/json',
                    }
                });

                const status = getResponse.json;

                if (status.status === 'succeeded') {
                    output = status.output;
                    break;
                } else if (status.status === 'failed') {
                    throw new Error('Image generation failed');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (output && output.length > 0) {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    const cursor = activeView.editor.getCursor();
                    
                    const savedImages = await Promise.all(
                        output.map((url, index) => this.downloadAndSaveImage(url, index))
                    );

                    const imageMarkdown = savedImages.map(path => `![Generated Image](${path})\n`).join('');
                    
                    activeView.editor.replaceRange(
                        imageMarkdown,
                        cursor
                    );

                    new Notice(`Successfully saved ${savedImages.length} image(s) to ${this.settings.outputFolder}`);
                }
            }
        } catch (error) {
            console.error('Error generating image:', error);
            new Notice('Failed to generate or save image. Please check your settings and try again.');
        } finally {
            if (this.loadingEl) {
                this.loadingEl.remove();
                this.loadingEl = null;
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class ImageGeneratorSettingTab extends PluginSettingTab {
    plugin: ImageGeneratorPlugin;

    constructor(app: App, plugin: ImageGeneratorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Image Generator Settings' });

        new Setting(containerEl)
            .setName('Output Folder')
            .setDesc('Folder path where generated images will be saved (relative to vault)')
            .addText(text => text
                .setPlaceholder('generated-images')
                .setValue(this.plugin.settings.outputFolder)
                .onChange(async (value) => {
                    this.plugin.settings.outputFolder = value;
                    await this.plugin.saveSettings();
                    this.plugin.ensureOutputFolder();
                }));

        new Setting(containerEl)
            .setName('Replicate API Token')
            .setDesc('Enter your Replicate API token')
            .addText(text => text
                .setPlaceholder('Enter your token')
                .setValue(this.plugin.settings.replicateApiToken)
                .onChange(async (value) => {
                    this.plugin.settings.replicateApiToken = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('OpenRouter API Key')
            .setDesc('Enter your OpenRouter API key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.openaiApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.openaiApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('OpenRouter Base Path')
            .setDesc('API base path for OpenRouter (default: https://openrouter.ai/api/v1)')
            .addText(text => text
                .setPlaceholder('Enter base path')
                .setValue(this.plugin.settings.openaiBasePath)
                .onChange(async (value) => {
                    this.plugin.settings.openaiBasePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('App Name')
            .setDesc('Your app name for OpenRouter rankings')
            .addText(text => text
                .setPlaceholder('Enter app name')
                .setValue(this.plugin.settings.appName)
                .onChange(async (value) => {
                    this.plugin.settings.appName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Site URL')
            .setDesc('Your site URL for OpenRouter rankings')
            .addText(text => text
                .setPlaceholder('Enter site URL')
                .setValue(this.plugin.settings.siteUrl)
                .onChange(async (value) => {
                    this.plugin.settings.siteUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('LLM Model')
            .setDesc('Model to use for prompt generation (default: liquid/lfm-40b:free)')
            .addText(text => text
                .setPlaceholder('Enter model name')
                .setValue(this.plugin.settings.llmModel)
                .onChange(async (value) => {
                    this.plugin.settings.llmModel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default Version')
            .setDesc('Default model version to use')
            .addText(text => text
                .setPlaceholder('Enter version')
                .setValue(this.plugin.settings.defaultVersion)
                .onChange(async (value) => {
                    this.plugin.settings.defaultVersion = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default Model')
            .setDesc('Default model type to use')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'dev': 'Dev',
                    'schnell': 'Schnell'
                })
                .setValue(this.plugin.settings.defaultModel)
                .onChange(async (value) => {
                    this.plugin.settings.defaultModel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default Number of Outputs')
            .setDesc('Default number of images to generate (1-4)')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    '1': '1',
                    '2': '2',
                    '3': '3',
                    '4': '4'
                })
                .setValue(this.plugin.settings.defaultNumOutputs.toString())
                .onChange(async (value) => {
                    this.plugin.settings.defaultNumOutputs = parseInt(value);
                    await this.plugin.saveSettings();
                }));

        const inferenceSteps = Array.from({length: 12}, (_, i) => (i + 1) * 4)
            .reduce((obj, num) => ({...obj, [num]: num.toString()}), {});

        new Setting(containerEl)
            .setName('Default Inference Steps')
            .setDesc('Default number of inference steps (4-48)')
            .addDropdown(dropdown => dropdown
                .addOptions(inferenceSteps)
                .setValue(this.plugin.settings.defaultInferenceSteps.toString())
                .onChange(async (value) => {
                    this.plugin.settings.defaultInferenceSteps = parseInt(value);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default Output Format')
            .setDesc('Default image output format')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'png': 'PNG',
                    'webp': 'WebP',
                    'jpg': 'JPG'
                })
                .setValue(this.plugin.settings.defaultOutputFormat)
                .onChange(async (value) => {
                    this.plugin.settings.defaultOutputFormat = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto Prompt')
            .setDesc('Automatically generate prompts based on document content')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useAutoPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.useAutoPrompt = value;
                    await this.plugin.saveSettings();
                }));
    }
}
