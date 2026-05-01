const types = [
  { value: "feat", name: "feat:     A new feature" },
  { value: "fix", name: "fix:      A bug fix" },
  { value: "docs", name: "docs:     Documentation only changes" },
  { value: "style", name: "style:    Formatting only changes" },
  { value: "refactor", name: "refactor: Code changes that neither fix nor add a feature" },
  { value: "perf", name: "perf:     Performance improvements" },
  { value: "test", name: "test:     Add or update tests" },
  { value: "build", name: "build:    Build system or dependency changes" },
  { value: "ci", name: "ci:       CI configuration changes" },
  { value: "chore", name: "chore:    Repository maintenance" },
  { value: "revert", name: "revert:   Revert a previous commit" },
];

const scopes = [
  "pack",
  "index",
  "mod",
  "config",
  "defaultconfig",
  "resourcepack",
  "shaderpack",
  "datapack",
  "kubejs",
  "docs",
  "tooling",
  "deps",
  "ci",
  "release",
];

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", types.map(({ value }) => value)],
    "scope-enum": [2, "always", scopes],
    "scope-empty": [2, "never"],
  },
  prompt: {
    types,
    scopes,
    allowCustomScopes: false,
    allowEmptyScopes: false,
  },
};
