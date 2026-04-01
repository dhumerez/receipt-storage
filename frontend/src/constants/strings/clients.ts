export const CLIENTS = {
  // Page
  pageTitle: 'Clientes',
  addClient: 'Agregar Cliente',
  loadingClients: 'Cargando clientes...',
  loadingClient: 'Cargando cliente...',
  errorLoadingClients: 'No se pudieron cargar los clientes. Por favor, actualiza la página.',
  errorLoadingClient: 'No se pudo cargar el cliente. Por favor, actualiza la página.',
  searchPlaceholder: 'Buscar por nombre, correo o teléfono',

  // Empty states
  noInactiveClients: 'Sin clientes inactivos',
  noClientsYet: 'Aún no hay clientes',
  deactivatedClientsAppearHere: 'Los clientes desactivados aparecerán aquí.',
  addFirstClient: 'Agrega tu primer cliente para comenzar a rastrear deudas y pagos.',

  // Table headers
  thName: 'Nombre',
  thPhone: 'Teléfono',
  thOutstandingBalance: 'Saldo Pendiente',
  thStatus: 'Estado',

  // Modal
  editClient: 'Editar Cliente',
  fullNameRequired: 'Nombre Completo *',
  emailOptional: 'Correo electrónico',
  emailOptionalHint: '(opcional)',
  phoneLabel: 'Teléfono',
  addressLabel: 'Dirección',
  referencesLabel: 'Referencias',
  createClient: 'Crear Cliente',
  saveChanges: 'Guardar Cambios',
  couldntSaveChanges: 'No se pudieron guardar los cambios. Revisa tu conexión e intenta de nuevo.',

  // Deactivate
  deactivateClientQuestion: '¿Desactivar cliente?',
  deactivateClientBody: 'Este cliente será ocultado de las listas activas. Las deudas existentes y el historial de pagos se conservan. Puedes reactivarlo en cualquier momento.',
  keepClient: 'Mantener Cliente',
  deactivateClient: 'Desactivar Cliente',
  deactivating: 'Desactivando...',

  // Client detail header
  sendPortalInvite: 'Enviar Invitación al Portal',
  portalActive: 'Portal Activo',
  addEmailBeforeInvite: 'Agrega un correo electrónico a este cliente antes de enviar una invitación al portal.',
  portalAccessAlreadyActive: 'El acceso al portal ya está activo.',
  inviteSentTo: (email: string) => `Invitación al portal enviada a ${email}.`,
  inviteCouldNotBeSent: 'No se pudo enviar la invitación. Revisa la dirección de correo e intenta de nuevo.',

  // Balance summary
  outstandingBalanceAsOf: 'Saldo pendiente al',

  // Debt groups
  openDebts: 'Deudas Abiertas',
  partiallyPaid: 'Parcialmente Pagadas',
  fullyPaid: 'Totalmente Pagadas',
  noDebtsRecorded: 'Aún no hay deudas registradas para este cliente.',

  // Debt card labels
  original: 'Original',
  paid: 'Pagado',
  remaining: 'Restante',
} as const;
