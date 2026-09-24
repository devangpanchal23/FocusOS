/**
 * One-time export of every table in the real local SQLite dev.db to JSON,
 * ahead of the Postgres migration. Run with the CURRENT (SQLite-era)
 * generated Prisma client still in place — i.e. BEFORE running
 * `prisma generate` against the new postgresql provider — since this script
 * only needs read access via the existing client, and regenerating first
 * would make the client's query engine target Postgres, unable to open the
 * SQLite file at all.
 *
 * Usage: DATABASE_URL="file:./dev.db" npx tsx prisma/scripts/exportSqliteData.ts
 * (the default backend/.env DATABASE_URL already points at dev.db, so
 * `npx tsx prisma/scripts/exportSqliteData.ts` alone is normally enough)
 *
 * Output: backend/prisma/data-export/<ModelName>.json, one file per model,
 * plus a row-count manifest for the verification step after import.
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const outDir = path.resolve(process.cwd(), 'prisma/data-export');

function modelDelegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const models = Prisma.dmmf.datamodel.models;
  const manifest: Record<string, number> = {};

  for (const model of models) {
    const delegateName = modelDelegateName(model.name);
    const delegate = (prisma as any)[delegateName];
    if (!delegate || typeof delegate.findMany !== 'function') {
      console.warn(`Skipping ${model.name}: no queryable delegate found (unexpected).`);
      continue;
    }

    const rows = await delegate.findMany();
    manifest[model.name] = rows.length;
    fs.writeFileSync(path.join(outDir, `${model.name}.json`), JSON.stringify(rows, null, 2));
    console.log(`Exported ${model.name}: ${rows.length} row(s)`);
  }

  fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${Object.values(manifest).reduce((a, b) => a + b, 0)} total rows exported to ${outDir}`);
}

main()
  .catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
