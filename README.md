# Obsidian Thumbnail Images Generator (Beta)

<div align="center">

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22obsidian-thumbnail-images-generator%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)
[![GitHub License](https://img.shields.io/github/license/justmalhar/obsidian-thumbnail-images)](https://github.com/justmalhar/obsidian-thumbnail-images/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/justmalhar/obsidian-thumbnail-images)](https://github.com/justmalhar/obsidian-thumbnail-images/issues)

Generate stunning AI-powered thumbnail images directly within Obsidian using Replicate's state-of-the-art models.

[Installation](#installation) • [Features](#features) • [Usage](#usage) • [Configuration](#configuration)

</div>

## 🌟 Highlights

- 🎨 Generate professional thumbnails with AI
- 🤖 Auto-generate prompts from note content
- 🎯 Multiple output options (1-4 images)
- 📁 Organized file management
- ⚡ Real-time generation status
- 🔧 Highly configurable

## ✨ Features

### Image Generation
- High-quality image generation using Replicate's AI models
- Multiple output formats (PNG/WebP/JPG)
- Configurable inference steps (4-48)
- Real-time progress tracking

### Smart Prompt Generation
- AI-powered prompt generation using OpenRouter
- Context-aware suggestions from note content
- Interactive prompt editing
- Customizable language models

### File Management
- Automatic folder organization
- Timestamp-based unique naming
- Proper vault integration
- Relative path handling

## 🚀 Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Thumbnail Images Generator"
4. Install the plugin
5. Enable it in your Community Plugins list

## ⚙️ Configuration

### Required Settings

1. **Replicate API Token**
   - Get your token from [Replicate](https://replicate.com)
   - Add it in plugin settings

2. **Output Folder**
   - Set your preferred image storage location
   - Default: "generated-images"

### Optional Settings

#### OpenRouter Configuration
- API Key
- Base Path
- App Name
- Site URL
- LLM Model

#### Generation Defaults
- Model Version
- Model Type (dev/schnell)
- Number of Outputs (1-4)
- Inference Steps (4-48)
- Output Format (PNG/WebP/JPG)

## 📖 Usage

### Quick Start

1. Click the image generator icon in the ribbon
2. Enter a prompt or use "Generate Prompt"
3. Adjust settings if needed
4. Click "Generate Image"
5. Images will be saved and embedded automatically

### Advanced Options

#### Generation Settings
- **Version**: Choose model version
- **Model**: Select between dev and schnell
- **Outputs**: Generate multiple images
- **Steps**: Control generation quality
- **Format**: Choose output format

#### Auto-Prompt Feature
1. Configure OpenRouter settings
2. Use "Generate Prompt" in the interface
3. Edit generated suggestions
4. Generate your images

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/justmalhar/obsidian-thumbnail-images

# Install dependencies
npm install

# Build the plugin
npm run build
```

### Manual Installation

1. Create `.obsidian/plugins/obsidian-thumbnail-images/` in your vault
2. Copy `main.js`, `manifest.json`, and `styles.css`
3. Reload Obsidian
4. Enable the plugin

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Support

If you encounter any issues:
1. Check [existing issues](https://github.com/justmalhar/obsidian-thumbnail-images/issues)
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected behavior
   - Your environment details

## 👨‍💻 Author

**Malhar Ujawane**
- LinkedIn: [malharujawane](https://www.linkedin.com/in/malharujawane/)
- GitHub: [justmalhar](https://github.com/justmalhar)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/justmalhar">Malhar Ujawane</a>
</div>
