export const AUTH = {
  // Login
  signIn: 'Iniciar Sesión',
  signingIn: 'Iniciando sesión...',
  emailLabel: 'Correo electrónico',
  passwordLabel: 'Contraseña',
  forgotPasswordLink: '¿Olvidaste tu contraseña?',
  loginFailed: 'Error al iniciar sesión',
  demoAccounts: 'Cuentas de demostración',
  demoSuperAdmin: 'Super Admin',
  demoOwner: 'Propietario',

  // Forgot password
  forgotPasswordTitle: 'Recuperar Contraseña',
  forgotPasswordSubtitle: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.',
  sendResetLink: 'Enviar Enlace',
  sending: 'Enviando...',
  checkYourEmail: 'Revisa tu correo',
  resetLinkSent: (email: string) =>
    `Si existe una cuenta para ${email}, recibirás un enlace para restablecer tu contraseña en breve.`,
  backToLogin: 'Volver al Inicio de Sesión',
  somethingWentWrong: 'Algo salió mal',

  // Reset password
  resetPasswordTitle: 'Restablecer Contraseña',
  resetPasswordSubtitle: 'Ingresa tu nueva contraseña a continuación.',
  newPasswordLabel: 'Nueva Contraseña',
  confirmNewPasswordLabel: 'Confirmar Nueva Contraseña',
  passwordsDoNotMatch: 'Las contraseñas no coinciden',
  passwordMinLength: 'La contraseña debe tener al menos 8 caracteres',
  resetting: 'Restableciendo...',
  resetPassword: 'Restablecer Contraseña',
  passwordResetSuccess: 'Contraseña Restablecida',
  passwordResetSuccessMessage: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
  goToLogin: 'Ir al Inicio de Sesión',
  failedToResetPassword: 'Error al restablecer la contraseña',

  // Invalid link
  invalidLink: 'Enlace Inválido',
  resetLinkMissingToken: 'Este enlace de restablecimiento no tiene un token válido. Por favor, solicita un nuevo enlace.',
  inviteLinkMissingToken: 'Este enlace de invitación no tiene un token válido. Por favor, revisa el correo e intenta de nuevo.',

  // Accept invite
  acceptInviteTitle: 'Aceptar Invitación',
  acceptInviteSubtitle: 'Configura tu nombre y contraseña para comenzar.',
  fullNameLabel: 'Nombre Completo',
  confirmPasswordLabel: 'Confirmar Contraseña',
  settingUpAccount: 'Configurando cuenta...',
  createAccount: 'Crear Cuenta',
  failedToAcceptInvite: 'Error al aceptar la invitación',
} as const;
