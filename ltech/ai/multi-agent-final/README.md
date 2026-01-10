# Lucky Tech Multi-Agent System

> Intelligent AI system untuk Lucky Tech Group dengan specialized agents untuk Finance, Inventory, dan Sales management.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/ltech-multi-agent)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

---

## ✨ Features

- 🤖 **Multi-Agent Architecture** - Specialized agents untuk different domain
- 🔧 **Auto Typo Correction** - Qwen-powered input refinement
- 💰 **Dynamic Price Configuration** - Tenant-specific price field management  
- 🎯 **Intelligent Routing** - Auto-detect intent dan route ke specialist
- 📊 **Real-time Data** - Direct integration dengan PostgreSQL via backend API
- 🏢 **Multi-Tenant** - Support multiple tenant schemas
- 🔄 **Session Management** - Redis-based persistence
- 📡 **WebSocket + REST API** - Dual protocol support

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Redis Server
- Qwen CLI (configured)
- Access to ltech-backend API

### Installation

```bash
# Clone repository
git clone <repository-url>
cd ai/multi-agent-final

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

### Production Deployment

```bash
# Start with PM2
pm2 start ecosystem.config.js --name multi-agent-final

# Check status
pm2 status

# View logs
pm2 logs multi-agent-final
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [APPLICATION_SPEC.md](docs/APPLICATION_SPEC.md) | Complete application specification |
| [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Developer quick reference |
| [INPUT_REFINER_AGENT.md](docs/INPUT_REFINER_AGENT.md) | Input refinement documentation |

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
┌──────▼──────────────────────────────────┐
│         Server (WebSocket/REST)         │
└──────┬──────────────────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│          Multi-Agent Pipeline           │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Step 0: InputRefinerAgent       │  │
│  │  (Typo & Grammar Correction)     │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
│  ┌───────────▼──────────────────────┐  │
│  │  Step 1: RouterAgent             │  │
│  │  (Intent Detection & Routing)    │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
│  ┌───────────▼──────────────────────┐  │
│  │  Step 2: Specialist Agent        │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  • FinanceManagerAgent     │  │  │
│  │  │  • InventoryManagerAgent   │  │  │
│  │  │  • SalesManagerAgent       │  │  │
│  │  │  • MemoryManagerAgent      │  │  │
│  │  │  • GeneralAssistantAgent   │  │  │
│  │  └────────────────────────────┘  │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
│  ┌───────────▼──────────────────────┐  │
│  │  Step 3: SummarizerAgent         │  │
│  │  (Format Response)               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🤖 Agents

### InputRefinerAgent (NEW!)
Auto-correct typos dan grammar sebelum processing.
- **Accuracy**: 100% (tested)
- **Latency**: ~3.4s average
- **Powered by**: Qwen CLI

### InventoryManagerAgent
Handle inventory queries dengan dynamic price configuration.
- Product search
- Stock reports
- Master data lookup
- Dynamic pricing

### FinanceManagerAgent
Financial reporting dan analysis.
- Neraca (Balance Sheet)
- Laba Rugi (P&L)
- Saldo Kas (Cash Balance)
- Buku Besar (General Ledger)

### SalesManagerAgent
Sales analysis dan insights.

### MemoryManagerAgent
Context persistence dan recall.

### GeneralAssistantAgent
Fallback untuk general questions.

---

## 🔧 Configuration

### Environment Variables

```bash
# Backend API Configuration
BACKEND_API_URL=https://erp.luckyjaya.tech/api
AI_SPECIAL_TOKEN=your-secret-token

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Server Configuration
PORT=8899
NODE_ENV=production
```

### Agent Configuration

```javascript
// Disable InputRefiner
const inputRefiner = getAgent('input-refiner');
inputRefiner.setEnabled(false);

// Adjust similarity threshold
inputRefiner.minSimilarity = 0.95; // Default: 0.99
```

---

## 📡 API Usage

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8899');

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'message',
        content: 'tampilkan stok barang merk fukuyama',
        tenantSchema: 'u1566482_sparepart',
        userId: 'user123',
        userRole: 'admin'
    }));
});

ws.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'response') {
        console.log(message.data.response.summary);
    }
});
```

### REST API

```bash
curl -X POST http://localhost:8899/api/query \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "tampilkan neraca bulan ini",
    "tenantSchema": "u1566482_sparepart",
    "userId": "user123"
  }'
```

---

## 🧪 Testing

```bash
# Test Input Refiner
node test_input_refiner.js

# Test Speed & Accuracy
node test_speed_accuracy.js

# Test Full Pipeline
node test_pipeline_direct.js

# Debug Qwen Integration
node test_debug_qwen.js
```

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Average Response Time | ~7.6s |
| InputRefiner Accuracy | 100% |
| Typo Correction Speed | 3.4s avg |
| Router Confidence | >90% |
| WebSocket Latency | <100ms |

---

## 🗂️ Project Structure

```
ai/multi-agent-final/
├── agents/              # Agent implementations
│   ├── router/
│   ├── finance-manager/
│   ├── inventory-manager.js
│   ├── input-refiner.js   # NEW
│   └── ...
├── core/                # Core components
│   ├── orchestrator.js
│   ├── session-manager.js
│   └── tools/
│       ├── inventory-tool.js
│       ├── price-config-tool.js  # NEW
│       └── ...
├── tools/               # SQL templates
│   ├── finance/
│   └── inventory/
├── docs/                # Documentation
│   ├── APPLICATION_SPEC.md
│   ├── QUICK_REFERENCE.md
│   └── INPUT_REFINER_AGENT.md
├── server.js            # Main server
├── .env                 # Configuration
└── package.json
```

---

## 🤝 Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

---

## 📝 Changelog

### v2.0.0 (2026-01-09)
- ✨ Added InputRefinerAgent with Qwen integration
- ✨ Dynamic price field configuration
- ✨ Master data lookup flow
- ✨ Privacy-aware price display
- 🐛 Fixed typo normalization pipeline
- 📚 Comprehensive documentation

### v1.0.0
- 🎉 Initial release
- Multi-agent architecture
- Finance, Inventory, Sales specialists
- Session management
- WebSocket + REST API

---

## 🔒 Security

- ✅ Token-based API authentication
- ✅ Tenant schema isolation
- ✅ Redis session encryption (optional)
- ✅ Environment variable protection

---

## 📞 Support

For support, email: tech@luckyjaya.tech

---

## 📄 License

Proprietary - Lucky Tech Group © 2026

---

**Built with ❤️ by Lucky Tech Development Team**
