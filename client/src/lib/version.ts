// Read version from package.json
// Since we can't directly import package.json in the browser, 
// we'll create a simple endpoint to serve the version

let cachedVersion: string | null = null;

export async function getAppVersion(): Promise<string> {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const response = await fetch('/api/version');
    if (response.ok) {
      const data = await response.json();
      cachedVersion = data.version;
      return cachedVersion!; // We know it's not null here
    }
  } catch (error) {
    console.warn('Failed to fetch app version:', error);
  }

  // Fallback to unknown if API fails
  return 'unknown';
}

export function useAppVersion(): string {
  // Return unknown - component should use getAppVersion() for proper API fetching
  // This can be enhanced with React hooks for real-time updates
  return 'unknown';
}