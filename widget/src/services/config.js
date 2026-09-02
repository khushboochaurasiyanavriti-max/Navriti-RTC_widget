let serverUrl = "";

export function initializeConfig(url) {
  serverUrl = url.replace(/\/$/, "");
}

export function getServerUrl() {
  return serverUrl;
}