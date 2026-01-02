# LTech Project

Enterprise Resource Planning (ERP) system untuk Lucky Jaya Group.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet Access                       │
│  Scenario 1: Direct VPS    Scenario 2: Cloudflare Tunnel│
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
        ┌────▼────┐              ┌──────▼──────┐
        │ Nginx   │              │  Cloudflare  │
        │ (80/443)│              │    Tunnel    │
        └────┬────┘              └──────┬───────┘
             │                          │
             └──────────┬───────────────┘
                        │
                 ┌──────▼──────┐
                 │    Nginx     │
                 │ Reverse Proxy│
                 └──────┬───────┘
          ┌─────────────┼─────────────┐
          │             │             │
     ┌────▼────┐   ┌───▼────┐   ┌───▼─────┐
     │ Backend │   │   UI   │   │  Kasir  │
     │ (Go API)│   │ (React)│   │ (React) │
     │  :8082  │   │  dist/ │   │  dist/  │
     └─────────┘   └────────┘   └─────────┘
```

## 🚀 Quick Start

### Prerequisites
- Go 1.22+
- Node.js 18+
- PostgreSQL 14+
- PM2 (`npm install -g pm2`)

### Development Setup
```bash
# Clone repository
git clone <repo-url>
cd ltech

# Backend
cd ltech-backend
go mod download
cp .env.example .env.local
# Edit .env.local dengan DB credentials
go run main.go

# Frontend
cd ../ui
npm install
cp .env.example .env
# Edit .env dengan API URL
npm run dev

# Kasir
cd ../kasir
npm install
npm run dev
```

## 📦 Production Deployment

Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk panduan lengkap deployment termasuk:
- **Scenario 1:** VPS dengan IP Public
- **Scenario 2:** Server di belakang CGNAT (Cloudflare Tunnel)

### Quick Production Deploy
```bash
# Backend
cd ltech-backend
go build -o bin/ltech-backend main.go
pm2 start ecosystem.config.cjs

# Frontend & Kasir
cd ../ui && npm run build
cd ../kasir && npm run build

# Start services
pm2 save
pm2 startup
```

## 🔗 Current Deployment

**Production:** https://erp.luckyjaya.tech
- **Infrastructure:** Cloudflare Tunnel (CGNAT server)
- **Backend:** Go API on port 8082
- **Frontend:** React SPA
- **Database:** PostgreSQL

## 📂 Project Structure

```
ltech/
├── ltech-backend/          # Go backend API
│   ├── main.go
│   ├── handlers/
│   ├── middleware/
│   ├── models/
│   └── ecosystem.config.cjs
├── ui/                     # React frontend
│   ├── src/
│   ├── dist/              # Build output
│   └── ecosystem.config.cjs
├── kasir/                  # POS application
│   ├── src/
│   └── dist/
├── nginx-funnel.conf       # Nginx config (Cloudflare Tunnel)
├── DEPLOYMENT.md           # Deployment guide
└── README.md              # This file
```

## 🛠️ Tech Stack

### Backend
- **Language:** Go 1.22
- **Database:** PostgreSQL with pg driver
- **Auth:** PASETO tokens
- **SSE:** Server-Sent Events for notifications

### Frontend
- **Framework:** React 18 + Vite
- **State:** Context API
- **UI:** Custom components
- **PWA:** Service Worker enabled
- **Cache:** IndexedDB for offline support

### Infrastructure
- **Reverse Proxy:** Nginx
- **Process Manager:** PM2
- **Tunnel:** Cloudflare Tunnel (production)
- **SSL:** Cloudflare managed

## 📝 Environment Variables

### Backend (.env.local)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=luckyjayagroup
PORT=8082
```

### Frontend (.env)
```env
VITE_API_URL=https://erp.luckyjaya.tech
VITE_APP_URL=https://erp.luckyjaya.tech
VITE_KASIR_URL=https://erp.luckyjaya.tech/kasir
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 🔐 Security

- HTTPS enforced (Cloudflare SSL)
- PASETO token-based authentication
- CORS configured
- SQL injection protection via parameterized queries
- Rate limiting on sensitive endpoints

## 🧪 Testing

```bash
# Backend
cd ltech-backend
go test ./...

# Frontend
cd ui
npm run test
```

## 📊 Monitoring

```bash
# Check PM2 services
pm2 list
pm2 monit

# View logs
pm2 logs asri-backend --lines 50
pm2 logs cf-tunnel --lines 50

# Nginx logs (if using system Nginx)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🐛 Troubleshooting

See [DEPLOYMENT.md](DEPLOYMENT.md#-troubleshooting) for comprehensive troubleshooting guide.

Common issues:
- **SSE connection errors:** Check Nginx buffering settings
- **CORS errors:** Verify API_URL in frontend .env
- **Database connection:** Check credentials in backend .env.local

## 📄 License

Proprietary - Lucky Jaya Group

## 👥 Team

Developed for Lucky Jaya Group
