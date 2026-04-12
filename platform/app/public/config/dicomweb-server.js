/** @type {AppTypes.Config} */
window.config = {
  // === CAMBIO CRÍTICO 1: Decirle a OHIF que vive en /viewer ===
  routerBasename: '/viewer',
  siteName: 'Tu Nuevo Título',
  extensions: [],
  modes: [],
  showStudyList: true,
  showPatientInfo: 'visibleReadOnly', // siempre visible y expandido


  // --- OPTIMIZACIÓN RENDIMIENTO GLOBAL ---
  useNorm16Texture: true,
  strictZSpacingForVolumeViewport: false,

  // Cache grande (3GB) para que estudios grandes + previos quepan sin evictions.
  // Default de cornerstone es 1GB, insuficiente para CT de 1000+ cortes con prior.
  maxCacheSize: 3221225472, // 3 GB

  // Workers de decodificación DICOM: el bottleneck en intranet es la CPU.
  // Con 6 workers, el óptimo de `maxNumRequests` es ~2× para que el pool
  // mantenga los workers alimentados sin saturar memoria.
  maxNumberOfWebWorkers: 6,

  // IMPORTANTE: valores anteriores (100/75/10) causaban starvation del event loop.
  // Con 6 workers, más de ~12 requests simultáneas solo se acumulan en la queue
  // consumiendo memoria y disparando GC pauses que freezean la UI.
  maxNumRequests: {
    interaction: 12,
    thumbnail: 6,
    prefetch: 10,
    compute: 6,
  },
  
  // --- OPTIMIZACIONES VISUALES Y DE CARGA ---
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  defaultDataSourceName: 'dicomweb',

  // ---- No mostrar cartel de solo uso para investigación
  investigationalUseDialog: {
    option: 'never',
  },

  // --- PERSONALIZACIÓN (LOGO) ---
  whiteLabeling: {
    createLogoComponentFn: function(React) {
      return React.createElement(
        'a',
        {
          target: '_self',
          rel: 'noopener noreferrer',
          className: 'header-brand',
          // Al hacer clic en el logo, volvemos a HEROS (la raíz)
          href: '', 
          style: { 
            display: 'flex', 
            alignItems: 'center',
            textDecoration: 'none',
            color: '#9CC7F7' 
          }
        },
        React.createElement('img', {
          // === CAMBIO RECOMENDADO: Ruta absoluta incluyendo /viewer/ para que cargue la imagen ===
          src: '/viewer/logo-institucion-gray.png', 
          style: { 
            maxWidth: '180px',
            height: '45px',
            marginRight: '10px'
          }
        })
      );
    }
  },
  
oidc: [
    {
        // 1. Authority: ABSOLUTA (Obligatorio porque Keycloak está en otro subdominio)
        authority: 'https://dicomsecurity.intranet.intecnus.org.ar/realms/dcm4che',
        
        client_id: 'ohif-viewer', // Asegurate que en Keycloak se llame EXACTAMENTE así
        
        // 2. Redirect URI: Relativa a la raíz del dominio
        // Esta es la ruta que OHIF espera internamente.
        redirect_uri: '/viewer/callback', 
        
        response_type: 'code',
        scope: 'openid email profile', // Agrega 'email profile' para ver tu nombre en el visor
        
        // 3. Logout: Debería devolverte al inicio del visor, no a la nada
        post_logout_redirect_uri: '/viewer/', 
        
        revoke_access_token_on_logout: true,
        extraQueryParams: { ui_locales: 'es' },
    },
],
  investigationalUseDialog: {
    option: 'never',
  },
  showPatientInfo: 'visible',
  // --- FUENTES DE DATOS (DCM4CHEE) ---
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'DCM4CHEE Proxy',
        name: 'DCM4CHEE',
        
        // Estas rutas siguen igual porque son absolutas relativas al dominio
        wadoUriRoot: '/dcm4chee-arc/aets/DCM4CHEE/wado',
        qidoRoot: '/dcm4chee-arc/aets/DCM4CHEE/rs',
        wadoRoot: '/dcm4chee-arc/aets/DCM4CHEE/rs',
        
        qidoSupportsIncludeField: true,
        supportsReject: true,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
        
        omitQuotationForMultipartRequest: true,
        singlepart: false, 
        bulkDataURI: {
            enabled: true,
        },
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