const RATE_SOURCES = [
  "https://api.frankfurter.app/latest?from=USD",
  "https://open.er-api.com/v6/latest/USD",
];
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedRates = null;
let cacheTime = 0;
let ratesRequest = null;

const normalizeCurrencyCode = (currency = "USD") =>
  String(currency || "USD").trim().toUpperCase() || "USD";

export const getUsdRates = async () => {
  if (cachedRates && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedRates;
  }

  if (ratesRequest) {
    return ratesRequest;
  }

  ratesRequest = (async () => {
    const errors = [];

    for (const source of RATE_SOURCES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(source, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          errors.push(`${source}: ${response.status}`);
          continue;
        }

        const payload = await response.json();
        const rates = payload?.rates;

        if (!rates || typeof rates !== "object") {
          errors.push(`${source}: invalid payload`);
          continue;
        }

        if (Object.keys(rates).length < 100) {
          errors.push(`${source}: limited currency coverage`);
          continue;
        }

        cachedRates = { USD: 1, ...rates };
        cacheTime = Date.now();
        return cachedRates;
      } catch (error) {
        errors.push(
          `${source}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    throw new Error(errors.join(" | ") || "Failed to load exchange rates");
  })();

  try {
    return await ratesRequest;
  } finally {
    ratesRequest = null;
  }
};

export const convertToUsd = (amount, currency, rates) => {
  const numericAmount = Number(amount);
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const rate = rates?.[normalizedCurrency];

  if (!Number.isFinite(numericAmount) || !rate) {
    return null;
  }

  return numericAmount / rate;
};

export const buildUsdPriceRange = async ({
  minPrice,
  maxPrice,
  filterCurrency = "USD",
}) => {
  if (!minPrice && !maxPrice) {
    return null;
  }

  const rates = await getUsdRates();
  const range = {};
  const minUsd = convertToUsd(minPrice, filterCurrency, rates);
  const maxUsd = convertToUsd(maxPrice, filterCurrency, rates);

  if (minPrice && minUsd !== null) {
    range.$gte = minUsd;
  }

  if (maxPrice && maxUsd !== null) {
    range.$lte = maxUsd;
  }

  return Object.keys(range).length ? range : null;
};
