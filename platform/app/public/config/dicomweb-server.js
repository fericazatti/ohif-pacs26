/** @type {AppTypes.Config} */
window.config = {
  routerBasename: '/',
  extensions: [],
  modes: [],
  showStudyList: true,

  // --- OPTIMIZACIÓN RENDIMIENTO GLOBAL ---
  useNorm16Texture: true,
  strictZSpacingForVolumeViewport: true,
  
  maxNumRequests: {
    interaction: 100,
    thumbnail: 75,
    prefetch: 10,
  },
  
  // --- OPTIMIZACIONES VISUALES Y DE CARGA ---
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  defaultDataSourceName: 'dicomweb',

  // --- PERSONALIZACIÓN (LOGO) ---
  whiteLabeling: {
    createLogoComponentFn: function(React) {
      return React.createElement(
        'a',
        {
          target: '_self',
          rel: 'noopener noreferrer',
          className: 'header-brand',
          href: '/',
          style: { 
            display: 'flex', 
            alignItems: 'center',
            textDecoration: 'none',
            color: '#9CC7F7' 
          }
        },
        React.createElement('img', {
          // Asegúrate que este archivo esté en platform/app/public/
          src: '/logo-institucion-gray.png', 
          style: { 
            maxWidth: '180px',
            height: '45px',
            marginRight: '10px'
          }
        })
      );
    }
  },
  
  // --- AUTENTICACIÓN (KEYCLOAK) ---
  // Ruta relativa '/realms/' -> Nginx Proxy -> Keycloak:8843
  oidc: [
    {
      authority: '/realms/dcm4che', 
      client_id: 'ohif-viewer',
      redirect_uri: '/callback',
      response_type: 'code',
      scope: 'openid',
      post_logout_redirect_uri: '/',
      revoke_access_token_on_logout: true,
    },
  ],

  // --- FUENTES DE DATOS (DCM4CHEE) ---
  // Ruta relativa '/dcm4chee-arc/' -> Nginx Proxy -> PACS:8443
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'DCM4CHEE Proxy',
        name: 'DCM4CHEE',
        
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
        
        // Configuraciones críticas para compatibilidad con DCM4CHEE
        omitQuotationForMultipartRequest: true,
        singlepart: 'video', 
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