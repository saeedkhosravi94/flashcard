# Setting Up System Nginx as Reverse Proxy

Since you already have Nginx running on port 80, we'll use it as a reverse proxy to your Docker containers.

---

## 🎯 Architecture

```
Internet (Port 443)
        ↓
System Nginx (Port 80/443) - SSL Termination
        ↓
Docker Frontend Container (Port 8080)
        ↓
Docker Backend Container (Port 5000)
        ↓
Docker MongoDB Container (Port 27017)
```

---

## ✅ Step 1: Deploy Docker Containers (Updated Ports)

The `docker-compose.prod.yml` has been updated to use port 8080 instead of 80.

```bash
# Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Verify containers are running
docker-compose -f docker-compose.prod.yml ps

# You should see:
# - flashcard-backend-prod on port 5000
# - flashcard-frontend-prod on port 8080
# - flashcard-mongodb-prod (internal only)
```

---

## ✅ Step 2: Configure System Nginx

### Copy the Nginx configuration file:

```bash
# Copy the nginx config to sites-available
sudo cp nginx-system-config.conf /etc/nginx/sites-available/flashcard

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/flashcard /etc/nginx/sites-enabled/

# Remove default site if it exists (optional)
sudo rm /etc/nginx/sites-enabled/default
```

---

## ✅ Step 3: Test Nginx Configuration

```bash
# Test the configuration
sudo nginx -t

# You should see:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

If you get errors, check:
- SSL certificate paths are correct
- No syntax errors in the config file

---

## ✅ Step 4: Reload Nginx

```bash
# Reload Nginx to apply changes
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

---

## ✅ Step 5: Verify Everything Works

### Test Backend:
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}
```

### Test Frontend Container:
```bash
curl http://localhost:8080/health
# Should return: healthy
```

### Test Through Nginx:
```bash
curl -I https://flash.saeedkhosravi.it
# Should return: HTTP/2 200
```

### Open in Browser:
Visit: **https://flash.saeedkhosravi.it**

---

## 🔍 Troubleshooting

### Issue: Nginx fails to start

**Check configuration:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**Common issues:**
- SSL certificate path incorrect
- Port 80/443 still in use by another service
- Syntax errors in config

### Issue: 502 Bad Gateway

**Means Nginx can't reach Docker containers:**

```bash
# Check if containers are running
docker-compose -f docker-compose.prod.yml ps

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Check if ports are accessible
curl http://localhost:8080
curl http://localhost:5000/api/health

# Check firewall
sudo ufw status
```

### Issue: 404 errors for API calls

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/flashcard-access.log
sudo tail -f /var/log/nginx/flashcard-error.log
```

**Verify backend is responding:**
```bash
curl http://localhost:5000/api/health
```

### Issue: SSL certificate errors

**Renew Let's Encrypt certificate:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 🔄 Updating Your Application

When you update your code:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Nginx will continue serving, no need to reload unless you change nginx config
```

---

## 📊 Monitoring

### View Nginx Logs:
```bash
# Access log
sudo tail -f /var/log/nginx/flashcard-access.log

# Error log
sudo tail -f /var/log/nginx/flashcard-error.log
```

### View Docker Logs:
```bash
# All containers
docker-compose -f docker-compose.prod.yml logs -f

# Specific container
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

---

## 🔒 SSL Certificate Auto-Renewal

Set up automatic renewal for Let's Encrypt:

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot usually sets up auto-renewal automatically
# Check if timer is active
sudo systemctl status certbot.timer

# Manual renewal if needed
sudo certbot renew
sudo systemctl reload nginx
```

---

## ✅ Quick Reference

### Service Commands:
```bash
# Nginx
sudo systemctl status nginx
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo nginx -t

# Docker Containers
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml restart
docker-compose -f docker-compose.prod.yml logs -f
```

### Port Mapping:
- **80 (HTTP)** → System Nginx → Redirects to 443
- **443 (HTTPS)** → System Nginx → Proxies to containers
- **8080** → Docker Frontend Container (internal)
- **5000** → Docker Backend Container (internal)
- **27017** → Docker MongoDB (internal only)

### URLs:
- **Public**: https://flash.saeedkhosravi.it
- **Backend API**: https://flash.saeedkhosravi.it/api
- **Health Check**: https://flash.saeedkhosravi.it/health
- **Google OAuth**: https://flash.saeedkhosravi.it/api/auth/google/callback

---

## 🎉 Done!

Your application should now be accessible at **https://flash.saeedkhosravi.it** with:
- System Nginx handling SSL and routing
- Docker containers running your application
- Automatic HTTPS redirect
- Professional production setup

This is the standard production configuration! 🚀

