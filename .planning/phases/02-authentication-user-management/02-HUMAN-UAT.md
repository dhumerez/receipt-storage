---
status: partial
phase: 02-authentication-user-management
source: [02-VERIFICATION.md]
started: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Multi-role login end-to-end
expected: Each role gets a token with the correct role field; client gets clientId embedded; super admin gets companyId=null
result: [pending]

### 2. Role enforcement (collaborator gets 403 on owner endpoint)
expected: Collaborator calling POST /api/v1/users/invite receives 403 Insufficient permissions
result: [pending]

### 3. FR-02.9 auto-reject on deactivation
expected: Deactivating a collaborator with pending transactions reverts those transactions to draft; deactivated user cannot log in
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
