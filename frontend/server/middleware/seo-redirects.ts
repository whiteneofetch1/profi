import { defineEventHandler, sendRedirect, getRequestHeader } from 'h3';

export default defineEventHandler((event) => {
  const reqUrl = event.node.req.url || '/';
  const host = getRequestHeader(event, 'host') || '';

  // 1. Redirect WWW to non-WWW (301 Permanent Redirect)
  if (host.startsWith('www.')) {
    const cleanHost = host.replace(/^www\./, '');
    return sendRedirect(event, `https://${cleanHost}${reqUrl}`, 301);
  }

  // 2. Redirect /index.html to / (301 Permanent Redirect)
  if (reqUrl.startsWith('/index.html')) {
    const queryPart = reqUrl.includes('?') ? '?' + reqUrl.split('?')[1] : '';
    return sendRedirect(event, '/' + queryPart, 301);
  }

  // 3. Normalize multiple trailing slashes (e.g. ///// -> /) (301 Permanent Redirect)
  if (reqUrl.length > 1 && reqUrl.includes('//')) {
    const cleanUrl = reqUrl.replace(/\/+/g, '/');
    return sendRedirect(event, cleanUrl, 301);
  }
});
