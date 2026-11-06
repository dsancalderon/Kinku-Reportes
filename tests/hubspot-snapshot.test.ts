import assert from 'node:assert/strict';
import test from 'node:test';
import { pekinHubspotOctober, pekinHubspotNovember } from '../src/lib/hubspotSnapshot';

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

test('HubSpot del 1 al 6 de noviembre reconcilia ambas gráficas de 37 contactos', () => {
  const data = pekinHubspotNovember;
  assert.equal(data.through, '2026-11-06');
  assert.equal(data.totalContacts, 37);
  assert.equal(data.lifecycle.reduce((total, item) => total + item.count, 0), 37);
  assert.equal(data.contactStatus.reduce((total, item) => total + item.count, 0), 37);
  assert.deepEqual(data.lifecycle.map(item => item.count), [19, 16, 2]);
  assert.deepEqual(data.contactStatus.map(item => item.count), [15, 13, 4, 3, 2]);
});
