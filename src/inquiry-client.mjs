export function canUseInquiryApi(protocol = globalThis.location?.protocol) {
  return protocol === 'http:' || protocol === 'https:';
}

function parseEvent(block) {
  let event = 'message';
  const data = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  return { event, data: JSON.parse(data.join('\n')) };
}

export async function requestInquiry(input, handlers = {}, fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/inquiry', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Inquiry API returned HTTP ${response.status}`);
  if (!response.body) throw new Error('Inquiry API returned no response stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  async function consume(block) {
    const parsed = parseEvent(block);
    if (!parsed) return;
    if (parsed.event === 'result') result = parsed.data;
    if (parsed.event === 'error') throw new Error(parsed.data?.message || 'Inquiry failed');
    if (typeof handlers[parsed.event] === 'function') await handlers[parsed.event](parsed.data);
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      await consume(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
    if (done) break;
  }
  if (buffer.trim()) await consume(buffer.trim());
  if (!result) throw new Error('Inquiry API completed without a result');
  return result;
}
