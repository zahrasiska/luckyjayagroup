# LTech Deployment Guide

## 📋 Deployment Scenarios

Ada 2 skenario deployment berbeda tergantung infrastruktur server:

### Scenario 1: VPS dengan IP Public (Direct)
**Contoh:** DigitalOcean, AWS EC2, Linode dengan public IP

```
Internet → Domain DNS A Record → VPS IP Public → Nginx → Application
```

### Scenario 2: Server di Belakang CGNAT (via Cloudflare Tunnel)
**Contoh:** Home server, ISP dengan CGNAT, server tanpa IP public

```
Internet → Cloudflare CDN → Cloudflare Tunnel → Nginx → Application
```

---

## 🔧 Scenario 1: VPS dengan IP Public

### Prerequisites
- VPS dengan IP public
- Domain name
- SSH access ke server
- Nginx installed

### DNS Configuration
Di DNS provider (Cloudflare/Namecheap/etc):
```
Type: A
Name: erp (atau subdomain lain)
Value: <VPS_PUBLIC_IP>
TTL: Auto
```

### Nginx Configuration
File: `/etc/nginx/sites-available/ltech-erp`

```nginx
server {
    listen 80;
    server_name erp.yourdomain.com;
    
    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourdomain.com;
    
    # SSL Certificate (via Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourdomain.com/privkey.pem;
    
    # SSE specific location
    location /api/notifications/stream {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    
    # Kasir POS
    location /kasir {
        alias /home/luckyjayagroup/ltech/kasir/dist;
        try_files $uri $uri/ /kasir/index.html;
    }
    
    # Frontend
    location / {
        root /home/luckyjayagroup/ltech/ui/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### SSL Setup (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d erp.yourdomain.com

# Auto-renewal (already setup by certbot)
sudo systemctl status certbot.timer
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/ltech-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🌐 Scenario 2: CGNAT Server (Cloudflare Tunnel)

### Prerequisites
- Domain terdaftar di Cloudflare
- Server di belakang CGNAT/tanpa IP public
- SSH access ke server

### 1. Install Cloudflared
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Authenticate
```bash
cloudflared tunnel login
# Buka URL di browser dan authorize
```

### 3. Create Tunnel
```bash
cloudflared tunnel create ltech-erp
# Catat Tunnel ID yang diberikan
```

### 4. Create Config
File: `/root/.cloudflared/config.yml`

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: erp.yourdomain.com
    service: http://localhost:8085  # Local Nginx
    originRequest:
      noTLSVerify: true
      disableChunkedEncoding: false
      connectTimeout: 30s
      keepAliveTimeout: 90s
  
  - service: http_status:404
```

### 5. Route DNS (Automatic)
```bash
cloudflared tunnel route dns ltech-erp erp.yourdomain.com
# CNAME record akan dibuat otomatis
```

### 6. Setup PM2 Service
```bash
pm2 start cloudflared --name cf-tunnel -- tunnel --config /root/.cloudflared/config.yml run ltech-erp
pm2 save
pm2 startup  # Enable auto-start on boot
```

### 7. Local Nginx Configuration
File: `/home/luckyjayagroup/ltech/nginx-funnel.conf`

> **Note:** Tidak perlu SSL config karena SSL dihandle oleh Cloudflare

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 8085;  # Internal port untuk Cloudflare Tunnel
        server_name localhost;
        
        # SSE endpoint
        location /api/notifications/stream {
            proxy_pass http://localhost:8082;
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400;
        }
        
        # Backend API
        location /api {
            proxy_pass http://localhost:8082;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
        }
        
        # Kasir POS
        location /kasir {
            alias /home/luckyjayagroup/ltech/kasir/dist;
            try_files $uri $uri/ /kasir/index.html;
        }
        
        # Frontend
        location / {
            root /home/luckyjayagroup/ltech/ui/dist;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 8. Run Nginx
```bash
nginx -c /home/luckyjayagroup/ltech/nginx-funnel.conf
```

---

## 🔀 Comparison

| Feature | VPS IP Public | Cloudflare Tunnel |
|---------|---------------|-------------------|
| **IP Public Required** | ✅ Ya | ❌ Tidak |
| **SSL Setup** | Manual (Let's Encrypt) | Otomatis (Cloudflare) |
| **DDoS Protection** | Manual setup | Built-in |
| **CDN** | Manual setup | Built-in global CDN |
| **Firewall** | UFW/iptables | Cloudflare WAF |
| **Cost** | VPS cost | Free (+ VPS/home server) |
| **Setup Complexity** | Medium | Medium |
| **Best For** | Production VPS | CGNAT/Home Server |

---

## 📦 Application Deployment (Both Scenarios)

### 1. Backend Setup
```bash
cd /home/luckyjayagroup/ltech/ltech-backend

# Build binary
go build -o bin/ltech-backend main.go

# Setup environment
cp .env.example .env.local
nano .env.local  # Edit dengan DB credentials

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
```

### 2. Frontend Setup
```bash
cd /home/luckyjayagroup/ltech/ui

# Install dependencies
npm install

# Configure environment
nano .env
# VITE_API_URL=https://erp.yourdomain.com
# VITE_APP_URL=https://erp.yourdomain.com

# Build
npm run build

# Dist akan tersedia di: /home/luckyjayagroup/ltech/ui/dist
```

### 3. Kasir POS Setup
```bash
cd /home/luckyjayagroup/ltech/kasir

# Similar steps as frontend
npm install
npm run build
```

---

## 🔍 Verification

### Check Services
```bash
# PM2 processes
pm2 list

# Nginx status
sudo systemctl status nginx  # (Scenario 1)
ps aux | grep nginx          # (Scenario 2)

# Cloudflare Tunnel (Scenario 2 only)
pm2 logs cf-tunnel --lines 20
```

### Test Endpoints
```bash
# Health check
curl https://erp.yourdomain.com/api/health

# SSE endpoint (harus return event stream)
curl -N https://erp.yourdomain.com/api/notifications/stream?token=<TOKEN>
```

---

## 🚨 Troubleshooting

### Scenario 1 (VPS) Issues

**SSL Certificate Errors:**
```bash
sudo certbot renew --dry-run
sudo systemctl restart nginx
```

**Port not accessible:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### Scenario 2 (Cloudflare Tunnel) Issues

**Tunnel Not Connected:**
```bash
pm2 logs cf-tunnel --lines 50
pm2 restart cf-tunnel
```

**SSE Connection Errors:**
- Pastikan `proxy_buffering off` di Nginx config
- Check Cloudflare Tunnel config `disableChunkedEncoding: false`

**DNS Not Resolving:**
```bash
# Check CNAME record
dig erp.yourdomain.com

# Re-route if needed
cloudflared tunnel route dns ltech-erp erp.yourdomain.com
```

---

## 📝 Migration Notes

### From Tailscale Funnel to Cloudflare Tunnel
See: [Cloudflare Tunnel Migration Walkthrough](/root/.gemini/antigravity/brain/9b5e256b-3c3f-467f-966d-e5d8bc9dfe13/walkthrough.md)

### From VPS to Cloudflare Tunnel
1. Setup Cloudflare Tunnel (langkah di Scenario 2)
2. Update DNS dari A record ke CNAME (otomatis via CLI)
3. Stop system Nginx, gunakan local Nginx config
4. Update frontend `.env` jika diperlukan
5. Test thoroughly before removing VPS setup
