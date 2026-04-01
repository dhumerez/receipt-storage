export const ERRORS = {
  // Global
  validationError: 'Error de validación',
  notFound: 'No encontrado',
  internalServerError: 'Error interno del servidor',

  // RBAC
  unauthenticated: 'No autenticado',
  insufficientPermissions: 'Permisos insuficientes',
  superAdminRequired: 'Se requiere acceso de super administrador',

  // Tenant
  noTenantContext: 'Sin contexto de empresa',

  // Admin
  companyNotFound: 'Empresa no encontrada',
  emailAlreadyInUse: 'El correo ya está en uso',

  // Users
  cannotChangeOwnRole: 'No puedes cambiar tu propio rol',
  userNotFound: 'Usuario no encontrado',
  cannotDeactivateYourself: 'No puedes desactivarte a ti mismo',
  userDeactivated: 'Usuario desactivado',
  invitationSent: 'Invitación enviada',
  userRemovedFromCompany: 'Usuario eliminado de la empresa',

  // Files
  forbidden: 'Prohibido',
  invalidFilename: 'Nombre de archivo inválido',
  documentNotFound: 'Documento no encontrado',
  fileNotFound: 'Archivo no encontrado',
} as const;
