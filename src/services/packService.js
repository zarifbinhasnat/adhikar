import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { hubFetch } from '../config';

const INSTALLED_KEY = '@packs_installed';
const packKey = (id) => `@pack:${id}`;
const sha256 = (text) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

export async function fetchCatalog() {
  const res = await hubFetch('/packs', {}, 5000);
  return res.json();
}

export async function getInstalled() {
  try {
    return JSON.parse((await AsyncStorage.getItem(INSTALLED_KEY)) || '{}');
  } catch {
    return {};
  }
}

async function saveInstalled(installed) {
  await AsyncStorage.setItem(INSTALLED_KEY, JSON.stringify(installed));
}

/** Downloads a pack, refuses it unless its SHA-256 matches the catalogue, and stores it on the phone. */
export async function downloadPack(meta) {
  const res = await hubFetch(`/packs/${meta.id}`, {}, 30000);
  const text = await res.text();
  if ((await sha256(text)) !== meta.sha256) {
    throw new Error('Checksum mismatch: the download was corrupted or altered.');
  }
  await AsyncStorage.setItem(packKey(meta.id), text);
  const installed = await getInstalled();
  installed[meta.id] = { ...meta, installedAt: new Date().toISOString() };
  await saveInstalled(installed);
  return installed;
}

export async function readPack(id) {
  const text = await AsyncStorage.getItem(packKey(id));
  return text ? JSON.parse(text) : null;
}

export async function verifyInstalledPack(id) {
  const [installed, text] = await Promise.all([getInstalled(), AsyncStorage.getItem(packKey(id))]);
  return Boolean(text && installed[id] && (await sha256(text)) === installed[id].sha256);
}

export async function removePack(id) {
  await AsyncStorage.removeItem(packKey(id));
  const installed = await getInstalled();
  delete installed[id];
  await saveInstalled(installed);
  return installed;
}

function toPlainText(pack) {
  const lines = [pack.title_en, pack.title_bn, ''];
  for (const act of pack.acts) {
    lines.push('='.repeat(60), act.name, `Source: ${act.source_url} (${act.snapshot})`, '='.repeat(60), '');
    for (const s of act.sections) {
      lines.push(`${s.section_label}. ${s.title}`.trim(), s.text);
      for (const note of s.amendments || []) lines.push(`  [Note: ${note}]`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

/** Shares the pack's statutory text as a plain-text file (Files, AirDrop, Messages, print…). */
export async function exportPack(id) {
  const pack = await readPack(id);
  if (!pack) throw new Error('Pack is not downloaded.');
  const text = toPlainText(pack);
  const name = `Adhikar-${id}.txt`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', UTI: 'public.plain-text', dialogTitle: name });
}
