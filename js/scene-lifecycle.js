export function sceneLifecycle(stage, stopSpeech, cleanup) {
  const controller = new AbortController();
  const { signal } = controller;

  return {
    stage,
    signal,
    dispose() {
      if (signal.aborted) return;
      controller.abort();
      cleanup();
      stopSpeech();
    },
  };
}
