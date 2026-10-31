async function inspect() {
  const baseUrl = 'https://vyceai.com/v1';
  const apiKey = 'sk-ebc9907afa6ab56e75474b330a6dacc873b80983908f3ce7';

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('First 500 chars of body:', text.slice(0, 500));
  } catch (err: any) {
    console.error('Inspect error:', err);
  }
}

inspect();
