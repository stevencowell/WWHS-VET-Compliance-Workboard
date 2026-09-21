// Ephemeral loading state only. Never read, write or recover saved work here.
(() => {
  const root = document.documentElement;
  const requestedUrl = location.href;
  root.dataset.workspaceBoot = 'loading';
  const suspendedDialogs = new Set();
  let failedDialogObserver;
  const timer = setTimeout(fail, 10000);

  function fail() {
    if (root.dataset.workspaceBoot !== 'loading') return;
    clearTimeout(timer);
    root.dataset.workspaceBoot = 'failed';
    // A direct task link can open a modal before the shared layout is ready.
    // Close that untouched modal so it cannot make the retry link inert.
    function suspendDialogs() {
      for (const dialog of document.querySelectorAll('dialog[open]')) {
        suspendedDialogs.add(dialog);
        dialog.close();
      }
    }
    suspendDialogs();
    // A native script may itself arrive after the timeout. Its initial task
    // dialog must not disable Retry while the rest of the page is still failed.
    failedDialogObserver = new MutationObserver(suspendDialogs);
    failedDialogObserver.observe(root, {subtree:true, childList:true, attributes:true, attributeFilter:['open']});
  }

  function onError(event) {
    if (event.target?.hasAttribute?.('data-workspace-entry')) fail();
  }
  window.addEventListener('error', onError, true);
  window.WWHS_WORKSPACE_BOOT = {
    fail,
    retry() {
      // Native task routes replace their hash when opening a dialog. Retry the
      // original destination, so a failed shared module does not lose the task.
      history.replaceState(history.state, '', requestedUrl);
      location.reload();
    },
    ready() {
      // A failed native app must not expose a working-looking empty workboard.
      const routeReady = location.hash === '#my-work'
        ? document.querySelector('.workspace-home:not([hidden]) summary-import')
        : document.querySelector('#route-content > *');
      if (!window.WWHS_WORKBOARD_ADAPTER || !routeReady ||
          !document.querySelector('.workspace-header') || !document.querySelector('.workspace-team-banner') ||
          !document.querySelector('.workspace-specialist') || !document.querySelector('.workspace-register-link')) {
        fail();
        return;
      }
      clearTimeout(timer);
      failedDialogObserver?.disconnect();
      window.removeEventListener('error', onError, true);
      root.dataset.workspaceBoot = 'ready';
      document.getElementById('workspace-loading')?.remove();
      // A slow successful load can recover after the retry message appeared.
      for (const dialog of suspendedDialogs) if (dialog.isConnected && !dialog.open) dialog.showModal();
      suspendedDialogs.clear();
    }
  };
})();
