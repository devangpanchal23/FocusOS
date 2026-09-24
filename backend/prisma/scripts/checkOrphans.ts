/**
 * Exhaustive foreign-key integrity check across every model in the schema,
 * computed generically from Prisma's DMMF rather than a hand-maintained
 * table list (so it never silently misses a model as the schema grows).
 *
 * Exists because SQLite doesn't enforce FK constraints for raw `sqlite3` CLI
 * writes (only Prisma Client connections turn PRAGMA foreign_keys on) — any
 * admin cleanup done via raw SQL instead of the generated client can leave
 * orphaned rows behind. Run this after any manual/raw-SQL database surgery,
 * or periodically as a health check.
 *
 * Usage: npx tsx prisma/scripts/checkOrphans.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = Prisma.dmmf.datamodel.models;
  let totalOrphans = 0;

  for (const model of models) {
    const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    const delegate = (prisma as any)[delegateName];
    if (!delegate) continue;

    for (const field of model.fields) {
      if (!field.relationFromFields || field.relationFromFields.length === 0) continue;
      const fkField = field.relationFromFields[0];
      const relatedModel = field.type;
      if (relatedModel === model.name) continue; // self-relations aren't checked here

      const relatedDelegateName = relatedModel.charAt(0).toLowerCase() + relatedModel.slice(1);
      const relatedDelegate = (prisma as any)[relatedDelegateName];
      if (!relatedDelegate) continue;

      const rows = await delegate.findMany({ select: { id: true, [fkField]: true } });
      const validIds = new Set((await relatedDelegate.findMany({ select: { id: true } })).map((r: any) => r.id));

      const orphans = rows.filter((r: any) => r[fkField] != null && !validIds.has(r[fkField]));

      if (orphans.length > 0) {
        console.log(
          `ORPHANS: ${model.name}.${fkField} -> ${relatedModel}: ${orphans.length} row(s) [${field.isRequired ? 'REQUIRED' : 'optional'}]`
        );
        console.log('  ids:', orphans.map((o: any) => o.id).join(', '));
        totalOrphans += orphans.length;
      }
    }
  }

  console.log(`\nTotal orphaned FK references found: ${totalOrphans}`);
  if (totalOrphans > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('Orphan check failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
