/**
 * NoCharity Ingestion Framework — People Normalizer
 */

import { createNormalizedPerson } from './schemas.js';

export function normalizePerson(raw) {
  if (!raw) return null;

  const rawName = String(raw.canonical_name || raw.name || '').trim();
  if (!rawName) return null;

  // Split name if first_name / last_name not explicitly provided
  let firstName = raw.first_name || null;
  let lastName = raw.last_name || null;

  if (!firstName && !lastName) {
    const parts = rawName.split(/\s+/);
    if (parts.length === 1) {
      lastName = parts[0];
    } else if (parts.length === 2) {
      firstName = parts[0];
      lastName = parts[1];
    } else {
      firstName = parts.slice(0, -1).join(' ');
      lastName = parts[parts.length - 1];
    }
  }

  // Deduplicate and clean aliases
  const aliases = new Set();
  if (Array.isArray(raw.aliases)) {
    raw.aliases.forEach(a => a && aliases.add(String(a).trim()));
  }
  if (raw.alias) aliases.add(String(raw.alias).trim());

  return createNormalizedPerson({
    canonical_name: rawName,
    first_name: firstName,
    last_name: lastName,
    aliases: Array.from(aliases),
    country: raw.country || null,
    birth_date: raw.birth_date || raw.birthDate || null,
    occupation: raw.occupation || null,
    industry: raw.industry || null,
    description: raw.description || raw.summary || null,
    is_billionaire: raw.is_billionaire !== undefined ? raw.is_billionaire : true,
    identifiers: raw.identifiers || {}
  });
}
