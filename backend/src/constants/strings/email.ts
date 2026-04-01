export const EMAIL = {
  inviteSubject: (companyName: string) => `Has sido invitado a ${companyName}`,
  resetSubject: 'Restablece tu contraseña — Rastreador de Recibos',
  greeting: 'Hola,',
  inviteBody: (invitedByName: string, companyName: string, role: string) =>
    `<strong>${invitedByName}</strong> te ha invitado a unirte a <strong>${companyName}</strong> como <strong>${role}</strong>.`,
  acceptInviteCta: (inviteUrl: string) => `<a href="${inviteUrl}">Aceptar Invitación</a>`,
  inviteExpires: 'Este enlace expira en 48 horas.',
  inviteSafetyNotice: 'Si no esperabas esta invitación, puedes ignorar este correo de forma segura.',
  resetBody: 'Solicitaste un restablecimiento de contraseña para tu cuenta de Rastreador de Recibos.',
  resetCta: (resetUrl: string) => `<a href="${resetUrl}">Restablecer Contraseña</a>`,
  resetSafetyNotice: 'Este enlace expira en 1 hora. Si no solicitaste un restablecimiento, puedes ignorar este correo de forma segura.',
  sendFailed: (message: string) => `Error al enviar correo: ${message}`,
} as const;
