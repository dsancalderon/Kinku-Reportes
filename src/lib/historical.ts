import type { ProjectId } from '../../shared/projects';
export interface ReportRow { name: string; result: number; target: number; spend: number; unit: string }
export interface ReportView { id: string; label: string; unit: string; stats: [string,string,string][]; rows: ReportRow[]; note: string; slides: string }
export const historical: Record<ProjectId, ReportView[]> = {
  pekin: [
    { id: 'leads', label: 'Clientes potenciales', unit: 'leads', stats: [['Leads Meta','69','Apartaestudio + dos habitaciones'],['Inversión en captación','$1.522.248','COP · Meta Ads'],['Costo por lead','$22.062','COP · consolidado'],['Cumplimiento','62,73%','69 de 110 leads']], rows: [{name:'Apartaestudio',result:55,target:70,spend:1348691,unit:'leads'},{name:'Dos habitaciones',result:14,target:40,spend:173557,unit:'leads'}], note: 'Apartaestudio concentra 55 leads, pero supera su presupuesto planeado. Dos habitaciones mantiene un menor costo por lead. La siguiente decisión requiere revisar la calidad comercial, además del volumen.', slides:'5–7' },
    { id: 'awareness', label:'Reconocimiento', unit:'impresiones', stats:[['Impresiones','134.020','Meta del período: 125.000'],['Alcance','70.232','Personas · rango completo'],['Inversión','$233.453','COP · reconocimiento'],['Cumplimiento','107,22%','Meta evaluada en impresiones']], rows:[{name:'Reconocimiento Pekín',result:134020,target:125000,spend:233453,unit:'impresiones'}], note:'El reporte supera la meta de impresiones con un consumo del 46,69% del presupuesto. Las 63.178 interacciones son otra métrica: no equivalen a impresiones ni a leads.', slides:'11' },
  ],
  metriku: [{id:'engagement',label:'Interacción',unit:'interacciones',stats:[['Interacciones','30.044','Interacciones con la página'],['Inversión','$146.183','COP · Meta Ads'],['Costo por interacción','$4,87','COP · CPI'],['Cumplimiento','283,43%','Meta: 10.600 interacciones']],rows:[{name:'Arrendatario · interacción',result:30044,target:10600,spend:146183,unit:'interacciones'}],note:'La meta de interacción está superada y se consumió el 97,46% del plan mensual. El reporte registra 75 reacciones y 8 guardados como desgloses, no como resultados adicionales. Priorizar calidad y frecuencia.',slides:'17–18'}],
  skala: [{id:'leads',label:'Clientes potenciales',unit:'leads',stats:[['Leads Meta','116','Vivienda + inversión'],['Inversión','$1.192.975','COP · Meta Ads'],['Costo por lead','$10.284','COP · consolidado'],['Cumplimiento','116,00%','116 de 100 leads']],rows:[{name:'Vivienda',result:65,target:50,spend:589949,unit:'leads'},{name:'Inversión',result:51,target:50,spend:603026,unit:'leads'}],note:'Ambas líneas superan su meta de leads. Vivienda tiene el menor costo por resultado; Inversión necesita mejorar eficiencia. El gasto consolidado supera en $192.975 el plan mensual. Validar calidad antes de ampliar inversión.',slides:'20–22, 26'}],
};
export const money = (value: number | null | undefined) =>
  value === null || value === undefined || isNaN(value)
    ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const number = (value: number | null | undefined) =>
  value === null || value === undefined || isNaN(value)
    ? '—'
    : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);

