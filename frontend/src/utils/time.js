export const timeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    // Add 'Z' to force UTC if it's missing, aligning with your Python backend
    const pastUTC = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z'); 

    const diffInSeconds = Math.floor((now - pastUTC) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};