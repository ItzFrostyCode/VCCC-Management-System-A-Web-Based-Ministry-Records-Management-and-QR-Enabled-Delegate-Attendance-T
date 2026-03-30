export const config = {
  // Apply middleware to all standard UI routes
  matcher: ['/dashboard.html', '/pastors.html', '/church.html', '/district.html', '/conferences.html', '/badges.html', '/scanner.html', '/admin_logs.html', '/disciples.html', '/assignment.html', '/index.html', '/'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  
  // Get the tokens from cookies (set by auth.service.js)
  const accessToken = request.cookies.get('sb-access-token');

  // If there's no access token, immediately redirect to login (Zero FOUC)
  if (!accessToken) {
    url.pathname = '/login.html';
    return Response.redirect(url, 302);
  }

  // If token exists, allow the file to load.
  // Native Supabase checks will still run client-side in requireAuth() to ensure expiration and validity
  return Response.next();
}
