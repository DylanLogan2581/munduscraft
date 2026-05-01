# Contributing to munduscraft

This repository is a packwiz source folder for a Minecraft 1.21.1 modpack. Work here as source control for the pack, not as a live `.minecraft` or launcher instance. Read `pack.toml` for the current loader version.

## Install Packwiz

Install `packwiz` before changing pack contents. The official docs are at <https://packwiz.infra.link/>. The packwiz installation page lists prebuilt artifacts and also supports building from source with:

```sh
go install github.com/packwiz/packwiz@latest
```

After installation, verify the CLI is available:

```sh
packwiz --help
```

Use command-specific help whenever a command is unfamiliar:

```sh
packwiz modrinth add --help
packwiz curseforge add --help
packwiz refresh --help
packwiz serve --help
```

## Project Shape

- `pack.toml` is the pack manifest. It defines the pack name, author, pack version, Minecraft version, loader version, index file, index hash, and hash format.
- `index.toml` is generated state. It lists files that packwiz should install into the pack and records their hashes. Do not hand-edit it unless there is no packwiz command for the change.
- `.pw.toml` files are metadata files for downloadable mods, resource packs, shader packs, and other external files. Packwiz creates these when you add projects from Modrinth, CurseForge, GitHub releases, or direct URLs.
- Normal pack files go at the same relative path they should have in a Minecraft instance, for example `config/example.toml`, `defaultconfigs/example.toml`, `kubejs/...`, `mods/...`, `resourcepacks/...`, or `shaderpacks/...`.
- Repository-only files such as docs and Git metadata should not be included in `index.toml`. If a future refresh starts adding repo-only files, add appropriate patterns to `.packwizignore`.

## Basic Workflow

1. Start from a clean branch and check existing changes with `git status --short`.
2. Make changes with packwiz commands where possible.
3. Run `packwiz refresh` after manually adding, editing, moving, or deleting installable pack files.
4. Run `npm run lint`.
5. Review `git diff`, especially `pack.toml`, `index.toml`, and any generated `.pw.toml` files.
6. Test the pack in a launcher or server environment before submitting changes.

Do not run `packwiz init` in this repository unless you intentionally want to recreate the pack manifest. The pack is already initialized.

## Adding Mods and Resource Packs

Prefer Modrinth when a project is available there:

```sh
packwiz modrinth add <slug-or-search>
packwiz mr add <modrinth-project-url>
packwiz mr add --project-id <project-id> --version-id <version-id>
```

Use CurseForge when the project is only available there or the pack intentionally tracks the CurseForge release:

```sh
packwiz curseforge add <slug-or-search>
packwiz cf add <curseforge-project-url>
packwiz cf add --addon-id <addon-id> --file-id <file-id>
```

For CurseForge categories outside normal mods, pass the category:

```sh
packwiz cf add --category texture-packs example-pack
```

Packwiz accepts slugs, URLs, search text, and exact project/version IDs. Search results can be ambiguous, so read prompts carefully. Avoid `-y` for interactive searches unless you are certain the default choice is correct.

When packwiz asks about dependencies, normally accept required dependencies. For optional dependencies, only include them when they are part of the intended pack experience.

## Adding GitHub Release Files

For projects distributed through GitHub releases, use packwiz GitHub support before falling back to a direct URL:

```sh
packwiz github add <repository-url-or-slug>
packwiz gh add <repository-url-or-slug> --regex <asset-name-regex>
packwiz gh add <repository-url-or-slug> --branch <branch-name>
```

Use `--regex` when a release contains multiple assets and packwiz needs help selecting the correct file. Review the generated metadata and confirm the selected artifact matches this pack's Minecraft and loader versions.

## Adding Direct Downloads

Use direct URLs only when a file is not supported through Modrinth, CurseForge, or another packwiz-aware source:

```sh
packwiz url add "Example Mod" "https://example.com/example-mod.jar"
```

Direct URL entries need stable download URLs and hashes. Prefer first-party project pages or releases, and confirm that redistribution is allowed by the file license. Supported providers are better because packwiz can track metadata, dependencies, and updates.

## Adding Configs, Scripts, and Other Internal Files

Place internal files where they should be installed in a Minecraft instance. Examples:

```text
config/some-mod.toml
defaultconfigs/server-common.toml
kubejs/server_scripts/example.js
resourcepacks/example-pack.zip
shaderpacks/example-shader.zip
```

Then refresh the index:

```sh
packwiz refresh
```

`packwiz refresh` recalculates `index.toml` and updates the index hash stored in `pack.toml`. Do not manually update hashes.

`packwiz refresh --build` is only for packs using no-internal-hashes mode when building for packwiz-installer distribution. This pack does not currently need it for normal edits.

## Updating Files

List current managed files:

```sh
packwiz list
packwiz list -v
packwiz list --side client
packwiz list --side server
```

Update one managed external file:

```sh
packwiz update <name>
```

Update every unpinned external file:

```sh
packwiz update --all
```

If a file must stay on a specific version, pin it:

```sh
packwiz pin
```

To allow updates again:

```sh
packwiz unpin
```

After updates, review generated metadata changes and launch-test the pack. Do not batch large updates without testing, because mod updates can change dependencies, config defaults, networking behavior, and server compatibility.

## Removing Files

Use packwiz when removing managed external files:

```sh
packwiz remove
```

The remove command is equivalent to removing the external file metadata and refreshing the index. If you remove files manually, delete the relevant file or `.pw.toml` metadata and run:

```sh
packwiz refresh
```

Confirm the removed file no longer appears in:

```sh
packwiz list -v
```

## Migrating Minecraft or Loader

This pack targets Minecraft 1.21.1. Loader migrations are high-risk and should be their own change.

Use packwiz migration commands instead of hand-editing versions:

```sh
packwiz migrate minecraft <minecraft-version>
packwiz migrate loader <loader-version>
packwiz migrate loader latest
packwiz migrate loader recommended
```

After a migration:

```sh
packwiz update --all
packwiz refresh
packwiz list -v
```

Then test a client launch and, when the pack has server-side content, a server launch. Document any mods that must be removed, pinned, or replaced.

## Acceptable Minecraft Versions

If a mod is compatible with the pack even though its metadata lists a nearby Minecraft version, use packwiz settings instead of bypassing checks casually:

```sh
packwiz settings acceptable-versions
```

Keep this list narrow. It should represent verified compatibility, not a workaround for installing untested mods.

## Serving the Pack Locally

For local packwiz-installer testing, run:

```sh
packwiz serve --port 8080
```

By default, `packwiz serve` refreshes the index when the served pack is queried and exposes the pack at:

```text
http://localhost:8080/pack.toml
```

Use this URL with packwiz-installer or a launcher workflow that supports packwiz packs. Stop the server with `Ctrl-C` when finished.

## Exporting Releases

Export a Modrinth pack:

```sh
packwiz modrinth export -o munduscraft.mrpack
```

Export a CurseForge pack:

```sh
packwiz curseforge export -o munduscraft.zip --side client
```

Modrinth exports support side-only metadata. CurseForge exports use `--side` to choose which side to include, defaulting to client. Generated `.mrpack` and `.zip` files are ignored by Git and should not be committed.

Before uploading an export, check that it does not contain repo-only files, local cache files, previous exports, or binaries that are not redistributable.

## Release Process

Use `npm run release` from a clean working tree when the branch is ready to publish. The release command uses Conventional Commit messages since the latest `v*` tag to choose the version bump. If no release tag exists yet, it uses all commits reachable from `HEAD`.

The release command writes changelog notes, refreshes and formats pack metadata, runs lint checks, creates Modrinth and CurseForge exports, commits and tags the release, pushes with tags, and creates a GitHub release with the generated exports attached.

Release commits are generated by tooling. Do not hand-edit `package.json`, `package-lock.json`, `pack.toml`, `index.toml`, or `CHANGELOG.md` for routine version bumps.

## Installing With Packwiz-Installer

For hosted auto-updating installs, publish the pack source files somewhere reachable by HTTP or HTTPS, then point packwiz-installer at the hosted `pack.toml`.

MultiMC or Prism-style pre-launch command:

```sh
"$INST_JAVA" -jar packwiz-installer-bootstrap.jar https://example.com/munduscraft/pack.toml
```

Server-side install or update:

```sh
java -jar packwiz-installer-bootstrap.jar -g -s server https://example.com/munduscraft/pack.toml
```

The `-g` flag disables the GUI, and `-s server` installs files marked for `server` or `both`.

## Git and Review Expectations

- Keep changes scoped. Separate content changes, version migrations, and broad mod updates when possible.
- Do not commit packwiz cache files, exported packs, launcher instances, or local test worlds.
- Preserve generated packwiz changes when they are caused by your pack edits.
- Be careful with line endings. Hashes are content-sensitive, and Windows line-ending conversion can cause invalid hash errors.
- Include the packwiz commands you ran and the launch testing you performed in the pull request or change notes.

## Commit and Release Tooling

Use `npm run commit` for conventional commit prompts. Commits must include an allowed type and scope.

Use `npm run release` only when the current branch should become a release. The release script reads commits since the latest `v*` tag and chooses the highest required bump:

- `feat:` creates a minor release.
- Any non-`feat:` conventional commit creates a patch release.
- `!` or `BREAKING CHANGE:` creates a major release.

The release updates `package.json` and `pack.toml`, refreshes `index.toml`, updates `CHANGELOG.md`, creates exports, creates a release commit, tags the version, pushes the release, and publishes a GitHub release.

## References

- Official packwiz docs: <https://packwiz.infra.link/>
- Command reference: <https://packwiz.infra.link/reference/commands/packwiz/>
- Adding mods: <https://packwiz.infra.link/tutorials/creating/adding-mods/>
- Packwiz installer: <https://packwiz.infra.link/tutorials/installing/packwiz-installer/>
