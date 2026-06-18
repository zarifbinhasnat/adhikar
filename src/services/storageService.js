/**
 * storageService.js
 * -----------------
 * Centralised persistence layer for evidence data.
 *
 * WHY THIS EXISTS:
 *   Every screen that needs evidence currently does its own ad-hoc
 *   state management.  By routing everything through this service we get:
 *
 *   1. A single source of truth for evidence CRUD.
 *   2. A clean seam for a future backend migration — swap the internals
 *      of these functions (e.g. to Supabase, Firebase, or a REST API)
 *      without touching any screen code.
 *   3. Consistent error handling and logging.
 *
 * STORAGE KEY SCHEMA (AsyncStorage):
 *   @evidence_vault  →  JSON array of Evidence objects
 *
 * Evidence object shape:
 *   {
 *     id:        string   — unique, typically Date.now().toString()
 *     type:      string   — 'video' | 'audio' | 'photo'
 *     fileUri:   string   — local file:// URI
 *     note:      string   — user-supplied note
 *     latitude:  number | null
 *     longitude: number | null
 *     hash:      string   — integrity hash of the raw content
 *     createdAt: string   — ISO-8601 timestamp
 *   }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@evidence_vault';

/* ------------------------------------------------------------------ */
/*  READ                                                               */
/* ------------------------------------------------------------------ */

/**
 * Retrieve every saved evidence record.
 * @returns {Promise<Array>} — resolves to an array (never null).
 */
export async function getAllEvidence() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[storageService] getAllEvidence failed:', error);
    return [];
  }
}

/**
 * Retrieve a single evidence record by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getEvidenceById(id) {
  const list = await getAllEvidence();
  return list.find((e) => e.id === id) || null;
}

/* ------------------------------------------------------------------ */
/*  WRITE                                                              */
/* ------------------------------------------------------------------ */

/**
 * Persist the full evidence list (internal helper).
 * @param {Array} list
 */
async function _persist(list) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Add a new evidence record.  Prepends to the list (newest first).
 * @param {Object} evidence — must include at least { id, type, createdAt }.
 * @returns {Promise<Array>} — the updated full list.
 */
export async function addEvidence(evidence) {
  try {
    const list = await getAllEvidence();
    const updated = [evidence, ...list];
    await _persist(updated);
    return updated;
  } catch (error) {
    console.error('[storageService] addEvidence failed:', error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE                                                             */
/* ------------------------------------------------------------------ */

/**
 * Remove an evidence record by ID.
 * @param {string} id
 * @returns {Promise<Array>} — the updated full list.
 */
export async function deleteEvidence(id) {
  try {
    const list = await getAllEvidence();
    const updated = list.filter((e) => e.id !== id);
    await _persist(updated);
    return updated;
  } catch (error) {
    console.error('[storageService] deleteEvidence failed:', error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  BULK                                                               */
/* ------------------------------------------------------------------ */

/**
 * Replace the entire vault (useful for sync / import scenarios).
 * @param {Array} list
 */
export async function replaceAllEvidence(list) {
  try {
    await _persist(list);
  } catch (error) {
    console.error('[storageService] replaceAllEvidence failed:', error);
    throw error;
  }
}

/**
 * Nuke everything (dev / testing only).
 */
export async function clearAllEvidence() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[storageService] clearAllEvidence failed:', error);
  }
}
