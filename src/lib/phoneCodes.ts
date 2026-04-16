// Shared in-memory store for pending phone verification codes.
// Lives in the server process — codes expire after 10 minutes.
export const pendingCodes = new Map<string, { code: string; expiresAt: number }>();
