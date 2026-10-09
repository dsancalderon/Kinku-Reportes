// Corte transcrito de las dos gráficas de HubSpot compartidas por el usuario.
// Ambas representan los mismos contactos con dimensiones distintas.
export const pekinHubspotOctober = {
  projectId: 'pekin',
  month: '2026-10',
  owner: 'Sofía Prias',
  from: '2026-10-01',
  through: '2026-10-09',
  totalContacts: 47,
  lifecycle: [
    { label: 'Lead', count: 22, color: '#ffa283' },
    { label: 'Lead calificado por marketing', count: 22, color: '#48c9c9' },
    { label: 'Lead calificado por ventas', count: 3, color: '#c5b4f3' },
  ],
  contactStatus: [
    { label: 'No útil', count: 12 },
    { label: 'Marcar de nuevo', count: 10 },
    { label: 'Seguimiento', count: 10 },
    { label: 'Lead Caliente', count: 8 },
    { label: '(Sin valor)', count: 6 },
    { label: 'Cita Programada', count: 1 },
  ],
} as const;
