import assert from 'node:assert/strict';
import test from 'node:test';
import { pekinHubspotOctober } from '../src/lib/hubspotSnapshot';

test('el corte de HubSpot al 16 de octubre reconcilia ambas gráficas de 73 contactos', () => {
  const data = pekinHubspotOctober;
  assert.equal(data.through, '2026-10-16');
  assert.equal(data.totalContacts, 73);
  assert.equal(data.lifecycle.reduce((total, item) => total + item.count, 0), data.totalContacts);
  assert.equal(data.contactStatus.reduce((total, item) => total + item.count, 0), data.totalContacts);
  assert.deepEqual(data.lifecycle.map(item => item.count), [44, 24, 3, 1, 1]);
  assert.deepEqual(data.contactStatus.map(item => item.count), [22, 16, 14, 11, 9, 1]);
  assert.equal(data.contactStatus.at(-1)?.label, 'Cita efectiva');
});
