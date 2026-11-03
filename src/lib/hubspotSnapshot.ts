// Corte transcrito de las dos gráficas de HubSpot compartidas por el usuario.
// Ambas representan los mismos contactos con dimensiones distintas.
export const pekinHubspotOctober = {
  projectId: 'pekin',
  month: '2026-10',
  owner: 'Sofía Prias',
  from: '2026-10-01',
  through: '2026-10-31',
  totalContacts: 121,
  lifecycle: [
    { label: 'Lead calificado por marketing', count: 68, color: '#c74192' },
    { label: 'Lead', count: 34, color: '#86c9d4' },
    { label: 'Lead calificado por ventas', count: 11, color: '#f18fbf' },
    { label: 'Cliente', count: 8, color: '#00656a' },
  ],
  contactStatus: [
    { label: 'No útil', count: 57 },
    { label: 'Marcar de nuevo', count: 22 },
    { label: 'Seguimiento', count: 17 },
    { label: 'Lead Caliente', count: 15 },
    { label: 'Cita Programada', count: 7 },
    { label: '(Sin valor)', count: 2 },
    { label: 'Cita efectiva', count: 1 },
  ],
} as const;
