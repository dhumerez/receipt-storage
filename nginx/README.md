# Nginx Deployment

File: `nginx/receipts.conf`
Target: `/etc/nginx/conf.d/receipts.conf`

## Steps

1. Replace `receipts.yourdomain.com` with actual subdomain
2. Copy file: `sudo cp nginx/receipts.conf /etc/nginx/conf.d/receipts.conf`
3. Deploy HTTP-only first (comment out the 443 block):
   `sudo nginx -t && sudo nginx -s reload`
4. Obtain Let's Encrypt cert:
   `sudo certbot --nginx -d receipts.yourdomain.com`
5. Certbot adds SSL directives automatically
6. Verify renewal: `sudo certbot renew --dry-run`

## DO NOT TOUCH
- `/etc/nginx/conf.d/restaurant.conf` — the Restaurant app's config
- Any other existing conf.d files
