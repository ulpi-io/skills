---
name: build-dmg
version: 1.0.0
description: |
  Build a distributable DMG installer for any macOS Xcode project. Handles archiving,
  code signing, DMG creation with styled Finder window, and version management.
  Trigger on: "build a DMG", "create DMG installer", "package as DMG", "build for distribution",
  or when the user wants to distribute a macOS app outside the App Store.
allowed-tools:
  - Bash
  - Read
  - Write
---

# build-dmg

Build a styled DMG installer from any macOS Xcode project.

## Before Running

Detect the project settings by reading available files:

1. **App name** — from `package.json` name, `project.yml` name, `.xcodeproj` directory name, or ask the user
2. **Scheme** — run `xcodebuild -list` to discover available schemes, or ask the user
3. **Project/Workspace** — auto-detected if only one `.xcodeproj` or `.xcworkspace` exists at root
4. **ExportOptions.plist** — check if `scripts/ExportOptions.plist` exists. If not, ask the user for the path or whether to create one
5. **VERSION file** — check if a `VERSION` file exists at project root
6. **xcodegen** — check if `project.yml` exists (indicates xcodegen usage)
7. **Team ID** — check existing build settings or ask the user

Present the detected configuration to the user and confirm before building.

## Running the Build

The build script is at `helpers/build-dmg.sh` (relative to this skill). Before running, check if `scripts/build-dmg.sh` already exists in the project. If not, ask the user: "I need to copy the build script to `scripts/build-dmg.sh` in your project. OK to proceed?" **Do NOT copy the script without user confirmation.** Then run it with the required env vars:

```bash
APP_NAME="<app>" SCHEME="<scheme>" ./scripts/build-dmg.sh
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_NAME` | Display name for the .app and DMG volume |
| `SCHEME` | Xcode scheme to build |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT` | auto-detected | Path to `.xcodeproj` |
| `WORKSPACE` | — | Path to `.xcworkspace` (takes precedence over PROJECT) |
| `INFO_PLIST` | `<SCHEME>/Info.plist` | Path to Info.plist for version injection |
| `EXPORT_OPTIONS` | `scripts/ExportOptions.plist` | Path to ExportOptions.plist |
| `TEAM_ID` | — | Apple Development Team ID |
| `VERSION_FILE` | `VERSION` | Path to VERSION file. Set to `"none"` to skip version management |
| `USE_XCODEGEN` | `0` | Set to `"1"` to run `xcodegen generate` before building |
| `DMG_BACKGROUND` | — | Path to a background image for the DMG window |

## After the Build

1. **Success** — report the DMG path, version, and build number from the script output
2. **Failure** — extract the error lines from xcodebuild output and summarize what went wrong
3. **Version bump** — if the script bumped the VERSION file, remind the user to commit it

## ExportOptions.plist

If the project doesn't have one, create a minimal `scripts/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
```

For distribution outside the App Store, change `method` to `developer-id` and ensure the team has a Developer ID certificate.

**Do NOT create or modify ExportOptions.plist without asking the user first.**
