# ArcheRage Addon Manager

A modern desktop application for managing ArcheRage game addons with cloud storage integration and developer authentication.

## Features

- **Clean Desktop Interface**: Modern, user-friendly interface for browsing and managing addons
- **Cloud Storage**: Google Drive integration for addon file storage and synchronization
- **Discord Authentication**: Secure OAuth2 login system for developers
- **Automatic Installation**: Seamless addon installation to the correct game directory
- **Developer Panel**: Interface for authenticated developers to upload and manage addons
- **Version Management**: Automatic update detection and version tracking
- **Local Database**: SQLite database for tracking installations and user data

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

To create a desktop executable:

1. Install Electron dependencies:
   ```bash
   npm install electron electron-builder --save-dev
   ```

2. Build the application:
   ```bash
   npm run build
   npm run build-electron
   ```

## Configuration

The application automatically installs addons to: `Documents\ArcheRage\Addon`

## Development

- Built with React, TypeScript, and Tailwind CSS
- Uses Vite for fast development and building
- Electron for desktop application packaging
- Local SQLite database for data persistence

## License

Private project for ArcheRage community.