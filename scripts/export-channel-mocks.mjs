import { build } from 'esbuild';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const dir = await mkdtemp(join(tmpdir(), 'channel-export-'));
try {
  await mkdir('材料', { recursive: true });
  const outfile = join(dir, 'data.cjs');
  await build({
    stdin: {
      contents:
        "export {channelCatalog,channelLeaves} from './src/mocks/channels';export {records,projects} from './src/mocks/data';",
      resolveDir: process.cwd(),
      sourcefile: 'export.ts',
    },
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node16',
    format: 'cjs',
  });
  const { channelCatalog, channelLeaves, records, projects } = createRequire(import.meta.url)(
    outfile,
  );
  await writeFile(
    '材料/营销渠道层级字典.json',
    JSON.stringify(
      {
        source: '公开资料参考下的演示分类；非真实合作关系',
        researchDate: '2026-10-27',
        sourceNotes: '营销渠道分层与模拟数据说明.md',
        counts: {
          categories: channelCatalog.length,
          objects: channelCatalog.reduce((a, c) => a + c.objects.length, 0),
          touchpoints: channelLeaves.length,
        },
        categories: channelCatalog,
      },
      null,
      2,
    ) + '\n',
  );
  const data = records.filter(
    (r) => r.project === projects[0].name && ['2025-09', '2026-09'].includes(r.period),
  );
  await writeFile(
    '材料/营销渠道模拟数据样例.json',
    JSON.stringify(
      {
        source: '确定性模拟数据，非真实经营数据',
        fullDatasetRecordCount: records.length,
        sampleRecordCount: data.length,
        project: projects[0].name,
        periods: ['2025-09', '2026-09'],
        grain: '月份 × 项目 × 渠道末级 × 客户类型',
        units: {
          amount: '万元',
          fee: '万元',
          leads: '组',
          visits: '组',
          subscriptions: '组',
          contracts: '套',
        },
        data,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`已导出渠道字典及 ${data.length} 条同比样例，完整应用数据 ${records.length} 条。`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
