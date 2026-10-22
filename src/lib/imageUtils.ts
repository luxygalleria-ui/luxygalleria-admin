/**
 * Image URL Utilities for Admin Panel
 * Handles image URL construction with proper backend path resolution
 */

/**
 * Get full image URL from backend path or remote URL
 * @param imagePath - Image path or URL from API (e.g., "/uploads/image.jpg" or "https://...")
 * @returns Full image URL ready for img src
 */
export const getImageUrl = (imagePath: string | undefined | null): string => {
  // Handle missing/null/empty paths
  if (!imagePath || imagePath.trim() === '') {
    return getPlaceholderUrl('No image available');
  }

  // Already a full URL (http/https)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Backend uploads path
  if (imagePath.startsWith('/uploads/')) {
    const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    const baseUrl = rawUrl 
      ? rawUrl.replace(/\/api(\/v1)?\/?$/i, '').replace(/\/+$/, '')
      : 'http://localhost:5000';
    return `${baseUrl}${imagePath}`;
  }

  // Data URL (base64 or inline SVG)
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Other root-relative paths are local public assets (e.g. /luxy_logo.png)
  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  // Fallback to placeholder for unrecognized formats
  return getPlaceholderUrl('No image');
};

/**
 * Get placeholder URL with optional message.
 * Returns a self-contained inline SVG data URI so it always renders — no
 * dependency on any external placeholder service (which can be down/blocked).
 * @param message - Optional message to display
 * @returns Placeholder image data URI
 */
export const getPlaceholderUrl = (message: string = 'No image'): string => {
  const label = (message || 'No image').replace(/[<>&"']/g, ' ').slice(0, 30);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#f8fafc"/>
  <g fill="none" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="95" y="102" width="110" height="86" rx="10"/>
    <circle cx="126" cy="132" r="9"/>
    <path d="M108 184 L140 156 L160 173 L180 152 L196 166"/>
  </g>
  <text x="150" y="226" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#94a3b8" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Handle image error with fallback
 * @param event - Image element event
 * @param fallbackUrl - URL to use on error
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string
): void => {
  const img = event.currentTarget;
  const fallback = fallbackUrl || getPlaceholderUrl('Image unavailable');

  // Already showing the fallback or inline SVG — stop here to avoid recursion
  if (img.src === fallback || img.src.startsWith('data:image/svg+xml')) {
    return;
  }

  // Remove srcset/sizes so Next Image or responsive browsers don't re-query failed sources
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  img.onerror = null;
  img.src = fallback;
};

/**
 * Get safe image URL with fallback
 * @param primaryPath - Primary image path
 * @param fallbackPath - Fallback image path if primary fails
 * @returns Primary URL or fallback URL
 */
export const getSafeImageUrl = (
  primaryPath: string | undefined,
  fallbackPath?: string | undefined
): string => {
  const primary = getImageUrl(primaryPath);
  
  // If primary looks like an error placeholder, try fallback
  if (primary.includes('data:image/svg+xml') && fallbackPath) {
    const fallback = getImageUrl(fallbackPath);
    if (!fallback.includes('data:image/svg+xml')) {
      return fallback;
    }
  }
  
  return primary;
};

// Export all utilities
const imageUtils = {
  getImageUrl,
  getPlaceholderUrl,
  handleImageError,
  getSafeImageUrl,
};

export default imageUtils;