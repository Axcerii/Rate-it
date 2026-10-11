// Public contact details of the site, shown on the legal pages.
// Set at build time through NEXT_PUBLIC_CONTACT_EMAIL and NEXT_PUBLIC_TWITTER_HANDLE (see
// .env.production.example); the values below are used when they are not defined.

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'malezethp@gmail.com';

// Without the leading "@"
export const TWITTER_HANDLE = (process.env.NEXT_PUBLIC_TWITTER_HANDLE?.trim() || 'ryrynoceros').replace(/^@/, '');
export const TWITTER_URL = `https://twitter.com/${TWITTER_HANDLE}`;
