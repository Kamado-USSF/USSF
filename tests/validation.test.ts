import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccountLinkRequest } from '../src/data/ussfData';
import { findLinkRequestConflict, validateApplication, validateAsset, validateGroupInfo, validateLinkRequest } from '../lib/validation';

const validLinkRequest = {
  username: 'website-user',
  inGameName: 'Operator_One',
  inGameCid: 'SF-222',
  ingameRank: 'Private',
  f5ScreenshotUrl: 'https://proof.example/image.png'
};

test('link request validates required data and HTTP proof URLs', () => {
  assert.equal(validateLinkRequest(validLinkRequest).ok, true);
  assert.equal(validateLinkRequest({ ...validLinkRequest, f5ScreenshotUrl: 'javascript:alert(1)' }).ok, false);
  assert.equal(validateLinkRequest({ ...validLinkRequest, username: '' }).ok, false);
});

test('pending link request is idempotent only for the same account and CID', () => {
  const existing = { ...validLinkRequest, id: 'link-1', submissionDate: '2026-01-01', status: 'Pending' } as AccountLinkRequest;
  const state = { linkRequests: [existing], members: [] };
  assert.equal(findLinkRequestConflict(state, 'WEBSITE-USER', 'sf-222')?.existing?.id, 'link-1');
  assert.match(findLinkRequestConflict(state, 'other-user', 'SF-222')?.error || '', /pending request/i);
  assert.match(findLinkRequestConflict(state, 'website-user', 'SF-333')?.error || '', /already has a pending/i);
});

test('roster CID and account collisions require administrative recovery', () => {
  const state = { linkRequests: [], members: [{ cid: 'SF-222' }, { cid: 'SF-333', accountName: 'other-user' }] };
  assert.match(findLinkRequestConflict(state, 'website-user', 'sf-222')?.error || '', /administrative recovery/i);
  assert.match(findLinkRequestConflict(state, 'other-user', 'SF-444')?.error || '', /already associated/i);
});

test('application and asset validation reject invalid payloads', () => {
  assert.equal(validateApplication({ applicantName: 'Applicant', age: 18, playtimeHours: 300, rulesAccepted: true }).ok, true);
  assert.equal(validateApplication({ applicantName: 'Applicant', age: 12, playtimeHours: 300, rulesAccepted: true }).ok, false);
  assert.equal(validateAsset({
    id: 'asset-1', type: 'SKIN', title: 'Field Uniform', codeOrId: '39', variantCount: 2,
    imageUrl: 'https://images.example/field.png', description: 'Field uniform', category: 'Infantry'
  }).ok, true);
  assert.equal(validateAsset({
    id: 'asset-1', type: 'SKIN', title: 'Field Uniform', codeOrId: '39', variantCount: 2,
    imageUrl: 'http://images.example/field.png', description: 'Field uniform', category: 'Infantry'
  }).ok, false);
});

test('group specification validation only accepts known fields and correctly typed arrays', () => {
  assert.deepEqual(validateGroupInfo({ founder: 'Verified Founder', skinsAvailable: [' 39 ', ''] }), {
    ok: true,
    value: { founder: 'Verified Founder', skinsAvailable: ['39'] }
  });
  assert.equal(validateGroupInfo({ unknownField: 'ignored' }).ok, false);
  assert.equal(validateGroupInfo({ skinsAvailable: '39, 164' }).ok, false);
});
