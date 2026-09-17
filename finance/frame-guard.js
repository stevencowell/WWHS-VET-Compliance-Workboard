// The password entry and unlocked workspace must only run as a full page.
if (window.self !== window.top) {
  document.documentElement.setAttribute('data-framed', 'true');
}
