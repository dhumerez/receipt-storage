import { describe, it } from 'vitest';

describe('NewTransactionPage', () => {
  it.todo('renders all form sections (client, date, items, payment, notes, attachments)');
  it.todo('requires at least one line item before submit');
  it.todo('requires client selection before submit');
  it.todo('computes line item total from qty * unitPrice');
  it.todo('disables Save button while submitting');
  it.todo('navigates to /transactions on success');
  it.todo('shows error banner on submission failure');
  it.todo('hides internal notes for non-owner/collaborator roles');
});

describe('LineItemBuilder', () => {
  it.todo('adds free-form row with blank fields');
  it.todo('opens catalog picker on + Catalog click');
  it.todo('catalog items have read-only name field');
  it.todo('removes item on x click');
  it.todo('computes running total');
});

describe('FileAttachmentSection', () => {
  it.todo('shows Take Photo and Choose from Gallery buttons');
  it.todo('both buttons always visible (not hidden or disabled)');
  it.todo('shows thumbnail previews for staged images');
  it.todo('shows file icon for PDF files');
  it.todo('removes file on x click');
  it.todo('limits to 5 files maximum');
});
