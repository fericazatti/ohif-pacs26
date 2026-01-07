/** @type {AppTypes.Config} */
window.config = {
  routerBasename: '/',
  extensions: [],
  modes: [],
  showStudyList: true,

  // --- ⚡ OPTIMIZACIÓN DE RENDIMIENTO (GPU & CPU) ---
  // Usa texturas WebGL de 16 bits: Mejora calidad y reduce el uso de memoria RAM
  useNorm16Texture: true,
  // Evita interpolaciones costosas en cortes MPR si no son necesarias
  strictZSpacingForVolumeViewport: true,
  
  // --- ⚡ GESTIÓN DE CONCURRENCIA DE RED ---
  // Controla cuántas peticiones simultáneas hace OHIF. 
  // Valores optimizados para HTTP/2 (tu Nginx) evitando saturar el hilo principal.
  maxNumRequests: {
    interaction: 100, // Prioridad máxima (lo que el usuario está moviendo/viendo)
    thumbnail: 75,    // Prioridad media (lista de series)
    prefetch: 10,     // Prioridad baja (carga de fondo)
  },

  // --- UI & ERRORES ---
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  defaultDataSourceName: 'dicomweb',

  // --- BRANDING (DEV) ---
  whiteLabeling: {
    createLogoComponentFn: function(React) {
      return React.createElement(
        'a',
        {
          target: '_self',
          rel: 'noopener noreferrer',
          className: 'header-brand',
          href: '/',
          style: { display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#9CC7F7' }
        },
        React.createElement('h3', {}, 'DEV SPEED OPTIMIZED')
      );
    }
  },
  
  // --- AUTENTICACIÓN (DEV) ---
  oidc: [
    {
      authority: 'https://10.73.173.10:4443/realms/dcm4che', 
      client_id: 'ohif-viewer',
      redirect_uri: 'http://10.73.173.10:3000/callback',
      response_type: 'code',
      scope: 'openid',
      post_logout_redirect_uri: 'http://10.73.173.10:3000/',
      revoke_access_token_on_logout: true,
    },
  ],

  // --- FUENTES DE DATOS (DEV) ---
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'DCM4CHEE Speed Config',
        name: 'DCM4CHEE',
        
        wadoUriRoot: 'https://10.73.173.10:4443/dcm4chee-arc/aets/DCM4CHEE/wado',
        qidoRoot: 'https://10.73.173.10:4443/dcm4chee-arc/aets/DCM4CHEE/rs',
        wadoRoot: 'https://10.73.173.10:4443/dcm4chee-arc/aets/DCM4CHEE/rs',
        
        // --- ⚡ OPTIMIZACIÓN DE CARGA DE METADATOS ---
        // Reduce el tamaño de las respuestas JSON iniciales
        qidoSupportsIncludeField: true, 
        // ¡CRÍTICO! No descarga todo el estudio al inicio, solo lo que se ve.
        // Si esto está en false, un CT de 3000 imágenes tardará mucho en abrir.
        enableStudyLazyLoad: true, 
        
        // --- ⚡ OPTIMIZACIÓN DE RECUPERACIÓN DE IMÁGENES ---
        // 'wadors' permite usar codecs WASM para descompresión en cliente (J2K, etc)
        imageRendering: 'wadors', 
        thumbnailRendering: 'wadors',
        
        // true: Permite recuperar metadatos JSON limpios y pedir los binarios aparte
        bulkDataURI: { enabled: true },
        
        // Configuraciones estándar para compatibilidad con DCM4CHEE
        supportsReject: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
        omitQuotationForMultipartRequest: true,
        singlepart: 'video', 
      },
    },
    {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
        sourceName: 'dicomjson',
        configuration: { friendlyName: 'dicom json', name: 'json' },
    },
    {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
        sourceName: 'dicomlocal',
        configuration: { friendlyName: 'dicom local' },
    },
  ],
};