import { describe, it } from 'vitest';

describe('TransactionsPage', () => {
  it.todo('renders transaction list with table');
  it.todo('shows New Transaction button for owner/collaborator');
  it.todo('hides New Transaction button for viewer');
  it.todo('filters by search text');
  it.todo('filters by status segment');
  it.todo('filters by client dropdown');
  it.todo('filters by date range');
  it.todo('shows empty state when no transactions');
  it.todo('shows search empty state when no results match');
});

describe('TransactionDetailPage', () => {
  it.todo('renders all 5 sections (header, items, payment, attachments, notes)');
  it.todo('shows back link to /transactions');
  it.todo('renders line items table with total');
  it.todo('renders attachment thumbnails with getFileUrl');
  it.todo('hides internal notes from viewer role');
  it.todo('shows error state on load failure');
});
