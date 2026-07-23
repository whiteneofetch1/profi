import { defineEventHandler, sendRedirect, getRequestHeader } from 'h3';

export default defineEventHandler((event) => {
  const reqUrl = event.node.req.url || '/';
  const host = getRequestHeader(event, 'host') || '';

  // 1. Redirect WWW to non-WWW (301 Permanent Redirect)
  if (host.startsWith('www.')) {
    const cleanHost = host.replace(/^www\./, '');
    return sendRedirect(event, `https://${cleanHost}${reqUrl}`, 301);
  }

  // 2. Redirect /index.html or /index.php to / (301 Permanent Redirect)
  if (reqUrl.startsWith('/index.html') || reqUrl.startsWith('/index.php')) {
    const queryPart = reqUrl.includes('?') ? '?' + reqUrl.split('?')[1] : '';
    return sendRedirect(event, '/' + queryPart, 301);
  }

  // 3. Normalize multiple consecutive slashes (e.g. ///// -> /) (301 Permanent Redirect)
  if (reqUrl.length > 1 && reqUrl.includes('//')) {
    const cleanUrl = reqUrl.replace(/\/+/g, '/');
    return sendRedirect(event, cleanUrl, 301);
  }

  // 4. Trailing Slash Normalization (e.g. /blog/ -> /blog) (301 Permanent Redirect)
  const [pathname, search] = reqUrl.split('?');
  if (pathname.length > 1 && pathname.endsWith('/') && !pathname.includes('.')) {
    const cleanPathname = pathname.replace(/\/+$/, '');
    const targetUrl = search ? `${cleanPathname}?${search}` : cleanPathname;
    return sendRedirect(event, targetUrl, 301);
  }
});
