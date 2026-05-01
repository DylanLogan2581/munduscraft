import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const read = (path) => readFileSync(path, "utf8");
const match = (source, pattern, label) => {
  const result = source.match(pattern);
  if (!result) {
    throw new Error(`Could not find ${label}.`);
  }
  return result[1];
};

const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const packToml = read("pack.toml");
const indexToml = read("index.toml");
const packVersion = match(packToml, /^version\s*=\s*"([^"]+)"/m, "pack.toml version");
const indexHash = match(packToml, /^\s*hash\s*=\s*"([^"]+)"/m, "pack.toml index hash");
const actualIndexHash = createHash("sha256").update(indexToml).digest("hex");

if (packageJson.version !== packVersion) {
  throw new Error(
    `Version mismatch: package.json has ${packageJson.version}, pack.toml has ${packVersion}.`,
  );
}

if (
  packageLock.version !== packageJson.version ||
  packageLock.packages?.[""]?.version !== packageJson.version
) {
  throw new Error("Version mismatch: package-lock.json is not synced with package.json.");
}

if (indexHash !== actualIndexHash) {
  throw new Error(
    "Pack index hash is stale. Run `packwiz refresh` and commit pack.toml/index.toml together.",
  );
}

run("prettier", [
  "--check",
  "**/*.{json,toml,ini,md,yml,yaml}",
  "--plugin=prettier-plugin-toml",
  "--plugin=prettier-plugin-ini",
]);
run("markdownlint-cli2", ["**/*.md"]);
