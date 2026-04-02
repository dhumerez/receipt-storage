export const REPORTS = {
  // Page
  pageTitle: 'Reportes',
  exportPdf: 'Exportar PDF',
  generating: 'Generando...',

  // Tabs
  companyReport: 'Reporte de Empresa',
  clientReport: 'Reporte de Cliente',

  // Filters
  fromLabel: 'Desde',
  toLabel: 'Hasta',
  showSettledClients: 'Mostrar clientes saldados',
  clientLabel: 'Cliente',
  selectClient: 'Seleccionar un cliente...',

  // Company report
  loadingReport: 'Cargando reporte...',
  failedToLoadReport: 'Error al cargar los datos del reporte. Revisa tu conexión e intenta de nuevo.',
  noRecordsYet: 'No hay registros aún',
  noRecordsYetBody: 'Aún no hay datos para generar un reporte. Comienza creando clientes y registrando transacciones.',
  noOutstandingBalances: 'Sin saldos pendientes',
  noOutstandingBalancesBody: 'Ningún cliente tiene saldos pendientes en el rango de fechas seleccionado. Intenta ajustar las fechas o habilitar clientes saldados.',

  // Company report headers
  thClientName: 'Nombre del Cliente',
  thTotalDebts: 'Total de Deudas',
  thTotalPaid: 'Total Pagado',
  thOutstandingBalance: 'Saldo Pendiente',

  // Client report
  selectClientPrompt: 'Selecciona un cliente',
  selectClientBody: 'Elige un cliente del menú desplegable de arriba para ver su historial de transacciones y pagos.',
  noTransactionsFound: 'No se encontraron transacciones',
  noTransactionsFoundBody: 'Este cliente no tiene transacciones en el rango de fechas seleccionado. Intenta ajustar las fechas.',

  // Client report headers
  thRef: 'Ref #',
  thDate: 'Fecha',
  thDescription: 'Descripción',
  thTotal: 'Total',

  // Client report debt section
  debtFor: (ref: string) => `Deuda de ${ref}`,
  totalLabel: 'Total:',
  paidLabel: 'Pagado:',
  remainingLabel: 'Restante:',

  // Payment sub-table headers
  thAmount: 'Monto',
  thMethod: 'Método',
  thReference: 'Referencia',
  thStatus: 'Estado',
} as const;
