import assert from 'node:assert/strict';
import test from 'node:test';
import { numericPresentation } from '../src/components/AnimatedValue';

test('la cifra animada conserva el formato monetario y el valor final exacto', () => {
  const money = numericPresentation('$\u00a02.375.708 COP');
  assert.equal(money?.value, 2_375_708);
  assert.equal(money?.format(2_375_708), '$\u00a02.375.708 COP');
});

test('la cifra animada conserva decimales y omite valores sin número', () => {
  const percent = numericPresentation('33,6%');
  assert.equal(percent?.value, 33.6);
  assert.equal(percent?.format(33.6), '33,6%');
  assert.equal(numericPresentation('—'), null);
});
