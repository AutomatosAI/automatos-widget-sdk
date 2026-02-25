export const animationCSS = /* css */ `
@keyframes aw-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes aw-typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}

@keyframes aw-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(255, 59, 48, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .aw-panel {
    width: calc(100vw - 16px) !important;
    max-height: calc(100vh - 100px) !important;
    bottom: 64px !important;
    right: 8px !important;
    left: 8px !important;
    border-radius: 12px !important;
  }

  .aw-fab {
    width: 48px !important;
    height: 48px !important;
  }

  .aw-fab svg {
    width: 20px;
    height: 20px;
  }
}
`;
