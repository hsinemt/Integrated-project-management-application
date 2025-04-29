/**
 * API Configuration
 * Centralizes API URL and other configuration settings
 */

// API base URL
export const API_URL = 'http://localhost:9777';

// Function to resolve avatar URLs
export const getFullAvatarUrl = (avatarPath: string | undefined): string => {
    if (!avatarPath) return '';

    // If the avatar is already a full URL (starts with http or https), return it as is
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
    }

    // If the avatar is a relative path starting with /uploads, prepend the API URL
    if (avatarPath.startsWith('/uploads/')) {
        return `${API_URL}${avatarPath}`;
    }

    // Otherwise, return the original path
    return avatarPath;
};