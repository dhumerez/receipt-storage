export const TRANSACTIONS = {
  // Page
  pageTitle: 'Transacciones',
  newTransaction: 'Nueva Transacción',
  loadingTransactions: 'Cargando transacciones...',
  loadingTransaction: 'Cargando transacción...',
  errorLoadingTransactions: 'No se pudieron cargar las transacciones. Por favor, actualiza la página.',
  errorLoadingTransaction: 'No se pudo cargar esta transacción. Por favor, actualiza la página.',
  searchPlaceholder: 'Buscar por referencia o descripción',

  // Status filter
  statusAll: 'Todos',
  statusPending: 'Pendiente',
  statusActive: 'Activa',
  statusVoided: 'Anulada',
  statusDraft: 'Borrador',
  statusWrittenOff: 'Cancelada',

  // Client filter
  allClients: 'Todos los Clientes',

  // Empty states
  noTransactionsMatchSearch: 'No hay transacciones que coincidan con tu búsqueda',
  tryDifferentFilters: 'Intenta con filtros diferentes o borra la búsqueda para ver todas las transacciones.',
  noStatusTransactions: (status: string) => `No hay transacciones ${status}`,
  transactionsWithStatusAppearHere: 'Las transacciones con este estado aparecerán aquí.',
  noTransactionsYet: 'Aún no hay transacciones',
  createFirstTransaction: 'Crea tu primera transacción para comenzar a rastrear recibos y deudas.',

  // New transaction form
  clientLabel: 'Cliente',
  selectClient: 'Seleccionar un cliente...',
  deliveryDateLabel: 'Fecha de Entrega',
  descriptionLabel: 'Descripción',
  optionalDescription: 'Descripción opcional...',
  lineItemsLabel: 'Ítems',
  initialPaymentLabel: 'Pago Inicial',
  clientNotesLabel: 'Notas del Cliente',
  clientNotesPlaceholder: 'Notas visibles para el cliente...',
  internalNotesLabel: 'Notas Internas',
  internalNotesPlaceholder: 'Notas visibles solo para tu equipo...',
  attachmentsLabel: 'Adjuntos',
  discardChanges: 'Descartar Cambios',
  saveTransaction: 'Guardar Transacción',
  couldntSaveTransaction: 'No se pudo guardar la transacción. Revisa tu conexión e intenta de nuevo.',
  pleaseSelectClient: 'Por favor selecciona un cliente.',
  pleaseAddLineItem: 'Por favor agrega al menos un ítem.',

  // Line item builder
  addLineItemsBelow: 'Agrega ítems usando los botones de abajo.',
  catalogButton: '+ Catálogo',
  freeFormButton: '+ Libre',
  itemNamePlaceholder: 'Nombre del ítem',
  thName: 'Nombre',
  thQty: 'Cant.',
  thUnitPrice: 'Precio Unit.',
  thTotal: 'Total',
  thPrice: 'Precio',
  runningTotal: (total: string) => `Total: $${total}`,

  // Transaction detail
  downloadReceiptPdf: 'Descargar Recibo PDF',
  generating: 'Generando...',
  delivered: 'Entregado:',
  submittedBy: 'Enviado por:',
  lineItems: 'Ítems',
  thLineTotal: 'Total Línea',
  paymentSummary: 'Resumen de Pago',
  initialPayment: 'Pago Inicial:',
  amountOwed: 'Monto Adeudado:',
  noAttachments: 'Sin adjuntos',
  clientNotes: 'Notas del Cliente',
  internalNotes: 'Notas Internas',
  noNotes: 'Sin notas',

  // Catalog picker modal
  selectProduct: 'Seleccionar Producto',
  searchProducts: 'Buscar productos...',
  couldntLoadProducts: 'No se pudieron cargar los productos. Por favor, intenta de nuevo.',
  noProductsFound: 'No se encontraron productos.',
  backToForm: 'Volver al Formulario',

  // Transaction table headers
  thRef: 'Ref #',
  thClient: 'Cliente',
  thInitialPayment: 'Pago Inicial',
  thStatus: 'Estado',
  thDelivered: 'Entregado',
  thSubmittedBy: 'Enviado Por',

  // File attachment
  dragFilesHere: 'Arrastra archivos aquí, o usa los botones de abajo para tomar una foto o elegir de tu galería.',
  fileTypeNotSupported: 'Ese tipo de archivo no es compatible. Sube archivos JPEG, PNG, WebP, PDF o HEIC.',
  fileTooLarge: 'Ese archivo es muy grande. El tamaño máximo es 10 MB.',
  maxFilesReached: 'Máximo 5 archivos por transacción. Elimina un archivo para agregar otro.',
  takePhoto: 'Tomar Foto',
  chooseFromGallery: 'Elegir de Galería',
  filesCount: (count: number, max: number) => `${count} / ${max} archivos`,
} as const;
