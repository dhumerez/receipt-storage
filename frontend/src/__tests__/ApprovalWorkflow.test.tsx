import { describe, it } from 'vitest';

describe('NotificationBell', () => {
  it.todo('renders for owner role');
  it.todo('renders for collaborator role');
  it.todo('returns null for viewer role');
  it.todo('returns null for client role');
  it.todo('shows badge with unread count');
  it.todo('hides badge when count is 0');
  it.todo('shows 9+ when count exceeds 9');
  it.todo('toggles panel on click');
});

describe('NotificationPanel', () => {
  it.todo('slides in from right when open');
  it.todo('shows pending transactions for owner');
  it.todo('shows submission statuses for collaborator');
  it.todo('shows empty state when no notifications');
  it.todo('marks all as read on link click');
});

describe('NotificationPanelItem', () => {
  it.todo('shows approve and reject buttons for owner');
  it.todo('hides action buttons for collaborator');
  it.todo('expands reject reason textarea on reject click');
  it.todo('requires reason before confirm reject');
  it.todo('invalidates queries after approve');
  it.todo('invalidates queries after reject');
});
