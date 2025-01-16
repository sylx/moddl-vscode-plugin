# ModDL Language Support for Visual Studio Code

Adds language support for ModDL files in Visual Studio Code, including syntax highlighting and playback controls.


# What is ModDL?

https://github.com/bolta/ModularAudioNative

ModDL is a domain-specific programming language designed for music composition and synthesis. It combines traditional Music Macro Language (MML) notation with modern modular synthesis concepts. The language allows composers to define instruments using various oscillators, filters, and envelopes, while sequencing musical data through an MML-like syntax. ModDL supports both simple sound creation and complex audio processing through its module system, making it suitable for both beginners and experienced electronic musicians.

Key features:

- Modular synthesis architecture
- Traditional MML-based sequencing
- Built-in effects processing
- Multi-track composition support
- WAV file export capability

Please see original repository for more information!

## Features

- Syntax highlighting for .moddl files
- Play/Stop commands for ModDL files
- Configurable ModDL executable path
- Keyboard shortcuts for playback control

## Requirements

- Visual Studio Code 1.96.0 or newer
- ModDL executable (moddl.exe) installed and accessible in PATH, or configured in settings

## Installation

1. Download the .vsix file from the releases page
2. Open VS Code
3. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
4. Type "Install from VSIX" and select it
5. Navigate to the downloaded .vsix file and select it

## Configuration

You can configure the extension through VS Code's settings:

- `moddl.executablePath`: Path to the ModDL executable (default: "moddl")
- `moddl.defaultOutputType`: Default output type for ModDL playback (options: "audio", "stdout", "null")

## Usage

### Playing ModDL Files

1. Open a .moddl file
2. Use one of these methods to play:
   - Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   - Use the command palette and search for "ModDL: Play Current File"

### Stopping Playback

1. Use one of these methods to stop:
   - Press Ctrl+Shift+S (Cmd+Shift+S on macOS)
   - Use the command palette and search for "ModDL: Stop Playback"

## Known Issues

Please report issues on the GitHub repository.

## Release Notes

### 0.1.0

Initial release with basic features:
- Syntax highlighting
- Play/Stop commands
- Basic configuration options

## License

MIT License