import ipaddr from 'ipaddr.js';
import dns from 'dns/promises';

/**
 * Validates if an IP address is a public, safe IP.
 * Rejects localhost, loopback, private IPv4/IPv6, link-local, multicast, etc.
 */
function isSafeIp(ipString: string): boolean {
  try {
    const ip = ipaddr.parse(ipString);
    const range = ip.range();

    // 'unicast' is typically the only safe range for public internet routing.
    // ipaddr.js classifies ranges like 'private', 'loopback', 'linkLocal', 'multicast', 'unspecified', etc.
    if (range === 'unicast') {
      return true;
    }
    
    // IPv6 might have different classifications, but generally we want to ensure it's not private
    if (ip.kind() === 'ipv6') {
      // Allow IPv4-mapped IPv6 if the mapped IPv4 is safe
      const ipv6 = ip as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) {
         return isSafeIp(ipv6.toIPv4Address().toString());
      }
      
      // Some public IPv6 addresses return unicast
      if ((range as string) === 'unicast') {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Validates the image URL by performing DNS resolution (SSRF protection),
 * following redirects safely (max 3), checking Content-Type, and size.
 */
export async function validateImageUrl(url: string, redirectCount = 0): Promise<boolean> {
  if (redirectCount > 3) {
    console.warn(`[ImageValidator] Max redirects exceeded for ${url}`);
    return false;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return false;
  }

  // Check for embedded credentials
  if (parsedUrl.username || parsedUrl.password) {
    return false;
  }

  try {
    // 1. Resolve DNS to protect against SSRF (DNS rebinding is still a risk, but this is a good baseline)
    const hostname = parsedUrl.hostname;
    
    // If it's already an IP, check it directly
    if (ipaddr.isValid(hostname)) {
      if (!isSafeIp(hostname)) return false;
    } else {
      // Resolve hostname
      const lookupResult = await dns.lookup(hostname);
      if (!lookupResult || !isSafeIp(lookupResult.address)) {
        console.warn(`[ImageValidator] SSRF Protection blocked resolution of ${hostname} to ${lookupResult?.address}`);
        return false;
      }
    }

    // 2. Perform a HEAD request first
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual', // Handle redirects manually for SSRF protection
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    // If HEAD is not allowed (405) or bad request, fallback to GET
    if (response.status === 405 || response.status === 400 || response.status === 403) {
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 5000);
      
      response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: getController.signal,
        // Only fetch a small amount of data if possible, but fetch API doesn't support max response size natively
        // We'll just rely on the timeout and aborting
      });
      
      clearTimeout(getTimeout);
      
      // If it's a 200, we just abort immediately after reading headers to save bandwidth
      if (response.status === 200) {
        getController.abort();
      }
    }

    // 3. Handle Redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return false;
      
      const redirectUrl = new URL(location, url).toString();
      return await validateImageUrl(redirectUrl, redirectCount + 1);
    }

    // 4. Validate successful response
    if (response.status !== 200) {
      return false;
    }

    // 5. Validate Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return false;
    }
    
    // Reject SVG for this feature as requested
    if (contentType.includes('svg')) {
      return false;
    }

    // 6. Validate Content-Length (Max 10MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > 10 * 1024 * 1024) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // Timeout or network error
    return false;
  }
}
