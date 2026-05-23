/**
 * Local end-to-end test for the CJ sync pipeline.
 *
 * Runs all three CJ jobs (commissions, advertisers, links) sequentially against
 * the local DB. Prints a summary so you can verify the integration works before
 * deploying. Requires CJ_PERSONAL_ACCESS_TOKEN and CJ_PUBLISHER_ID in .env.
 *
 *   npx tsx scripts/test-cj-sync.ts
 */
import 'dotenv/config';
import { initDatabase, dbAll } from '../src/database';
import { runJob, JOB_NAMES } from '../src/jobs';

const sep = (label: string) =>
  console.log(`\n────── ${label} ──────────────────────────────────────────`);

async function main() {
  if (!process.env.CJ_PERSONAL_ACCESS_TOKEN || !process.env.CJ_PUBLISHER_ID) {
    console.error('✗ CJ_PERSONAL_ACCESS_TOKEN and CJ_PUBLISHER_ID must be set in backend/.env');
    process.exit(1);
  }

  sep('Initializing DB (runs migrations)');
  await initDatabase();
  console.log('✓ DB ready');

  sep('Job 1: cj-sync (publisher commissions, last 7 days)');
  const commResult = await runJob(JOB_NAMES.CJ_SYNC, { lookbackDays: 7 });
  console.log(JSON.stringify(commResult, null, 2));

  sep('Job 2: cj-advertiser-sync (joined advertisers)');
  const advResult = await runJob(JOB_NAMES.CJ_ADVERTISER_SYNC, {});
  console.log(JSON.stringify(advResult, null, 2));

  sep('Job 3: cj-link-refresh (deep links for linked merchants)');
  const linkResult = await runJob(JOB_NAMES.CJ_LINK_REFRESH, {});
  console.log(JSON.stringify(linkResult, null, 2));

  sep('Local DB state after sync');
  const cjCommissions = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM cj_commissions'
  );
  const linkedMerchants = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM merchants WHERE cj_advertiser_id IS NOT NULL'
  );
  const enrichedMerchants = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM merchants WHERE cj_max_commission_rate IS NOT NULL'
  );
  console.log('cj_commissions rows:        ', cjCommissions[0]?.count ?? 0);
  console.log('merchants CJ-linked:        ', linkedMerchants[0]?.count ?? 0);
  console.log('merchants with CJ rate:     ', enrichedMerchants[0]?.count ?? 0);

  // Show unmatched advertisers from the most recent advertiser sync — these
  // are advertiser IDs CJ knows about but no local merchant has linked yet.
  if (Array.isArray(advResult.data?.unmatched) && advResult.data.unmatched.length > 0) {
    const unmatched = advResult.data.unmatched as string[];
    console.log(`\nUnmatched CJ advertiser IDs (${unmatched.length}):`);
    console.log('  ' + unmatched.slice(0, 20).join(', ') + (unmatched.length > 20 ? ' …' : ''));
    console.log('To enrich one of these, run:');
    console.log(`  UPDATE merchants SET cj_advertiser_id = '<one of the IDs above>' WHERE id = <some merchant id>;`);
  }

  console.log('\n✓ Done. Inspect the output above for errors.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Test run failed:', err);
  process.exit(1);
});
