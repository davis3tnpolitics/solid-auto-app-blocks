import { randomUUID } from "node:crypto";

import { Prisma, PrismaClient } from "../client/prisma/client";
import * as generatedStubs from "../stubs/data";

type SeedOptions = {
  countPerModel: number;
  models: string[] | null;
  truncate: boolean;
  dryRun: boolean;
};

type RuntimeScalarField = {
  name: string;
  kind: "scalar";
  type: string;
  isList: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  isReadOnly: boolean;
  hasDefaultValue: boolean;
  isGenerated: boolean;
  isUpdatedAt: boolean;
};

type RuntimeRelationField = {
  name: string;
  kind: "object";
  type: string;
  isList: boolean;
  isRequired: boolean;
  relationFromFields?: string[];
  relationToFields?: string[];
};

type RuntimeModel = {
  fields: Array<RuntimeScalarField | RuntimeRelationField>;
};

type CreatedStore = Map<string, Array<Record<string, unknown>>>;
type UniqueStore = Map<string, Map<string, Set<string>>>;

function parseFlags(argv: string[]): SeedOptions {
  const defaults: SeedOptions = {
    countPerModel: 25,
    models: null,
    truncate: false,
    dryRun: false,
  };

  const args = { ...defaults };
  const tokens = argv.slice(2);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) continue;

    const [rawKey, rawInlineValue] = token.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_full, char: string) => char.toUpperCase());

    let rawValue = rawInlineValue;
    if (rawValue === undefined && tokens[index + 1] && !tokens[index + 1].startsWith("--")) {
      rawValue = tokens[index + 1];
      index += 1;
    }

    const value =
      rawValue === undefined
        ? true
        : rawValue === "true"
          ? true
          : rawValue === "false"
            ? false
            : Number.isNaN(Number(rawValue)) || String(rawValue).trim() === ""
              ? rawValue
              : Number(rawValue);

    if (key === "count" || key === "countPerModel") {
      const nextCount = Number(value);
      if (!Number.isFinite(nextCount) || nextCount <= 0) {
        throw new Error('Invalid "--count" value. Use a positive number.');
      }
      args.countPerModel = Math.floor(nextCount);
      continue;
    }

    if (key === "models" || key === "model") {
      const parsed = String(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      args.models = parsed.length ? parsed.map(toPascalCase) : null;
      continue;
    }

    if (key === "truncate") {
      args.truncate = Boolean(value);
      continue;
    }

    if (key === "dryRun") {
      args.dryRun = Boolean(value);
      continue;
    }
  }

  return args;
}

function toCamelCase(value: string): string {
  return value
    .replace(/[-_\s]+(.)?/g, (_full, char: string) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function toPascalCase(value: string): string {
  const camel = toCamelCase(String(value));
  return camel ? camel[0].toUpperCase() + camel.slice(1) : "";
}

function asRuntimeModels(prisma: PrismaClient): Record<string, RuntimeModel> {
  return (prisma as PrismaClient & { _runtimeDataModel: { models: Record<string, RuntimeModel> } })
    ._runtimeDataModel.models;
}

function getRelationDependencies(model: RuntimeModel): string[] {
  return model.fields
    .filter(
      (field): field is RuntimeRelationField =>
        field.kind === "object" && Boolean(field.relationFromFields?.length)
    )
    .map((field) => field.type)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function topologicalSort(modelNames: string[], models: Record<string, RuntimeModel>): string[] {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();

  modelNames.forEach((modelName) => {
    incoming.set(modelName, new Set());
    outgoing.set(modelName, new Set());
  });

  modelNames.forEach((modelName) => {
    const dependencies = getRelationDependencies(models[modelName] || { fields: [] });
    dependencies.forEach((dependencyName) => {
      if (!incoming.has(dependencyName)) return;
      incoming.get(modelName)?.add(dependencyName);
      outgoing.get(dependencyName)?.add(modelName);
    });
  });

  const queue = modelNames.filter((name) => (incoming.get(name)?.size || 0) === 0);
  const ordered: string[] = [];

  while (queue.length) {
    const next = queue.shift();
    if (!next) continue;
    ordered.push(next);

    (outgoing.get(next) || new Set()).forEach((neighbor) => {
      const incomingSet = incoming.get(neighbor);
      if (!incomingSet) return;
      incomingSet.delete(next);
      if (incomingSet.size === 0) {
        queue.push(neighbor);
      }
    });
  }

  if (ordered.length === modelNames.length) {
    return ordered;
  }

  const unresolved = modelNames.filter((name) => !ordered.includes(name));
  return [...ordered, ...unresolved];
}

function getModelDelegate(prisma: PrismaClient, modelName: string): {
  create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  deleteMany: () => Promise<{ count: number }>;
} | null {
  const delegateName = toCamelCase(modelName);
  const delegate = (prisma as Record<string, unknown>)[delegateName];

  if (
    !delegate ||
    typeof (delegate as { create?: unknown }).create !== "function" ||
    typeof (delegate as { deleteMany?: unknown }).deleteMany !== "function"
  ) {
    return null;
  }

  return delegate as {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    deleteMany: () => Promise<{ count: number }>;
  };
}

function getStubFactory(modelName: string):
  | (() => Record<string, unknown>)
  | null {
  const fullFactory = (generatedStubs as Record<string, unknown>)[`fake${modelName}Complete`];
  if (typeof fullFactory === "function") {
    return fullFactory as () => Record<string, unknown>;
  }

  const partialFactory = (generatedStubs as Record<string, unknown>)[`fake${modelName}`];
  if (typeof partialFactory === "function") {
    return partialFactory as () => Record<string, unknown>;
  }

  return null;
}

function chooseRelatedRecord(
  created: CreatedStore,
  targetModelName: string,
  index: number
): Record<string, unknown> | null {
  const records = created.get(targetModelName);
  if (!records?.length) return null;
  return records[index % records.length] || null;
}

function applyRelationFields(
  data: Record<string, unknown>,
  model: RuntimeModel,
  created: CreatedStore,
  index: number
): { ok: boolean; reason?: string } {
  const relationFields = model.fields.filter(
    (field): field is RuntimeRelationField =>
      field.kind === "object" && Boolean(field.relationFromFields?.length)
  );

  for (const relation of relationFields) {
    const fromFields = relation.relationFromFields || [];
    const toFields = relation.relationToFields || [];

    if (!fromFields.length || !toFields.length) continue;

    const relatedRecord = chooseRelatedRecord(created, relation.type, index);

    if (!relatedRecord) {
      if (relation.isRequired) {
        return {
          ok: false,
          reason: `Missing required related records for ${relation.type}.`,
        };
      }
      continue;
    }

    fromFields.forEach((fromField, relationIndex) => {
      if (data[fromField] !== undefined) return;
      const toField = toFields[relationIndex];
      if (!toField) return;
      data[fromField] = relatedRecord[toField];
    });
  }

  return { ok: true };
}

function getScalarFallback(
  modelName: string,
  field: RuntimeScalarField,
  index: number
): unknown {
  const salt = `${index + 1}_${randomUUID().slice(0, 8)}`;
  const lowerFieldName = field.name.toLowerCase();

  if (field.type === "String") {
    if (lowerFieldName.includes("email")) return `${modelName.toLowerCase()}_${salt}@example.com`;
    if (lowerFieldName.includes("url") || lowerFieldName.includes("image")) {
      return `https://example.com/${modelName.toLowerCase()}/${field.name}/${salt}`;
    }
    if (lowerFieldName.includes("token")) return `token_${modelName.toLowerCase()}_${salt}`;
    if (lowerFieldName.includes("name")) return `${modelName} ${index + 1}`;
    return `${modelName.toLowerCase()}_${field.name}_${salt}`;
  }

  if (field.type === "Int") return index + 1;
  if (field.type === "BigInt") return BigInt(index + 1);
  if (field.type === "Float") return Number(((index + 1) * 1.11).toFixed(2));
  if (field.type === "Decimal") return new Prisma.Decimal(((index + 1) * 1.11).toFixed(2));
  if (field.type === "Boolean") return index % 2 === 0;
  if (field.type === "DateTime") return new Date(Date.now() - index * 86_400_000);
  if (field.type === "Json") return { model: modelName, field: field.name, index: index + 1 };
  if (field.type === "Bytes") return Buffer.from(`${modelName}_${field.name}_${salt}`);

  if (field.type === "Unsupported") return null;

  return null;
}

function buildDataForRecord(options: {
  modelName: string;
  model: RuntimeModel;
  baseData: Record<string, unknown>;
  index: number;
  created: CreatedStore;
  uniqueStore: UniqueStore;
}): { ok: boolean; data?: Record<string, unknown>; reason?: string } {
  const { modelName, model, baseData, index, created, uniqueStore } = options;
  const data: Record<string, unknown> = { ...baseData };

  const relationResolution = applyRelationFields(data, model, created, index);
  if (!relationResolution.ok) return relationResolution;

  const scalarFields = model.fields.filter(
    (field): field is RuntimeScalarField => field.kind === "scalar"
  );

  scalarFields.forEach((field) => {
    if (field.isReadOnly || field.isGenerated || field.isUpdatedAt) return;
    if (field.isList) {
      if (data[field.name] === undefined) data[field.name] = [];
      return;
    }

    if (data[field.name] !== undefined) return;
    if (!field.isRequired) return;
    if (field.hasDefaultValue) return;

    data[field.name] = getScalarFallback(modelName, field, index);
  });

  const modelUniqueStore =
    uniqueStore.get(modelName) || new Map<string, Set<string>>();
  uniqueStore.set(modelName, modelUniqueStore);

  scalarFields
    .filter((field) => field.isUnique && !field.isList)
    .forEach((field) => {
      if (data[field.name] === undefined || data[field.name] === null) return;
      const fieldStore = modelUniqueStore.get(field.name) || new Set<string>();
      modelUniqueStore.set(field.name, fieldStore);

      let nextValue = data[field.name];
      let normalized = String(nextValue);

      if (!fieldStore.has(normalized)) {
        fieldStore.add(normalized);
        data[field.name] = nextValue;
        return;
      }

      if (field.type === "Int" || field.type === "Float") {
        let numeric =
          typeof nextValue === "number" && Number.isFinite(nextValue)
            ? nextValue
            : index + 1;
        while (fieldStore.has(String(numeric))) {
          numeric += 1;
        }
        normalized = String(numeric);
        nextValue = numeric;
      } else {
        let suffix = index + 2;
        let candidate = `${String(nextValue)}_${suffix}`;
        while (fieldStore.has(candidate)) {
          suffix += 1;
          candidate = `${String(nextValue)}_${suffix}`;
        }
        normalized = candidate;
        nextValue = candidate;
      }

      fieldStore.add(normalized);
      data[field.name] = nextValue;
    });

  return { ok: true, data };
}

async function run() {
  const options = parseFlags(process.argv);
  const prisma = new PrismaClient();

  try {
    const runtimeModels = asRuntimeModels(prisma);
    const allModelNames = Object.keys(runtimeModels).sort((left, right) =>
      left.localeCompare(right)
    );

    const selectedModels =
      options.models && options.models.length
        ? options.models.filter((modelName) => runtimeModels[modelName])
        : allModelNames;

    if (!selectedModels.length) {
      throw new Error("No valid models selected for seeding.");
    }

    const orderedModels = topologicalSort(selectedModels, runtimeModels);
    const createdByModel: CreatedStore = new Map();
    const uniqueStore: UniqueStore = new Map();

    console.log(
      `[db:seed:fake] Models: ${orderedModels.join(", ")} | count/model: ${options.countPerModel} | truncate: ${options.truncate} | dry-run: ${options.dryRun}`
    );

    if (options.truncate && !options.dryRun) {
      for (const modelName of [...orderedModels].reverse()) {
        const delegate = getModelDelegate(prisma, modelName);
        if (!delegate) continue;
        await delegate.deleteMany();
      }
      console.log("[db:seed:fake] Existing rows removed for selected models.");
    }

    for (const modelName of orderedModels) {
      const model = runtimeModels[modelName];
      const delegate = getModelDelegate(prisma, modelName);
      if (!delegate) {
        console.warn(`[db:seed:fake] Skipping ${modelName}: no Prisma delegate found.`);
        continue;
      }

      const factory = getStubFactory(modelName);
      const inserted: Array<Record<string, unknown>> = [];
      let skipped = 0;

      for (let index = 0; index < options.countPerModel; index += 1) {
        const baseData =
          typeof factory === "function"
            ? (factory() as Record<string, unknown>)
            : {};

        const built = buildDataForRecord({
          modelName,
          model,
          baseData,
          index,
          created: createdByModel,
          uniqueStore,
        });

        if (!built.ok || !built.data) {
          skipped += 1;
          continue;
        }

        if (options.dryRun) {
          inserted.push(built.data);
          continue;
        }

        try {
          const created = await delegate.create({ data: built.data });
          inserted.push(created);
        } catch (error) {
          skipped += 1;
          console.warn(
            `[db:seed:fake] ${modelName} create failed at row ${
              index + 1
            }: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      createdByModel.set(modelName, inserted);
      console.log(
        `[db:seed:fake] ${modelName}: ${inserted.length} ${
          options.dryRun ? "prepared" : "inserted"
        }${skipped ? ` (${skipped} skipped)` : ""}`
      );
    }

    console.log(
      `[db:seed:fake] Done (${options.dryRun ? "dry-run" : "database seeded"}).`
    );
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(`[db:seed:fake] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
