export const PRODUCTS = {
  // Page
  pageTitle: 'Productos',
  addProduct: 'Agregar Producto',
  loadingProducts: 'Cargando productos...',
  errorLoadingProducts: 'No se pudieron cargar los productos. Por favor, actualiza la página.',
  searchPlaceholder: 'Buscar por nombre o unidad',

  // Empty states
  noProductsMatchSearch: 'No hay productos que coincidan con tu búsqueda',
  tryDifferentSearch: 'Intenta con un nombre o unidad diferente, o borra la búsqueda.',
  noInactiveProducts: 'Sin productos inactivos',
  deactivatedProductsAppearHere: 'Los productos desactivados aparecerán aquí.',
  noProductsYet: 'Aún no hay productos',
  addFirstProduct: 'Agrega tu primer producto para comenzar a construir tu catálogo.',

  // Table headers
  thName: 'Nombre',
  thUnitPrice: 'Precio Unitario',
  thUnit: 'Unidad',
  thStatus: 'Estado',
  thActions: 'Acciones',

  // Modal
  editProduct: 'Editar Producto',
  nameLabel: 'Nombre',
  unitPriceLabel: 'Precio Unitario',
  unitOfMeasureLabel: 'Unidad de Medida',
  unitOfMeasureOptional: '(opcional)',
  unitOfMeasurePlaceholder: 'ej., caja, unidad, kg',
  descriptionLabel: 'Descripción',
  descriptionOptional: '(opcional)',
  discardChanges: 'Descartar Cambios',
  createProduct: 'Crear Producto',
  saveChanges: 'Guardar Cambios',
  couldntSaveChanges: 'No se pudieron guardar los cambios. Revisa tu conexión e intenta de nuevo.',

  // Deactivate
  deactivateProductQuestion: '¿Desactivar producto?',
  deactivateProductBody: 'Este producto será ocultado de las listas activas. Los ítems de transacciones existentes que lo referencian se conservan. Puedes reactivarlo en cualquier momento.',
  keepProduct: 'Mantener Producto',
  deactivateProduct: 'Desactivar Producto',
  deactivating: 'Desactivando...',
} as const;
