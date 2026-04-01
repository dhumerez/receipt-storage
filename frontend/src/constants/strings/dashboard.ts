export const DASHBOARD = {
  pageTitle: 'Panel',

  // KPI cards
  totalOutstanding: 'Saldo Pendiente Total',
  totalCollected: 'Total Cobrado',
  clientsWithBalance: 'Clientes con Saldo',
  pendingApprovals: 'Aprobaciones Pendientes',

  // Sections
  topDebtors: 'Principales Deudores',
  recentTransactions: 'Transacciones Recientes',
  pendingApprovalsSection: 'Pendientes de Aprobaci\u00f3n',

  // Table headers
  thClient: 'Cliente',
  thBalance: 'Saldo Pendiente',
  thRef: 'Ref #',
  thAmount: 'Monto',
  thDate: 'Fecha',
  thStatus: 'Estado',

  // Links
  viewAll: 'Ver todos',
  viewReports: 'Ver reportes',

  // Empty / loading
  noDebtors: 'Sin deudores',
  noDebtorsBody: 'No hay clientes con saldo pendiente en los \u00faltimos 30 d\u00edas.',
  noPendingApprovals: 'Sin aprobaciones pendientes',
  noPendingApprovalsBody: 'No hay transacciones esperando tu aprobaci\u00f3n.',
  noRecentTransactions: 'Sin transacciones recientes',
  noRecentTransactionsBody: 'Las transacciones aparecer\u00e1n aqu\u00ed cuando se creen.',
} as const;
