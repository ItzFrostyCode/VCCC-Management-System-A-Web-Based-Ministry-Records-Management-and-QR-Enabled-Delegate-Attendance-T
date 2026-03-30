import { next } from '@vercel/edge';

export const config = {
  // Apply middleware to all standard UI routes
  matcher: ['/pastors.html', '/church.html', '/district.html', '/conferences.html', '/badges.html', '/scanner.html', '/admin_logs.html', '/disciples.html', '/assignment.html'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  
  // 1. Manually parse the Cookie header (Since request.cookies is undefined in standalone Vercel Edge Functions)
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...v] = c.trim().split('=');
      return [key, v.join('=')];
    })
  );

  const accessToken = cookies['sb-access-token'];

  // 2. Security Redirect
  // If there's no access token, immediately redirect to login (Zero FOUC)
  if (!accessToken) {
    url.pathname = '/login.html';
    return Response.redirect(url, 302);
  }

  // 3. Allow request to continue via the next() helper
  return next();
}
