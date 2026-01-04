# Ltech Project Context

## Project Overview
Multi-tenant ERP system built for efficiency and scalability:
- **Backend:** Go (Golang) + PostgreSQL
- **Frontend:** React + Vite
- **POS:** Electron application
- **AI Infrastructure:** Local Qwen-Code CLI + Redis for session caching.

## Database Architecture

### Multi-Tenant Design
- **Master Data:** Stored in the `public` schema (users, tenants, etc.)
- **Tenant Data:** Each tenant has its own isolated PostgreSQL schema.
- **Middleware:** `SchemaMiddleware` handles switching search paths per request.

### Key Functional Tables
- `barang`: Central product inventory.
- `transaksi` (alias `t`): Transaction headers (sales/purchases).
- `detail` (alias `d`): Granular transaction items linked to headers.
- `fifo` & `fifo_audit`: Real-time inventory valuation using FIFO method.

## API Conventions

### Standard Route Structure
Handled in `main.go`. All protected endpoints follow this wrapping:
```go
http.Handle("/api/endpoint", 
  middleware.AuthMiddleware(     // 1. Authenticate user
    middleware.SchemaMiddleware( // 2. Switch to tenant schema
      http.HandlerFunc(handlers.MyHandler)
    )
  )
)
```

### Response Format
- Consistent JSON responses with `success` (bool), `data` (interface), and optional `error` (string).
- HTTP status codes are used appropriately (200 OK, 400 Bad Request, 401 Unauthorized, 500 Internal Error).

## Business Logic Highlights

### FIFO Valuation
- Cost of Goods Sold (COGS) is calculated dynamically.
- `fifo_audit` provides a full audit trail of inventory movements.
- AI should prioritize these tables for financial accuracy.

### Reporting Engine
- Custom reports for Laba Rugi (P&L), Balance Sheet, and Stock Analysis.
- High-level summaries are often pre-calculated for performance.

## AI integration (Qwen-Code)
- Use local `/usr/bin/qwen` for processing.
- Session persistence is managed via Redis mapping UUIDs to Qwen session IDs.
- Follow the patterns in `handlers/laporan_chat.go` for stateful conversation management.
- **Persona:** CFO & Senior Financial Analyst (Professional, tactful, and strategic).
- **Communication:** Always use **Bahasa Indonesia** for user interactions.
