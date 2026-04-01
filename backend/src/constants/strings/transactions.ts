export const TRANSACTIONS = {
  clientNotFound: 'Cliente no encontrado',
  notFound: 'Transacción no encontrada',
  onlyOwnersCanApprove: 'Solo los propietarios pueden aprobar transacciones',
  notPendingApproval: 'La transacción no está pendiente de aprobación',
  onlyOwnersCanReject: 'Solo los propietarios pueden rechazar transacciones',
  onlyOwnersCanVoid: 'Solo los propietarios pueden anular transacciones',
  validationError: 'Error de validación',
  invalidAmount: 'Debe ser un monto válido',
  invalidQuantity: 'Debe ser una cantidad válida',
  invalidPrice: 'Debe ser un precio válido',
  atLeastOneLineItem: 'Se requiere al menos un ítem',
} as const;
