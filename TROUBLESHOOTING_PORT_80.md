# Fixing Port 80 Already Allocated Error

## Error
```
Bind for 0.0.0.0:80 failed: port is already allocated
```

This means something is already running on port 80 on your server.

---

## 🔍 Step 1: Find What's Using Port 80

Run these commands on your server:

```bash
# Check what's using port 80
sudo lsof -i :80

# Or use netstat
sudo netstat -tulpn | grep :80

# Check if it's a Docker container
docker ps
```

---

## ✅ Solution 1: Stop Existing Web Server (Recommended if you have Apache/Nginx)

If you have Apache or Nginx already running:

```bash
# Stop Apache
sudo systemctl stop apache2
sudo systemctl disable apache2

# Or stop Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx
```

Then deploy again:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ✅ Solution 2: Use Existing Nginx as Reverse Proxy (Best for Production)

If you want to keep your existing Nginx, configure it as a reverse proxy:

### 1. Stop the Docker frontend container from binding to port 80

Update `docker-compose.prod.yml`:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      - REACT_APP_BACKEND_URL=https://flash.saeedkhosravi.it
  container_name: flashcard-frontend-prod
  restart: always
  ports:
    - "8080:80"  # Changed from 80:80 to 8080:80
  volumes:
    - ./nginx/ssl:/etc/nginx/ssl:ro
  depends_on:
    backend:
      condition: service_healthy
  networks:
    - flashcard-network
```

### 2. Configure your system Nginx as reverse proxy

Create `/etc/nginx/sites-available/flashcard`:

```nginx
server {
    listen 80;
    server_name flash.saeedkhosravi.it;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name flash.saeedkhosravi.it;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/flash.saeedkhosravi.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/flash.saeedkhosravi.it/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Docker frontend container
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy API to backend (optional - frontend can handle this)
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # File upload size
    client_max_body_size 50M;
}
```

### 3. Enable the site and restart Nginx

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/flashcard /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. Deploy with updated docker-compose

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ✅ Solution 3: Change Docker Ports (Quick Fix)

If you just want to test quickly on a different port:

Update `docker-compose.prod.yml`:

```yaml
frontend:
  ports:
    - "8080:80"     # Access on port 8080
    - "8443:443"    # HTTPS on port 8443
```

Then access your app at: `http://your-server-ip:8080`

⚠️ **Note**: This is not ideal for production. Use Solution 1 or 2 instead.

---

## ✅ Solution 4: Stop Conflicting Docker Containers

If another Docker container is using port 80:

```bash
# See all running containers
docker ps

# Stop the conflicting container
docker stop CONTAINER_ID

# Or stop all containers
docker stop $(docker ps -q)

# Remove all stopped containers
docker container prune
```

Then deploy again:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🎯 Recommended Approach

**For Production (Best):**
Use **Solution 2** - Keep system Nginx as reverse proxy. This gives you:
- Better SSL management with certbot
- Easier multi-site hosting
- Better performance
- Standard production setup

**For Quick Testing:**
Use **Solution 1** - Stop existing web server

**For Development:**
Use **Solution 3** - Change ports temporarily

---

## 📝 After Fixing

Once you've applied a solution, verify everything works:

```bash
# Check containers are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test your site
curl -I https://flash.saeedkhosravi.it
```

---

## 🆘 Still Having Issues?

Run these diagnostic commands and share the output:

```bash
# What's listening on port 80?
sudo lsof -i :80

# Docker containers
docker ps -a

# System web servers
sudo systemctl status nginx
sudo systemctl status apache2

# Port usage
sudo netstat -tulpn | grep -E ':80|:443'
```

