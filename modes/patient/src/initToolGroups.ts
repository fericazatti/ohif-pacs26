/**
 * Modo paciente: tool group minimo.
 * Solo navegacion (StackScroll, Pan, Zoom) y ajuste de brillo (WindowLevel).
 * No registra herramientas de medicion, anotacion, MPR, ni segmentacion.
 */
function initDefaultToolGroup(extensionManager, toolGroupService, _commandsManager, toolGroupId) {
  const utilityModule = extensionManager.getModuleEntry(
    '@ohif/extension-cornerstone.utilityModule.tools'
  );

  const { toolNames, Enums } = utilityModule.exports;

  const tools = {
    active: [
      {
        toolName: toolNames.StackScroll,
        bindings: [
          { mouseButton: Enums.MouseBindings.Primary },
          { mouseButton: Enums.MouseBindings.Wheel },
          { numTouchPoints: 3 },
        ],
      },
      {
        toolName: toolNames.Pan,
        bindings: [{ mouseButton: Enums.MouseBindings.Auxiliary }],
      },
      {
        toolName: toolNames.Zoom,
        bindings: [{ mouseButton: Enums.MouseBindings.Secondary }, { numTouchPoints: 2 }],
      },
    ],
    passive: [
      { toolName: toolNames.WindowLevel },
    ],
    enabled: [
      { toolName: toolNames.ImageOverlayViewer },
    ],
  };

  toolGroupService.createToolGroupAndAddTools(toolGroupId, tools);
}

function initToolGroups(extensionManager, toolGroupService, commandsManager) {
  initDefaultToolGroup(extensionManager, toolGroupService, commandsManager, 'default');
}

export default initToolGroups;
