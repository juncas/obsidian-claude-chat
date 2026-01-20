# Obsidian Community Plugin Submission Guide

This document provides the necessary information and steps to submit this plugin to the Obsidian community plugins repository.

## Official Checklist Verification

The following table shows the verification status of each item in the official PR checklist:

| Checklist Item | Status | Notes |
|----------------|--------|-------|
| Quality attestation | ✅ Ready | Code follows best practices, properly linted and typed |
| **Platform Testing** | | |
| - Windows | ⏳ Pending | Desktop only plugin - needs manual testing |
| - macOS | ⏳ Pending | Desktop only plugin - needs manual testing |
| - Linux | ⏳ Pending | Desktop only plugin - needs manual testing |
| - Android | N/A | `isDesktopOnly: true` - not applicable |
| - iOS | N/A | `isDesktopOnly: true` - not applicable |
| **Release Files** | | |
| - main.js | ✅ Automated | CI builds and verifies existence |
| - manifest.json | ✅ Verified | All required fields present |
| - styles.css | ✅ Present | Custom styles included |
| Release name format | ✅ Automated | CI ensures no `v` prefix (e.g., `1.0.0`) |
| ID consistency | ✅ Verified | `claude-chat-obsidian` matches in manifest.json and community-plugins.json entry |
| README documentation | ✅ Complete | Purpose, installation, usage, and troubleshooting documented |
| Developer policies | ✅ Reviewed | Plugin adheres to Obsidian developer policies |
| Plugin guidelines | ✅ Reviewed | Self-reviewed against common pitfalls |
| LICENSE file | ✅ Present | MIT License |
| Code attribution | ✅ N/A | No third-party plugin code used |

## CI/CD Automation

The following automated checks are performed:

### CI Workflow (`.github/workflows/ci.yml`)
- ✅ **manifest.json validation** - Verifies all required fields and version format
- ✅ **Version consistency** - Checks manifest.json and package.json versions match
- ✅ **ESLint** - Code style and quality checks
- ✅ **TypeScript type checking** - Static type validation
- ✅ **Build verification** - Confirms all artifacts are generated
- ✅ **Artifact upload** - Stores build outputs for verification

### Release Workflow (`.github/workflows/release.yml`)
- ✅ **Version tag validation** - Only accepts `x.y.z` format (no `v` prefix)
- ✅ **Version consistency check** - Validates tag matches manifest.json and package.json
- ✅ **Automated release creation** - Creates GitHub release with correct name
- ✅ **Release artifacts** - Attaches main.js, manifest.json, and styles.css

## Pre-submission Checklist

Before submitting your plugin, ensure the following requirements are met:

- [x] Plugin repository is public on GitHub
- [x] Contains `main.js` (compiled plugin code)
- [x] Contains `manifest.json` with correct metadata
- [x] Contains `README.md` describing the plugin
- [x] Contains `LICENSE` file (MIT License)
- [x] Contains `styles.css` for custom styles
- [x] GitHub Issues are enabled
- [x] Release workflow is configured (`.github/workflows/release.yml`)
- [x] CI workflow validates all requirements (`.github/workflows/ci.yml`)

## Step 1: Create a GitHub Release

1. Ensure the version in `manifest.json` is correct (currently `1.0.0`)
2. Create a git tag matching the version:
   ```bash
   git tag 1.0.0
   git push origin 1.0.0
   ```
3. The GitHub Actions workflow will automatically create a release with:
   - `main.js`
   - `manifest.json`
   - `styles.css`

## Step 2: Fork the obsidian-releases Repository

1. Go to https://github.com/obsidianmd/obsidian-releases
2. Click "Fork" to create your own copy
3. Clone your fork locally or use GitHub's web editor

## Step 3: Add Plugin Entry to community-plugins.json

Add the following JSON entry at the **end** of the `community-plugins.json` array (before the closing `]`):

```json
{
  "id": "claude-chat-obsidian",
  "name": "Claude Chat",
  "author": "juncas",
  "description": "A native chat interface for Claude Code CLI in Obsidian. Supports multi-session conversations, streaming responses, message editing, and markdown export.",
  "repo": "juncas/obsidian-claude-chat"
}
```

> **Note:** Make sure to add a comma after the previous entry in the JSON array.

## Step 4: Create the Pull Request

1. Commit your changes to a new branch (e.g., `add-claude-chat-plugin`)
2. Push to your fork
3. Open a Pull Request to `obsidianmd/obsidian-releases`
4. Use the following PR title format: `Add plugin: Claude Chat`
5. **Important:** When opening the PR, switch to preview mode and select the option to go through the submission checklist
6. Fill out the PR template with the required information

## PR Description Template

When creating the Pull Request, the official PR template will be shown. Here is the **official PR checklist** that you must complete:

```markdown
# I am submitting a new Community Plugin

- [ ] I attest that I have done my best to deliver a high-quality plugin, am proud of the code I have written, and would recommend it to others. I commit to maintaining the plugin and being responsive to bug reports. If I am no longer able to maintain it, I will make reasonable efforts to find a successor maintainer or withdraw the plugin from the directory.

## Repo URL

Link to my plugin: https://github.com/juncas/obsidian-claude-chat

## Release Checklist
- [ ] I have tested the plugin on
  - [ ]  Windows
  - [ ]  macOS
  - [ ]  Linux
  - [ ]  Android _(if applicable)_
  - [ ]  iOS _(if applicable)_
- [ ] My GitHub release contains all required files (as individual files, not just in the source.zip / source.tar.gz)
  - [ ] `main.js`
  - [ ] `manifest.json`
  - [ ] `styles.css` _(optional)_
- [ ] GitHub release name matches the exact version number specified in my manifest.json (_**Note:** Use the exact version number, don't include a prefix `v`_)
- [ ] The `id` in my `manifest.json` matches the `id` in the `community-plugins.json` file.
- [ ] My README.md describes the plugin's purpose and provides clear usage instructions.
- [ ] I have read the developer policies at https://docs.obsidian.md/Developer+policies, and have assessed my plugin's adherence to these policies.
- [ ] I have read the tips in https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines and have self-reviewed my plugin to avoid these common pitfalls.
- [ ] I have added a license in the LICENSE file.
- [ ] My project respects and is compatible with the original license of any code from other plugins that I'm using.
      I have given proper attribution to these other projects in my `README.md`.
```

> **Note:** Before submitting, make sure to:
> 1. Test the plugin on all supported platforms (Windows, macOS, Linux)
> 2. Create a release with the exact version number (e.g., `1.0.0`, not `v1.0.0`)
> 3. Review the [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)

## Plugin Manifest Details

The current `manifest.json` contains:

| Field         | Value |
|---------------|-------|
| id | `claude-chat-obsidian` |
| name | `Claude Chat` |
| version | `1.0.0` |
| minAppVersion | `0.15.0` |
| description | A native chat interface for Claude Code CLI in Obsidian. Supports multi-session conversations, streaming responses, message editing, and markdown export. |
| author | `juncas` |
| authorUrl | `https://github.com/juncas` |
| isDesktopOnly | `true` |

## How Community Plugins Are Pulled

According to the official documentation:

1. Obsidian reads the list of plugins from `community-plugins.json`
2. The `name`, `author` and `description` fields are used for searching
3. When users open the plugin detail page, Obsidian pulls `manifest.json` and `README.md` from your GitHub repo
4. The `manifest.json` in your repo is used to determine the latest version
5. Actual plugin files are fetched from your GitHub releases (tagged identically to the version in `manifest.json`)
6. Obsidian downloads `manifest.json`, `main.js`, and `styles.css` (if available) from the release

## Important Links

- [Obsidian Plugin Submission Guide](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Plugin Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) - Tips to avoid common pitfalls
- [Developer Policies](https://docs.obsidian.md/Developer+policies) - All submissions must conform to these policies
- [Obsidian Releases Repository](https://github.com/obsidianmd/obsidian-releases)
- [Community Plugins JSON](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json)

## After Submission

1. Wait for the Obsidian team to review your submission
2. Address any feedback or required changes
3. Once merged, your plugin will appear in the Community Plugins browser within 24-48 hours

### Announcing Your Plugin

Once admitted to the plugin browser, you can announce the public availability:

- [Obsidian Forums](https://forum.obsidian.md/c/share-showcase/9) - Post as a showcase
- [Discord Server](https://discord.gg/veuWUTm) - Post in the `#updates` channel (requires `developer` role)
