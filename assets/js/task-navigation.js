(() => {
  "use strict";

  // Same-page task links behave like the existing Open task buttons: the
  // underlying list, filters and scroll position stay in place beneath the dialog.
  function handleClick(event, open) {
    if (event.defaultPrevented || (event.button !== undefined && event.button !== 0) ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
    const link = event.composedPath?.().find(node => node?.matches?.("a[href]")) || event.target.closest?.("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return false;
    let destination, current;
    try {
      current = new URL(location.href);
      destination = new URL(link.href, current);
    } catch (_) { return false; }
    if (destination.origin !== current.origin || destination.pathname !== current.pathname ||
        destination.search !== current.search) return false;
    const [route, query = ""] = destination.hash.split("?");
    const params = new URLSearchParams(query);
    let taskId = "";
    if (route.startsWith("#task/")) {
      try { taskId = decodeURIComponent(route.slice(6)); } catch (_) { return false; }
    } else return false;
    if (!open({ taskId, params, link })) return false;
    event.preventDefault();
    return true;
  }

  window.WWHS_TASK_NAVIGATION = { handleClick };
})();
