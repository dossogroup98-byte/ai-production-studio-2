export function getApiBaseUrl(): string {
  try {
    const raw = localStorage.getItem('ai_studio_backend_url');
    if (raw && raw.trim()) {
      return raw.trim().replace(/\/$/, '');
    }
  } catch (e) {
    console.error('Failed to read backend URL from storage:', e);
  }
  return '';
}

export function setApiBaseUrl(url: string) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem('ai_studio_backend_url');
    } else {
      localStorage.setItem('ai_studio_backend_url', url.trim().replace(/\/$/, ''));
    }
  } catch (e) {
    console.error('Failed to save backend URL to storage:', e);
  }
}
