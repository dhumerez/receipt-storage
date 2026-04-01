export const PORTAL = {
  // Layout
  appName: 'Rastreador de Recibos',
  logout: 'Cerrar Sesión',

  // Portal page
  loadingAccount: 'Cargando tu cuenta...',
  errorLoadingAccount: 'No se pudo cargar tu cuenta. Por favor, actualiza la página.',
  noTransactionsYet: 'Aún no hay transacciones',
  accountUpToDate: 'Tu cuenta está al día. Las transacciones aparecerán aquí una vez registradas.',

  // Balance summary
  totalOutstandingAsOf: 'Total pendiente al',
  totalPaidLabel: 'Total pagado:',
  awaitingConfirmation: 'En espera de confirmación:',
  pendingReviewMessage: 'Estos pagos están pendientes de revisión por tu administrador de cuenta.',

  // Debt groups
  groupOpen: 'Abiertas',
  groupPartiallyPaid: 'Parcialmente Pagadas',
  groupFullyPaid: 'Totalmente Pagadas',

  // Transaction row labels
  originalLabel: 'Original:',
  paidLabel: 'Pagado:',
  remainingLabel: 'Restante:',

  // Portal debt detail
  loadingDebtDetails: 'Cargando detalles de la deuda...',
  backToDashboard: '\u2190 Volver al Panel',
  errorLoadingDebt: 'No se pudo cargar esta deuda. Por favor, actualiza la página.',
  debtDetails: 'Detalles de la Deuda',
  originalAmount: 'Monto Original',
  totalPaid: 'Total Pagado',
  remainingBalance: 'Saldo Restante',

  // Payment history
  paymentHistory: 'Historial de Pagos',
  noPaymentsYet: 'Aún no hay pagos',
  paymentsWillAppearHere: 'Los pagos aparecerán aquí una vez que sean registrados.',

  // Payment status
  confirmed: 'Confirmado',
  awaitingConfirmationBadge: 'En espera de confirmación',
  rejected: 'Rechazado',

  // Original transaction
  originalTransaction: 'Transacción Original',

  // Debt status labels (portal version)
  statusOpen: 'Abierta',
  statusPartiallyPaid: 'Parcialmente Pagada',
  statusFullyPaid: 'Totalmente Pagada',
  statusWrittenOff: 'Cancelada',
} as const;
