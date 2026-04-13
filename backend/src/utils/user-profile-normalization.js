function sanitizeToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

const restrictionAliases = new Map([
  ['sem-lactose', 'sem-lactose'],
  ['sem-lactose-', 'sem-lactose'],
  ['lactose-free', 'sem-lactose'],
  ['sem-gluten', 'sem-gluten'],
  ['sem-gluten-', 'sem-gluten'],
  ['gluten-free', 'sem-gluten'],
  ['vegetariano', 'vegetariano'],
  ['vegano', 'vegano'],
]);

function normalizeRestrictions(restrictions) {
  if (!Array.isArray(restrictions)) return [];

  const normalized = restrictions
    .map(sanitizeToken)
    .filter(Boolean)
    .map((value) => restrictionAliases.get(value) || value);

  return Array.from(new Set(normalized));
}

function normalizePreferences(preferences) {
  const safe = preferences && typeof preferences === 'object' ? preferences : {};

  return {
    vegetarian: !!safe.vegetarian,
    glutenFree: !!safe.glutenFree,
    lactoseFree: !!safe.lactoseFree,
  };
}

function normalizeUserProfile({ preferences, restrictions }) {
  const normalizedRestrictions = normalizeRestrictions(restrictions);
  const normalizedPreferences = normalizePreferences(preferences);

  // Restriction has higher priority than preference toggle.
  if (normalizedRestrictions.includes('sem-lactose')) {
    normalizedPreferences.lactoseFree = true;
  }

  if (normalizedRestrictions.includes('sem-gluten')) {
    normalizedPreferences.glutenFree = true;
  }

  if (
    normalizedRestrictions.includes('vegetariano') ||
    normalizedRestrictions.includes('vegano')
  ) {
    normalizedPreferences.vegetarian = true;
  }

  return {
    preferences: normalizedPreferences,
    restrictions: normalizedRestrictions,
  };
}

module.exports = {
  normalizeUserProfile,
};
