/**
 * IP Geolocation Utility
 * Uses ip-api.com (free, no API key needed, 45 req/min)
 * Returns country code from IP address
 */

// Caribbean country codes
const CARIBBEAN_COUNTRIES = new Set([
  'AG', // Antigua and Barbuda
  'BB', // Barbados
  'BS', // Bahamas
  'BL', // Saint Barthélemy
  'BQ', // Bonaire, Sint Eustatius and Saba
  'CU', // Cuba
  'DM', // Dominica
  'DO', // Dominican Republic
  'GD', // Grenada
  'GP', // Guadeloupe
  'HT', // Haiti
  'JM', // Jamaica
  'KN', // Saint Kitts and Nevis
  'KY', // Cayman Islands
  'LC', // Saint Lucia
  'MF', // Saint Martin
  'MQ', // Martinique
  'MS', // Montserrat
  'PR', // Puerto Rico
  'SX', // Sint Maarten
  'TC', // Turks and Caicos Islands
  'TT', // Trinidad and Tobago
  'VC', // Saint Vincent and the Grenadines
  'VG', // British Virgin Islands
  'VI', // US Virgin Islands
  'AW', // Aruba
  'CW', // Curaçao
]);

/**
 * Get real IP from request (handles proxies/load balancers)
 */
export const getIpFromRequest = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || null;
};

/**
 * Check if an IP is from the Caribbean
 * Returns { isCaribbean: boolean, country: string, countryCode: string }
 */
export const checkIfCaribbean = async (ip) => {
  // Skip for localhost/private IPs during development
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  ) {
    return { isCaribbean: true, country: 'Local', countryCode: 'LOCAL' };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`);
    const data = await response.json();

    if (data.status !== 'success') {
      // If lookup fails, default to Caribbean (don't block inquiry)
      return { isCaribbean: true, country: 'Unknown', countryCode: 'XX' };
    }

    return {
      isCaribbean: CARIBBEAN_COUNTRIES.has(data.countryCode),
      country: data.country,
      countryCode: data.countryCode,
    };
  } catch {
    // On error, default to Caribbean (don't block inquiry)
    return { isCaribbean: true, country: 'Unknown', countryCode: 'XX' };
  }
};