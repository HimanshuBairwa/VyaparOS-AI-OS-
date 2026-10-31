async function check() {
  const baseUrl = process.env.AI_BASE_URL || 'https://vyceai.com/v1';
  const apiKey = process.env.AI_API_KEY || 'sk-ebc9907afa6ab56e75474b330a6dacc873b80983908f3ce7';

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await res.json();
    if (data.data) {
      console.log('Available models:', data.data.map((m: any) => m.id));
    } else {
      console.log('Models response:', data);
    }

    // Test a simple chat completion with top candidate models
    const testModels = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'llama-3.1-70b', 'deepseek-chat'];
    for (const model of testModels) {
      try {
        const testRes = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Reply with "OK" if you work.' }],
            max_tokens: 10,
          }),
        });

        const testJson = await testRes.json();
        if (testJson.choices && testJson.choices[0]) {
          console.log(`✅ Model ${model} works! Output:`, testJson.choices[0].message?.content?.trim());
        } else {
          console.log(`❌ Model ${model} failed:`, testJson.error || testJson);
        }
      } catch (e: any) {
        console.log(`❌ Model ${model} error:`, e.message);
      }
    }
  } catch (err: any) {
    console.error('Check failed:', err);
  }
}

check();
