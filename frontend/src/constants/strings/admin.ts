export const ADMIN = {
  // Layout
  adminPanel: 'Panel de Administración',

  // Companies list
  pageTitle: 'Empresas',
  createCompany: 'Crear Empresa',
  searchPlaceholder: 'Buscar por nombre...',
  loading: 'Cargando...',
  noCompanies: 'No hay empresas registradas',
  noCompaniesBody: 'Crea tu primera empresa para comenzar.',
  errorLoading: 'No se pudieron cargar las empresas.',

  // Table headers
  thName: 'Nombre',
  thCurrency: 'Moneda',
  thStatus: 'Estado',
  thCreated: 'Creado',
  thOwner: 'Propietario',

  // Status
  active: 'Activa',
  inactive: 'Inactiva',
  noOwner: 'Sin propietario',

  // Create company modal
  companyName: 'Nombre de la Empresa',
  currencyCode: 'Código de Moneda',
  currencyCodeHint: '3 caracteres ISO (ej. BOB, USD)',

  // Company detail
  back: 'Volver',
  companyInfo: 'Información de la Empresa',
  editCompany: 'Editar Empresa',
  ownerSection: 'Propietario',
  createOwner: 'Crear Propietario',
  email: 'Correo electrónico',
  fullName: 'Nombre completo',
  password: 'Contraseña',
  passwordHint: 'Mínimo 8 caracteres',
  role: 'Rol',

  // Actions
  save: 'Guardar',
  cancel: 'Cancelar',
  deactivate: 'Desactivar Empresa',
  activate: 'Activar Empresa',
  confirmDeactivate: '¿Estás seguro de que deseas desactivar esta empresa?',
  confirmActivate: '¿Estás seguro de que deseas activar esta empresa?',

  // Errors
  emailInUse: 'Este email ya está en uso',
  errorCreating: 'No se pudo crear la empresa.',
  errorUpdating: 'No se pudo actualizar la empresa.',
  errorCreatingOwner: 'No se pudo crear el propietario.',
} as const;
