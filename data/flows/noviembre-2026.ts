import type { MonthlyTarget } from '../../shared/contracts';

// Metas por fila de la hoja NOVIEMBRE del Flow compartido por el usuario.
// Se conservan los KPI de cada campaña, aunque los totales impresos no siempre coinciden.
// La fila de Arrendatarios se dividió por instrucción del usuario en dos campañas,
// con mitad del KPI y presupuesto para cada una y el mismo costo objetivo por lead.
// El KPI de interacción de Métriku se revisó a presupuesto / costo objetivo el 06/11.
export const novemberTargets: MonthlyTarget[] = [
  { projectId: 'pekin', month: '2026-11', channel: 'meta', objective: 'engagement', lineName: 'RECONOCIMIENTO', targetKpi: 16666.666666666668, targetUnit: 'interacciones', budgetSpend: 250000, targetCostPerResult: 15 },
  { projectId: 'pekin', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'APARTAESTUDIOS VIVIENDA', targetKpi: 40, targetUnit: 'leads', budgetSpend: 1000000, targetCostPerResult: 25000 },
  { projectId: 'pekin', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'APARTAESTUDIOS INVERSIONISTA', targetKpi: 40, targetUnit: 'leads', budgetSpend: 1000000, targetCostPerResult: 25000 },
  { projectId: 'metriku', month: '2026-11', channel: 'meta', objective: 'engagement', lineName: 'INTERACCIÓN', targetKpi: 40000, originalTargetKpi: 3044, targetRevisionDate: '2026-11-06', targetUnit: 'interacciones', budgetSpend: 200000, targetCostPerResult: 5 },
  { projectId: 'metriku', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'PROPIETARIOS', targetKpi: 150, targetUnit: 'leads', budgetSpend: 1500000, targetCostPerResult: 10000 },
  { projectId: 'metriku', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'ARRENDATARIOS APTO 601', targetKpi: 8.333333333333334, targetUnit: 'leads', budgetSpend: 250000, targetCostPerResult: 30000 },
  { projectId: 'metriku', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'ARRENDATARIOS APTO 6 MILLONES', targetKpi: 8.333333333333334, targetUnit: 'leads', budgetSpend: 250000, targetCostPerResult: 30000 },
  { projectId: 'metriku', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'FINCA VILLAVICENCIO', targetKpi: 13.333333333333334, targetUnit: 'leads', budgetSpend: 400000, targetCostPerResult: 30000 },
  { projectId: 'metriku', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'FINCA RANCHO GRANDE', targetKpi: 13.333333333333334, targetUnit: 'leads', budgetSpend: 400000, targetCostPerResult: 30000 },
  { projectId: 'skala', month: '2026-11', channel: 'meta', objective: 'engagement', lineName: 'RECONOCIMIENTO', targetKpi: 16666.666666666668, targetUnit: 'interacciones', budgetSpend: 250000, targetCostPerResult: 15 },
  { projectId: 'skala', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'INVERSIÓN', targetKpi: 51, targetUnit: 'leads', budgetSpend: 500000, targetCostPerResult: 10000 },
  { projectId: 'skala', month: '2026-11', channel: 'meta', objective: 'leads', lineName: 'VIVIENDA', targetKpi: 65, targetUnit: 'leads', budgetSpend: 500000, targetCostPerResult: 10000 },
];
