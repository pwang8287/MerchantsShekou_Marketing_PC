import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'marketing-check-'));
try {
  for (const name of ['metrics', 'nineGrid', 'channels', 'donutTooltip', 'channelFunnel', 'sixForces', 'dealCycle', 'kpiDrilldown']) {
    const outfile = join(dir, name + '.cjs');
    await build({
      entryPoints: ['tests/' + name + '.test.ts'],
      outfile,
      bundle: true,
      platform: 'node',
      target: 'node16',
      format: 'cjs',
      define:
        name === 'kpiDrilldown'
          ? { 'import.meta.env': JSON.stringify({ VITE_USE_MOCK: 'true' }) }
          : {},
    });
    await import(pathToFileURL(outfile).href);
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
