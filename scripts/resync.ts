import { syncMetaForProject } from '../server/integrations/meta.js';
import { getOverviewData } from '../server/overview.js';
import { getSupabase } from '../server/db/supabase.js';

async function main() {
  const sb = getSupabase();
  if (!sb) {
    console.error('No Supabase connection');
    process.exit(1);
  }

  console.log('1. Limpiando métricas antiguas en Supabase...');
  const { error: delErr } = await sb.from('campaign_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) console.error('Error limpiando:', delErr);
  else console.log('Métricas anteriores limpiadas exitosamente.');

  console.log('2. Sincronizando Pekín (septiembre y octubre)...');
  const pekinSync = await syncMetaForProject('pekin', ['2026-09', '2026-10']);
  console.log('Pekín sincronizado:', pekinSync);

  console.log('3. Sincronizando Metriku (septiembre y octubre)...');
  const metrikuSync = await syncMetaForProject('metriku', ['2026-09', '2026-10']);
  console.log('Metriku sincronizado:', metrikuSync);

  console.log('4. Sincronizando Skala (septiembre y octubre)...');
  const skalaSync = await syncMetaForProject('skala', ['2026-09', '2026-10']);
  console.log('Skala sincronizado:', skalaSync);

  console.log('\n========================================');
  console.log('RESULTADO FINAL: PEKÍN SEPTIEMBRE 2026');
  console.log('========================================');
  const sep = await getOverviewData('pekin', '2026-09');
  console.log('Campañas activas en Sep:', sep.campaigns.map(c => ({ name: c.campaignName, spend: c.spend, leads: c.platformConversions })));
  console.log('\nReporte Reconocimiento (Sep):', JSON.stringify(sep.reports.awareness, null, 2));
  console.log('\nReporte Clientes Potenciales (Sep):', JSON.stringify(sep.reports.leads, null, 2));

  console.log('\n========================================');
  console.log('RESULTADO FINAL: PEKÍN OCTUBRE 2026');
  console.log('========================================');
  const oct = await getOverviewData('pekin', '2026-10');
  console.log('Campañas activas en Oct:', oct.campaigns.map(c => ({ name: c.campaignName, spend: c.spend, leads: c.platformConversions })));
  console.log('\nReporte Reconocimiento (Oct):', JSON.stringify(oct.reports.awareness, null, 2));
  console.log('\nReporte Clientes Potenciales (Oct):', JSON.stringify(oct.reports.leads, null, 2));
}

main().catch(console.error);
