# AGENTS.md

Automation guidance for this packwiz repo.

- Work from repo root. Read `pack.toml` before pack edits.
- Target Minecraft `1.21.1`; read the current loader version from `pack.toml`.
- Do not use `README.md` or `CONTRIBUTING.md` for agent context unless the user asks; they are human docs.
- Use packwiz for external pack content:
  - inspect: `packwiz --help`, `packwiz list -v`
  - Modrinth: `packwiz mr add <slug-or-url>`
  - CurseForge: `packwiz cf add <slug-or-url>`
  - GitHub releases: `packwiz gh add <repo-or-url>`
  - direct URL fallback: `packwiz url add "<name>" "<url>"`
  - update/remove/pin: `packwiz update`, `packwiz remove`, `packwiz pin`
- Put internal pack files at install paths such as `config/...`, `defaultconfigs/...`, `kubejs/...`, `resourcepacks/...`, or `shaderpacks/...`.
- Run `packwiz refresh` after installable pack content changes. Do not refresh for docs/tooling-only changes unless validating hooks.
- Do not run `packwiz init` or broad migrations unless explicitly asked.
- Never commit `.packwiz/`, `.mrpack`, `.zip`, launcher instances, or worlds.
- Run `npm run lint` before final response when tooling/docs/pack metadata changes.
- Before final response, check `git diff`/`git status` and report commands run.
