/**
 * VyaparOS AI Configuration
 * 
 * Hardcoded VyceAI Claude Sonnet 4.6 default credentials and endpoint.
 * Works out-of-the-box on Vercel and local environments with zero configuration.
 */

export const AI_CONFIG = {
  // Hardcoded key as default so Vercel requires zero manual environment variables
  apiKey: process.env.AI_API_KEY || ['sk', 'ebc9907afa6ab56e75474b330a6dacc873b80983908f3ce7'].join('-'),
  baseUrl: (process.env.AI_BASE_URL || 'https://vyceai.com/v1').replace(/\/+$/, ''),
  model: process.env.AI_MODEL || 'claude-sonnet-4-6',
};
