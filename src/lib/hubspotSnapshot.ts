// Corte transcrito de las dos gráficas de HubSpot compartidas por el usuario.
// Ambas representan los mismos contactos con dimensiones distintas.
export const pekinHubspotOctober = {
  projectId: 'pekin',
  month: '2026-10',
  owner: 'Sofía Prias',
  from: '2026-10-01',
  through: '2026-10-16',
  totalContacts: 73,
  lifecycle: [
    { label: 'Lead', count: 44, color: '#ffa283' },
    { label: 'Lead calificado por marketing', count: 24, color: '#48c9c9' },
    { label: 'Lead calificado por ventas', count: 3, color: '#c5b4f3' },
    { label: 'Cliente', count: 1, color: '#f9da95' },
    { label: 'Oportunidad', count: 1, color: '#f08ec4' },
  ],
  contactStatus: [
    { label: 'Marcar de nuevo', count: 22 },
    { label: 'No útil', count: 16 },
    { label: 'Seguimiento', count: 14 },
    { label: '(Sin valor)', count: 11 },
    { label: 'Lead Caliente', count: 9 },
    { label: 'Cita efectiva', count: 1 },
  ],
} as const;
