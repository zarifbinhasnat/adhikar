import { fetch as streamingFetch } from 'expo/fetch';
import { HUB_URL } from '../config';

/**
 * Streams the hub's server-sent events for a question, calling onEvent for each
 * ({type: 'emergency' | 'card' | 'sources' | 'delta' | 'done', ...}).
 */
export async function ask(question, onEvent, signal) {
  const res = await streamingFetch(`${HUB_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!res.ok) throw new Error(`Hub responded ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (chunk.startsWith('data: ')) onEvent(JSON.parse(chunk.slice(6)));
    }
  }
}
