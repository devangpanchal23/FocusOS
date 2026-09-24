/**
 * One-time import of the JSON dumps produced by exportSqliteData.ts into a
 * fresh Postgres database. Run this AFTER:
 *   1. schema.prisma's datasource provider is "postgresql" (already true)
 *   2. `DATABASE_URL` points at the target Postgres instance
 *   3. `npx prisma generate` has been re-run (so the client's query engine
 *      actually targets Postgres — the SQLite-era client used by the export
 *      step cannot connect here)
 *   4. `npx prisma migrate deploy` (or `db push` for a from-scratch target)
 *      has created the schema on that Postgres database
 *
 * Usage: npx tsx prisma/scripts/importPostgresData.ts
 *
 * Inserts every model in dependency order computed from the schema's DMMF
 * (parents before children), preserving original IDs/timestamps so
 * relations stay intact. Self-referential foreign keys (e.g.
 * AutomationConditionGroup.parentGroupId) are nulled on first insert and
 * patched in a second pass, since Postgres enforces FK constraints even
 * within a single insert batch and the referenced sibling row may not exist
 * yet in insertion order.
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const dataDir = path.resolve(process.cwd(), 'prisma/data-export');

function modelDelegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

interface RelationInfo {
  fieldName: string; // e.g. "parentGroupId"
  relatedModel: string; // e.g. "AutomationConditionGroup"
  isSelfRelation: boolean;
}

function computeModelGraph() {
  const models = Prisma.dmmf.datamodel.models;
  const relationsByModel = new Map<string, RelationInfo[]>();
  const dependsOn = new Map<string, Set<string>>();

  for (const model of models) {
    dependsOn.set(model.name, new Set());
    relationsByModel.set(model.name, []);
  }

  for (const model of models) {
    for (const field of model.fields) {
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        const relatedModel = field.type;
        const isSelf = relatedModel === model.name;
        relationsByModel.get(model.name)!.push({
          fieldName: field.relationFromFields[0],
          relatedModel,
          isSelfRelation: isSelf,
        });
        if (!isSelf) {
          dependsOn.get(model.name)!.add(relatedModel);
        }
      }
    }
  }

  // Kahn's algorithm topological sort: parents (no unresolved deps) first.
  const order: string[] = [];
  const remaining = new Set(models.map((m) => m.name));
  const deps = new Map(Array.from(dependsOn.entries()).map(([k, v]) => [k, new Set(v)]));

  while (remaining.size > 0) {
    const ready = Array.from(remaining).filter((m) => {
      const d = deps.get(m)!;
      return Array.from(d).every((dep) => !remaining.has(dep));
    });

    if (ready.length === 0) {
      // Circular dependency among non-self relations (shouldn't happen in
      // this schema) — fall back to inserting whatever's left in DMMF order
      // rather than looping forever.
      console.warn('Could not fully resolve dependency order for:', Array.from(remaining));
      order.push(...Array.from(remaining));
      break;
    }

    for (const m of ready) {
      order.push(m);
      remaining.delete(m);
    }
  }

  return { order, relationsByModel };
}

async function main() {
  const manifestPath = path.join(dataDir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No export found at ${dataDir}. Run exportSqliteData.ts first.`);
  }
  const manifest: Record<string, number> = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const { order, relationsByModel } = computeModelGraph();
  const selfRefPatches: { modelName: string; rows: any[] }[] = [];

  for (const modelName of order) {
    const filePath = path.join(dataDir, `${modelName}.json`);
    if (!fs.existsSync(filePath)) continue;

    const rows: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (rows.length === 0) continue;

    const selfRelations = relationsByModel.get(modelName)!.filter((r) => r.isSelfRelation);
    const insertRows = rows.map((row) => {
      if (selfRelations.length === 0) return row;
      const clone = { ...row };
      for (const rel of selfRelations) clone[rel.fieldName] = null;
      return clone;
    });

    const delegateName = modelDelegateName(modelName);
    const delegate = (prisma as any)[delegateName];
    if (!delegate || typeof delegate.createMany !== 'function') {
      console.warn(`Skipping ${modelName}: no createMany delegate found.`);
      continue;
    }

    await delegate.createMany({ data: insertRows, skipDuplicates: true });
    console.log(`Imported ${modelName}: ${insertRows.length} row(s)`);

    if (selfRelations.length > 0) {
      selfRefPatches.push({ modelName, rows });
    }
  }

  // Second pass: patch self-referential FKs now that every sibling row exists.
  for (const { modelName, rows } of selfRefPatches) {
    const delegateName = modelDelegateName(modelName);
    const delegate = (prisma as any)[delegateName];
    const selfRelations = relationsByModel.get(modelName)!.filter((r) => r.isSelfRelation);

    for (const row of rows) {
      const patch: Record<string, any> = {};
      let needsPatch = false;
      for (const rel of selfRelations) {
        if (row[rel.fieldName] != null) {
          patch[rel.fieldName] = row[rel.fieldName];
          needsPatch = true;
        }
      }
      if (needsPatch) {
        await delegate.update({ where: { id: row.id }, data: patch });
      }
    }
    console.log(`Patched self-referential fields on ${modelName}`);
  }

  // Verification: row counts must match the export manifest exactly.
  console.log('\nVerifying row counts against export manifest...');
  let allMatch = true;
  for (const modelName of order) {
    const expected = manifest[modelName] ?? 0;
    if (expected === 0) continue;
    const delegateName = modelDelegateName(modelName);
    const delegate = (prisma as any)[delegateName];
    const actual = await delegate.count();
    const status = actual === expected ? 'OK' : 'MISMATCH';
    if (actual !== expected) allMatch = false;
    console.log(`  ${modelName}: expected ${expected}, got ${actual} [${status}]`);
  }

  if (!allMatch) {
    throw new Error('Row count verification failed — see MISMATCH lines above.');
  }
  console.log('\nAll row counts match. Import verified.');
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
