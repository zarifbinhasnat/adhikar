import { hubFetch } from '../config';

const MIME = { mov: 'video/quicktime', mp4: 'video/mp4', m4a: 'audio/mp4', jpg: 'image/jpeg' };

/** Sends the original recording to the laptop hub, which re-hashes it and returns a receipt. */
export async function uploadEvidence(evidence) {
  const ext = (evidence.fileUri.split('.').pop() || 'bin').toLowerCase();
  const form = new FormData();
  form.append('file', {
    uri: evidence.fileUri,
    name: `${evidence.id}.${ext}`,
    type: MIME[ext] || 'application/octet-stream',
  });
  form.append('id', evidence.id);
  form.append('contentHash', evidence.contentHash);
  form.append('metadata', JSON.stringify({
    note: evidence.note,
    witnesses: evidence.witnesses,
    latitude: evidence.latitude,
    longitude: evidence.longitude,
    createdAt: evidence.createdAt,
    sealHash: evidence.sealHash,
  }));
  const res = await hubFetch('/evidence', { method: 'POST', body: form }, 120000);
  return res.json();
}
