import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(output || `${command} ${args.join(" ")} failed`);
  }
  return result.stdout?.trim() ?? "";
};

const read = (path) => readFileSync(path, "utf8");
const write = (path, data) => writeFileSync(path, data);

const assertCleanTree = () => {
  const status = run("git", ["status", "--porcelain"], { capture: true });
  if (status) {
    throw new Error("Release requires a clean working tree.");
  }
};

const parseCommit = ({ hash, message }) => {
  const header = message.split(/\r?\n/, 1)[0] ?? "";
  const match = header.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/);
  if (!match) {
    throw new Error(`Commit ${hash.slice(0, 7)} is not a Conventional Commit.`);
  }

  const [, type, scope, bang, subject] = match;
  const breaking = Boolean(bang) || /^BREAKING CHANGE:/m.test(message);
  let bump = "patch";
  if (breaking) bump = "major";
  else if (type === "feat") bump = "minor";

  return { hash, type, scope, subject, bump };
};

const latestReleaseTag = () => {
  const result = spawnSync("git", ["describe", "--tags", "--match", "v[0-9]*", "--abbrev=0"], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status === 0) {
    return result.stdout.trim();
  }
  return null;
};

const releaseCommits = (tag) => {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const output = run("git", ["log", "--reverse", "--format=%H%x1f%B%x1e", range], { capture: true });
  if (!output) {
    throw new Error(tag ? `No commits found since ${tag}.` : "No commits found for release.");
  }

  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, message] = record.split("\x1f");
      return parseCommit({ hash, message });
    });
};

const releaseBump = (entries) => {
  if (entries.some(({ bump }) => bump === "major")) return "major";
  if (entries.some(({ bump }) => bump === "minor")) return "minor";
  return "patch";
};

const bumpVersion = (version, bump) => {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  const [major, minor, patch] = parts;
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

const releaseLine = (entry) =>
  `- ${entry.type}${entry.scope ? `(${entry.scope})` : ""}: ${entry.subject} (${entry.hash.slice(0, 7)})`;

const changelogTypes = new Set(["feat", "fix", "refactor", "revert"]);

const updateChangelog = ({ version, entries }) => {
  const path = "CHANGELOG.md";
  const date = new Date().toISOString().slice(0, 10);
  const existing = existsSync(path) ? read(path).trimEnd() : "# Changelog\n";
  const notes = entries.filter(({ type }) => changelogTypes.has(type)).map(releaseLine).join("\n");
  const nextEntry = `## ${version} - ${date}\n\n${notes}\n`;
  const body = existing.replace(/^# Changelog\s*/, "# Changelog\n\n");
  write(path, `${body.trimEnd()}\n\n${nextEntry}\n`);
  return notes;
};

const removeIfExists = (path) => {
  if (existsSync(path)) {
    unlinkSync(path);
  }
};

run("git", ["rev-parse", "--verify", "HEAD"], { capture: true });
assertCleanTree();

const previousTag = latestReleaseTag();
const entries = releaseCommits(previousTag);
const packageJson = JSON.parse(read("package.json"));
const currentVersion = packageJson.version;
const nextVersion = bumpVersion(currentVersion, releaseBump(entries));
const packToml = read("pack.toml");
const packVersionMatch = packToml.match(/^version\s*=\s*"([^"]+)"/m);

if (!packVersionMatch) {
  throw new Error("Could not find pack.toml version.");
}

if (packVersionMatch[1] !== currentVersion) {
  throw new Error(
    `Version mismatch before release: package.json has ${currentVersion}, pack.toml has ${packVersionMatch[1]}.`,
  );
}

packageJson.version = nextVersion;
write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
write("pack.toml", packToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${nextVersion}"`));
const releaseNotes = updateChangelog({ version: nextVersion, entries });
const cfExport = `${packageJson.name}-${nextVersion}-curseforge.zip`;
const mrExport = `${packageJson.name}-${nextVersion}-modrinth.mrpack`;

run("packwiz", ["refresh"]);
run("npm", ["install", "--package-lock-only", "--ignore-scripts"]);
run("prettier", [
  "--write",
  "package.json",
  "package-lock.json",
  "pack.toml",
  "index.toml",
  "CHANGELOG.md",
  "--plugin=prettier-plugin-toml",
]);
run("npm", ["run", "lint"]);

removeIfExists(cfExport);
removeIfExists(mrExport);
run("packwiz", ["cf", "export", "-o", cfExport]);
run("packwiz", ["mr", "export", "-o", mrExport]);

run("git", ["add", "package.json", "package-lock.json", "pack.toml", "index.toml", "CHANGELOG.md"]);
run("git", ["commit", "-m", `chore(release): v${nextVersion}`]);
run("git", ["tag", "-a", `v${nextVersion}`, "-m", `v${nextVersion}`]);
run("git", ["push", "--follow-tags"]);
run("gh", [
  "release",
  "create",
  `v${nextVersion}`,
  `${cfExport}#${cfExport}`,
  `${mrExport}#${mrExport}`,
  "--title",
  `v${nextVersion}`,
  "--notes",
  releaseNotes,
  "--verify-tag",
]);

console.log(`Released v${nextVersion}.`);
