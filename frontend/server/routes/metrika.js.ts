import { defineEventHandler, setHeader } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const response = await fetch('https://mc.yandex.ru/metrika/tag.js');
    if (!response.ok) {
      throw new Error(`Yandex returned ${response.status}`);
    }
    const scriptContent = await response.text();

    // Cache the script for 24 hours on the edge/client
    setHeader(event, 'Content-Type', 'application/javascript; charset=utf-8');
    setHeader(event, 'Cache-Control', 'public, max-age=86400, s-maxage=86400');
    
    return scriptContent;
  } catch (err) {
    console.error('Failed to proxy Yandex Metrika:', err);
    setHeader(event, 'Content-Type', 'application/javascript; charset=utf-8');
    return 'console.warn("Metrika proxy failed");';
  }
});
