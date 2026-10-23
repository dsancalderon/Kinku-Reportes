// Corte transcrito de las dos gráficas de HubSpot compartidas por el usuario.
// Ambas representan los mismos contactos con dimensiones distintas.
export const pekinHubspotOctober = {
  projectId: 'pekin',
  month: '2026-10',
  owner: 'Sofía Prias',
  from: '2026-10-01',
  through: '2026-10-23',
  totalContacts: 100,
  lifecycle: [
    { label: 'Lead calificado por marketing', count: 56, color: '#c74192' },
    { label: 'Lead', count: 37, color: '#86c9d4' },
    { label: 'Lead calificado por ventas', count: 5, color: '#f18fbf' },
    { label: 'Cliente', count: 2, color: '#00656a' },
  ],
  contactStatus: [
    { label: 'No útil', count: 41 },
    { label: 'Marcar de nuevo', count: 24 },
    { label: 'Seguimiento', count: 22 },
    { label: 'Lead Caliente', count: 10 },
    { label: 'Cita efectiva', count: 2 },
    { label: 'Cita Programada', count: 1 },
  ],
} as const;
