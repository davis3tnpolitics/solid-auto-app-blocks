const fs = require("fs");
const path = require("path");
const { repoRoot } = require("../helpers/workspace");

const manifestsDir = path.join(repoRoot, "automations", "manifests");
const workflowsDir = path.join(repoRoot, "automations", "workflows");

function parseManifests() {
  return fs
    .readdirSync(manifestsDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => {
      const manifestPath = path.join(manifestsDir, entry);
      return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    });
}

function parseWorkflows() {
  return fs
    .readdirSync(workflowsDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => {
      const workflowPath = path.join(workflowsDir, entry);
      const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
      return {
        workflowPath,
        workflow,
      };
    });
}

describe("workflow schema validation", () => {
  it("ensures each workflow has required keys and valid block references", () => {
    const workflows = parseWorkflows();
    const manifests = parseManifests();
    const blockNames = new Set(manifests.map((manifest) => manifest.name));

    expect(workflows.length).toBeGreaterThan(0);

    workflows.forEach(({ workflowPath, workflow }) => {
      expect(typeof workflow.name, `${workflowPath} missing \"name\"`).toBe("string");
      expect(workflow.name.length, `${workflowPath} has empty \"name\"`).toBeGreaterThan(0);
      expect(typeof workflow.description, `${workflowPath} missing \"description\"`).toBe("string");
      expect(Array.isArray(workflow.steps), `${workflowPath} missing \"steps\"`).toBe(true);

      workflow.steps.forEach((step, index) => {
        const label = `${workflowPath} step #${index + 1}`;

        expect(typeof step.block, `${label} missing \"block\"`).toBe("string");
        expect(step.block.length, `${label} has empty \"block\"`).toBeGreaterThan(0);
        expect(blockNames.has(step.block), `${label} references unknown block \"${step.block}\"`).toBe(
          true
        );

        if (step.args !== undefined) {
          expect(Array.isArray(step.args), `${label} has invalid \"args\"`).toBe(true);
        }

        if (step.dependsOn !== undefined) {
          expect(Array.isArray(step.dependsOn), `${label} has invalid \"dependsOn\"`).toBe(true);
        }
      });
    });
  });
});
