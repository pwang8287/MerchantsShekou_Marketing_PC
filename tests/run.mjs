import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'marketing-check-'));
try {
  for (const name of ['organizationContribution', 'channelRanking', 'conversionAttribution', 'metrics', 'nineGrid', 'channels', 'donutTooltip', 'channelFunnel', 'sixForces', 'dealCycle', 'kpiDaily', 'kpiDrilldown', 'kpiApi', 'projectMarketing', 'comparison', 'projectDataTable', 'customerStructure', 'advisorData', 'advisorReceptionMatrix', 'kpiTrend', 'statisticsPeriod', 'efficiencyPeriod', 'cityScope']) {
    const outfile = join(dir, name + '.cjs');
    await build({
      entryPoints: ['tests/' + name + '.test.ts'],
      outfile,
      bundle: true,
      platform: 'node',
      target: 'node16',
      format: 'cjs',
      define:
        ['kpiDrilldown','kpiApi','statisticsPeriod','efficiencyPeriod','cityScope'].includes(name)
          ? { 'import.meta.env': JSON.stringify({ VITE_USE_MOCK: 'true' }) }
          : {},
    });
    const loaded = await import(pathToFileURL(outfile).href);
    const run = loaded.run || loaded.default?.run;
    if (run) await run();
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
