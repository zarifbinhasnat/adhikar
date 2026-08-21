import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

const SHA256 = Crypto.CryptoDigestAlgorithm.SHA256;

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256OfFile(uri) {
  const bytes = await new File(uri).bytes();
  return toHex(await Crypto.digest(SHA256, bytes));
}

// The seal binds the content hash to when and where it was recorded, so
// changing the metadata later is detectable too, not only changing the file.
const sealInput = ({ contentHash, latitude, longitude, createdAt }) =>
  `${contentHash}|${latitude ?? ''},${longitude ?? ''}|${createdAt}`;

export async function sealEvidence({ fileUri, latitude, longitude, createdAt }) {
  const contentHash = await sha256OfFile(fileUri);
  const sealHash = await Crypto.digestStringAsync(
    SHA256,
    sealInput({ contentHash, latitude, longitude, createdAt }),
  );
  return { contentHash, sealHash, hashAlgorithm: 'SHA-256' };
}

/** @returns {'intact' | 'modified' | 'unverifiable'} */
export async function verifyEvidence(evidence) {
  if (!evidence?.fileUri || evidence.hashAlgorithm !== 'SHA-256') return 'unverifiable';
  try {
    const contentHash = await sha256OfFile(evidence.fileUri);
    if (contentHash !== evidence.contentHash) return 'modified';
    const sealHash = await Crypto.digestStringAsync(SHA256, sealInput({ ...evidence, contentHash }));
    return sealHash === evidence.sealHash ? 'intact' : 'modified';
  } catch {
    return 'unverifiable';
  }
}
