async function transcribeAudio(buffer, mimetype) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not set');

  const res = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&detect_language=true', {
    method: 'POST',
    headers: {
      Authorization: 'Token ' + apiKey,
      'Content-Type': mimetype || 'audio/ogg',
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Deepgram error ' + res.status + ': ' + text.slice(0, 300));
  }

  const data = await res.json();
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (!transcript) throw new Error('Deepgram returned no transcript');
  return transcript;
}

module.exports = { transcribeAudio };
