const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SECRET_KEY=(.*)/)?.[1]?.trim();
const customerId = env.match(/GOOGLE_ADS_CUSTOMER_ID=(.*)/)?.[1]?.trim();
const creds = JSON.parse(fs.readFileSync('secrets/google-credentials.json', 'utf8'));

const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/adwords',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(claimSet)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(creds.private_key, 'base64url');
  const jwt = `${unsignedToken}.${signature}`;

  const resToken = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  const token = (await resToken.json()).access_token;

  const months = [
    { m: '2026-09', since: '2026-09-01', until: '2026-09-30' },
    { m: '2026-10', since: '2026-10-01', until: new Date().toISOString().slice(0, 10) }
  ];

  for (const { m, since, until } of months) {
    console.log(`\nSincronizando ${m}...`);
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date >= '${since}' AND segments.date <= '${until}'
    `;

    const res = await fetch(`https://googleads.googleapis.com/v25/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    const rows = data.results || [];

    // Limpiar métricas anteriores de google_ads para este mes
    await sb.from('campaign_metrics')
      .delete()
      .eq('project_id', 'pekin')
      .eq('provider', 'google_ads')
      .eq('month', m);

    let count = 0;
    for (const r of rows) {
      const c = r.campaign;
      const met = r.metrics;
      const spend = Number(met?.costMicros || 0) / 1000000;
      const conv = Number(met?.conversions || 0);
      const impr = Number(met?.impressions || 0);
      const clicks = Number(met?.clicks || 0);

      // Solo guardar campañas con actividad en el período
      if (spend === 0 && conv === 0 && impr === 0 && clicks === 0) continue;

      const upper = (c.name || '').toUpperCase();
      if (!upper.includes('PEKIN') && !upper.includes('PMAX')) continue;

      const { data: dbCamp } = await sb.from('campaigns').upsert({
        project_id: 'pekin',
        provider: 'google_ads',
        external_id: c.id,
        name: c.name,
        status: c.status || 'ACTIVE',
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id,provider,external_id' }).select('id').single();

      if (!dbCamp) continue;

      await sb.from('campaign_metrics').insert({
        campaign_id: dbCamp.id,
        project_id: 'pekin',
        provider: 'google_ads',
        month: m,
        date: until,
        spend,
        impressions: impr,
        clicks,
        leads: Math.round(conv),
        conversions: Math.round(conv),
        raw_data: {
          channelType: c.advertisingChannelType,
          conversions: conv
        }
      });
      console.log(`Guardado: ${c.name} (spend: $${spend.toLocaleString('es-CO')}, conv: ${conv})`);
      count++;
    }
    console.log(`Total campañas guardadas para ${m}: ${count}`);
  }

  console.log('\nSincronización completada con éxito.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
