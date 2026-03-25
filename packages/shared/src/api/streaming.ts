/**
 * Reads a plain-text streaming response from the /chat endpoint
 * and yields string chunks as they arrive.
 */
export async function* streamChat(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Collects a full streaming response into a single string.
 */
export async function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  let result = ''
  for await (const chunk of streamChat(stream)) {
    result += chunk
  }
  return result
}
