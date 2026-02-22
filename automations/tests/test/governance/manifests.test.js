const fs = require("fs");
const path = require("path");
const { repoRoot } = require("../helpers/workspace");

const manifestsDir = path.join(repoRoot, "automations", "manifests");

function parseManifestFiles() {
  return fs
    .readdirSync(manifestsDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => {
      const manifestPath = path.join(manifestsDir, entry);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      return {
        fileName: entry.replace(/\.json$/, ""),
        manifestPath,
        manifest,
      };
    });
}

describe("manifest schema validation", () => {
  it("ensures each manifest has required keys and valid entry paths", () => {
    const manifests = parseManifestFiles();
    expect(manifests.length).toBeGreaterThan(0);

    manifests.forEach(({ manifestPath, manifest }) => {
      expect(typeof manifest.name, `${manifestPath} missing \"name\"`).toBe("string");
      expect(manifest.name.length, `${manifestPath} has empty \"name\"`).toBeGreaterThan(0);

      expect(typeof manifest.description, `${manifestPath} missing \"description\"`).toBe(
        "string"
      );
      expect(typeof manifest.entry, `${manifestPath} missing \"entry\"`).toBe("string");
      expect(Array.isArray(manifest.options), `${manifestPath} missing \"options\"`).toBe(true);
      expect(Array.isArray(manifest.outputs), `${manifestPath} missing \"outputs\"`).toBe(true);

      const [runtime, scriptPath] = manifest.entry.split(/\s+/, 2);
      expect(runtime, `${manifestPath} entry must use node`).toBe("node");
      expect(Boolean(scriptPath), `${manifestPath} missing entry script path`).toBe(true);

      const absoluteScriptPath = path.join(repoRoot, scriptPath);
      expect(fs.existsSync(absoluteScriptPath), `${manifestPath} entry file does not exist`).toBe(
        true
      );
    });
  });

  it("keeps manifest filenames aligned with manifest names", () => {
    const manifests = parseManifestFiles();

    manifests.forEach(({ fileName, manifest, manifestPath }) => {
      expect(manifest.name, `${manifestPath} name should match filename`).toBe(fileName);
    });
  });

  it("keeps manifest names unique", () => {
    const manifests = parseManifestFiles();
    const names = manifests.map((entry) => entry.manifest.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
