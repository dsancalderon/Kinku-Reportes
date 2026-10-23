import assert from 'node:assert/strict';
import test from 'node:test';
import { pekinHubspotOctober } from '../src/lib/hubspotSnapshot';

test('el corte de HubSpot al 23 de octubre reconcilia ambas gráficas de 100 contactos', () => {
  const data = pekinHubspotOctober;
  assert.equal(data.through, '2026-10-23');
  assert.equal(data.totalContacts, 100);
  assert.equal(data.lifecycle.reduce((total, item) => total + item.count, 0), data.totalContacts);
  assert.equal(data.contactStatus.reduce((total, item) => total + item.count, 0), data.totalContacts);
  assert.deepEqual(data.lifecycle.map(item => item.count), [56, 37, 5, 2]);
  assert.deepEqual(data.contactStatus.map(item => item.count), [41, 24, 22, 10, 2, 1]);
  assert.equal(data.contactStatus.at(-1)?.label, 'Cita Programada');
});
