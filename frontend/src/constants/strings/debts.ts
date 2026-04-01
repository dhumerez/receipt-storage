export const DEBTS = {
  // Page
  loadingDebtDetails: 'Cargando detalles de la deuda...',
  errorLoadingDebt: 'No se pudo cargar esta deuda. Por favor, actualiza la página.',
  backToClient: '\u2190 Volver al Cliente',

  // Status labels
  statusOpen: 'Abierta',
  statusPartiallyPaid: 'Parcialmente Pagada',
  statusFullyPaid: 'Totalmente Pagada',
  statusWrittenOff: 'Cancelada',

  // Header
  downloadStatement: 'Descargar Estado de Cuenta',
  generating: 'Generando...',
  originalAmount: 'Monto Original',
  totalPaid: 'Total Pagado',
  remainingBalance: 'Saldo Restante',

  // Actions
  writeOff: 'Cancelar Deuda',
  reopenDebt: 'Reabrir Deuda',
  processing: 'Procesando...',

  // Payment history
  paymentHistory: 'Historial de Pagos',
  noPaymentsRecorded: 'Sin pagos registrados',
  recordFirstPayment: 'Registra el primer pago para comenzar a rastrear esta deuda.',
  recordPayment: 'Registrar Pago',
  doesNotAffectBalance: 'No afecta el saldo',
  reason: 'Razón:',
  recordedBy: (name: string) => `Registrado por ${name}`,
  ref: (reference: string) => `Ref ${reference}`,

  // Payment approval
  approvePayment: 'Aprobar Pago',
  approving: 'Aprobando...',
  rejectPayment: 'Rechazar Pago',
  confirmReject: 'Confirmar Rechazo',
  rejecting: 'Rechazando...',
  rejectReasonPlaceholder: 'Describe por qué se rechaza este pago',
  rejectReasonRequired: 'Se requiere una razón para rechazar un pago.',

  // Payment form
  amountRequired: 'Monto *',
  paymentDateRequired: 'Fecha de Pago *',
  paymentMethodRequired: 'Método de Pago *',
  selectMethod: 'Seleccionar un método',
  methodCash: 'Efectivo',
  methodTransfer: 'Transferencia',
  methodMobilePayment: 'Pago Móvil',
  methodOther: 'Otro',
  enterPaymentMethod: 'Ingresa el método de pago',
  referenceNumber: 'Número de Referencia',
  notesLabel: 'Notas',
  proofDocuments: 'Documentos de Comprobante',
  savePayment: 'Guardar Pago',

  // Payment form validation
  amountRequiredError: 'El monto es obligatorio y debe ser mayor a 0.',
  paymentExceedsBalance: (max: string) => `El monto del pago excede el saldo restante de $${max}.`,
  paymentDateRequiredError: 'La fecha de pago es obligatoria.',
  paymentMethodRequiredError: 'El método de pago es obligatorio.',
  enterPaymentMethodError: 'Por favor, ingresa un método de pago.',
  couldntSavePayment: 'No se pudo guardar el pago. Revisa tu conexión e intenta de nuevo.',

  // Payment status badges
  paymentConfirmed: 'Confirmado',
  paymentPendingApproval: 'Aprobación Pendiente',
  paymentRejected: 'Rechazado',

  // Write off dialog
  writeOffDebt: 'Cancelar Deuda',
  writeOffBody: 'Esto marcará la deuda como incobrable. Puedes reabrirla más tarde si es necesario.',
  writeOffPlaceholder: 'Describe por qué se cancela esta deuda',
  writeOffReasonRequired: 'Se requiere una razón para cancelar esta deuda.',

  // Original transaction
  originalTransaction: 'Transacción Original',
  viewTransaction: (ref: string) => `Ver Transacción ${ref}`,
} as const;
