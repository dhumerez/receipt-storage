export const PDF = {
  // Footer
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  generated: (date: string) => `Generado: ${date}`,

  // Company report
  companyReportTitle: 'Reporte de Empresa',
  thClientName: 'Nombre del Cliente',
  thTotalDebts: 'Total de Deudas',
  thTotalPaid: 'Total Pagado',
  thOutstandingBalance: 'Saldo Pendiente',

  // Client report
  clientReportTitle: 'Reporte de Cliente',
  thRef: 'Ref #',
  thDate: 'Fecha',
  thDescription: 'Descripción',
  thTotalAmount: 'Monto Total',
  fullyPaid: 'Pagado',
  outstanding: (balance: string) => `Pendiente: $${balance}`,

  // Receipt
  reference: (ref: string) => `Referencia: ${ref}`,
  date: (date: string) => `Fecha: ${date}`,
  description: (desc: string) => `Descripción: ${desc}`,
  thItem: 'Ítem',
  thQty: 'Cant.',
  thUnitPrice: 'Precio Unit.',
  thTotal: 'Total',
  total: (amount: string) => `Total: $${amount}`,
  paymentHistory: 'Historial de Pagos',
  thAmount: 'Monto',
  thMethod: 'Método',
} as const;
