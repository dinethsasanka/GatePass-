# WebSocket Configuration for Production Deployment

## Issue
The WebSocket connections are failing in production because the nginx reverse proxy isn't configured to handle WebSocket upgrade requests.

## Error Messages
```
WebSocket connection to 'wss://gatepass.slt.lk/socket.io/?EIO=4&transport=websocket' failed
Socket.IO connection error: J9: websocket error
```

## Solution: Update Nginx Configuration

Add the following to your nginx configuration file (usually `/etc/nginx/sites-available/gatepass.slt.lk` or similar):

```nginx
# WebSocket Support for Socket.IO
location /socket.io/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket timeout settings
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    proxy_connect_timeout 60s;
    
    # Disable buffering for WebSocket
    proxy_buffering off;
}
```

## Complete Example Nginx Configuration

Here's a complete example of what your nginx configuration should look like:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name gatepass.slt.lk;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gatepass.slt.lk;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Frontend - Serve static files
    location / {
        root /opt/Gate_Pass;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
        
        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin *;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }
    
    # WebSocket Support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
    }
}
```

## Steps to Apply

1. **SSH into your production server**:
   ```bash
   ssh dpd@<your-server-ip>
   ```

2. **Edit the nginx configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/gatepass.slt.lk
   ```

3. **Add the WebSocket location block** as shown above

4. **Test the configuration**:
   ```bash
   sudo nginx -t
   ```

5. **Reload nginx** (if test passes):
   ```bash
   sudo systemctl reload nginx
   ```

## Verification

After applying the nginx configuration:

1. Clear your browser cache
2. Go to `https://gatepass.slt.lk`
3. Open browser DevTools (F12) → Console
4. You should see: `✅ Socket.IO connected: <socket-id>`
5. WebSocket errors should be gone

## Fallback

The Socket.IO client is already configured with a fallback to HTTP polling if WebSocket fails:

```javascript
const newSocket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],  // Will try polling if WebSocket fails
  reconnection: true,
  reconnectionAttempts: 5,
});
```

So the application should still work (albeit with slightly reduced real-time performance) even without the nginx WebSocket configuration, but **adding the WebSocket support is highly recommended** for better performance.
