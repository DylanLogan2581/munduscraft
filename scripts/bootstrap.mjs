import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const usage = `Usage:
  npm run bootstrap -- "My Modpack Name" [--author "Your Name"] [--slug my-modpack]

Updates existing references in package metadata, packwiz metadata, docs, export
examples, and the license notice. The slug is derived from the modpack name when
omitted.`;

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const read = (path) => readFileSync(path, "utf8");
const write = (path, data) => writeFileSync(path, data);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const replaceAll = (source, from, to) => source.replace(new RegExp(escapeRegExp(from), "g"), to);

const toSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseArgs = (args) => {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage);
    process.exit(0);
  }

  let name = null;
  let slug = null;
  let author = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--slug") {
      slug = args[index + 1];
      if (!slug || slug.startsWith("--")) {
        throw new Error("Missing value for --slug.");
      }
      index += 1;
    } else if (arg === "--author") {
      author = args[index + 1];
      if (!author || author.startsWith("--")) {
        throw new Error("Missing value for --author.");
      }
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!name) {
      name = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!name) {
    throw new Error(`Missing modpack name.\n\n${usage}`);
  }

  const title = name.trim();
  const normalizedSlug = (slug ? toSlug(slug) : toSlug(title)).trim();
  if (!title || !normalizedSlug) {
    throw new Error("Modpack name must contain at least one letter or number.");
  }

  return {
    title,
    slug: normalizedSlug,
    author: author?.trim() || "Modpack Maintainers",
  };
};

const updateJson = (path, transform) => {
  const data = JSON.parse(read(path));
  transform(data);
  write(path, `${JSON.stringify(data, null, 2)}\n`);
};

const replaceTemplateText = (path, replacements) => {
  let source = read(path);
  for (const [from, to] of replacements) {
    source = replaceAll(source, from, to);
  }
  write(path, source);
};

const removeTemplateOnlyReadmeText = () => {
  const path = "README.md";
  const source = read(path)
    .replace(/\nnpm run bootstrap -- "My Modpack Name" --author "Your Name"\n/g, "\n")
    .replace(
      /\nRun `npm run bootstrap` once after creating a repository from this template\.[\s\S]*?packwiz index state for the new modpack name\.\n/g,
      "\n",
    );
  write(path, source);
};

const { title, slug, author } = parseArgs(process.argv.slice(2));
const packageJson = JSON.parse(read("package.json"));
const readme = read("README.md");
const currentTitle = readme.match(/^# (.+)$/m)?.[1] ?? packageJson.name;
const currentDescription = readme.match(/^(.+? It targets Minecraft 1\.21\.1;.*)$/m)?.[1];
const currentSlug = packageJson.name;
const currentAuthor = packageJson.author;
const description = `${title} is a packwiz-managed Minecraft modpack.`;
const descriptionLine = `${description} It targets Minecraft 1.21.1; the current loader version is defined in \`pack.toml\`.`;
const replacements = [
  [currentSlug, slug],
  [currentTitle, title],
  [currentAuthor, author],
];

updateJson("package.json", (data) => {
  data.name = slug;
  data.description = `${description} It targets Minecraft 1.21.1`;
  data.author = author;
});

replaceTemplateText("pack.toml", replacements);
replaceTemplateText("README.md", replacements);
replaceTemplateText("CONTRIBUTING.md", replacements);
replaceTemplateText("LICENSE", replacements);

if (currentDescription) {
  replaceTemplateText("README.md", [[currentDescription, descriptionLine]]);
}

removeTemplateOnlyReadmeText();
run("npm", ["install", "--package-lock-only", "--ignore-scripts"]);
run("packwiz", ["refresh"]);
run("prettier", [
  "--write",
  "package.json",
  "package-lock.json",
  "pack.toml",
  "index.toml",
  "README.md",
  "CONTRIBUTING.md",
  "--plugin=prettier-plugin-toml",
]);
run("npm", ["run", "lint"]);

console.log(`Bootstrapped ${title} (${slug}).`);
