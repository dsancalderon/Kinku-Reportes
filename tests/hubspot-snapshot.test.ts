import assert from 'node:assert/strict';
import test from 'node:test';
import { pekinHubspotOctober } from '../src/lib/hubspotSnapshot';

test('el cierre de HubSpot al 31 de octubre reconcilia ambas gráficas de 121 contactos', () => {
  const data = pekinHubspotOctober;
  assert.equal(data.through, '2026-10-31');
  assert.equal(data.totalContacts, 121);
  assert.equal(data.lifecycle.reduce((total, item) => total + item.count, 0), data.totalContacts);
  assert.equal(data.contactStatus.reduce((total, item) => total + item.count, 0), data.totalContacts);
  assert.deepEqual(data.lifecycle.map(item => item.count), [68, 34, 11, 8]);
  assert.deepEqual(data.contactStatus.map(item => item.count), [57, 22, 17, 15, 7, 2, 1]);
  assert.equal(data.contactStatus.at(-1)?.label, 'Cita efectiva');
});
