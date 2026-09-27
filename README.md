# 🖨️ Cyber Cafe Print Hub

A complete print automation system for cyber cafes. Customers scan a QR code, upload their document, select print settings, pay, and collect their printout — all without handing physical USB drives or files to the shopkeeper.

---

## 🏗️ Architecture

```
monorepo/
├── backend/        ← Express + Prisma + SQLite + Socket.IO (port 3001)
├── customer-app/   ← React + Vite customer portal (port 5173)
├── admin-app/      ← React + Vite admin dashboard (port 5174)
└── print-agent/    ← Node.js Windows print agent (connects to backend)
```

**Workflow:**
```
Customer scans QR → uploads file → selects settings → places order
                                                            ↓
Admin confirms cash payment → print agent picks up job → prints → DONE ✅
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (v22 recommended)
- npm v9+
- Windows (for real printing; mock mode works on any OS)

### 1. Install all dependencies
```bash
npm install
```

### 2. Set up the database
```bash
cd backend
npx prisma migrate dev --name init
npx tsx src/seed.ts   # Creates admin user + pricing rules
cd ..
```

### 3. Start all services

**Option A: Start separately (recommended for development)**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Customer Portal
cd customer-app && npm run dev

# Terminal 3 - Admin Dashboard
cd admin-app && npm run dev

# Terminal 4 - Print Agent
cd print-agent && npm run dev
```

**Option B: Start with concurrently (backend + frontends)**
```bash
npm run dev
```

---

## 🌐 URLs

| Service | URL | Description |
|---------|-----|-------------|
| Customer Portal | http://localhost:5173 | Customers upload & order prints |
| Admin Dashboard | http://localhost:5174 | Admin manages orders & payments |
| Backend API | http://localhost:3001 | REST API + Socket.IO |
| Health Check | http://localhost:3001/health | Server status |

---

## 🔐 Default Credentials

| Field | Value |
|-------|-------|
| Admin Email | `admin@cybercafe.local` |
| Admin Password | `Admin@1234` |

> ⚠️ **Change these in production!**

---

## 💰 Default Pricing

| Paper | Mode | Price/Page |
|-------|------|-----------|
| A4 | Black & White | ₹2 |
| A4 | Color | ₹10 |
| A3 | Black & White | ₹4 |
| A3 | Color | ₹20 |
| Letter | Black & White | ₹2 |
| Letter | Color | ₹10 |

Pricing is editable from the admin dashboard → Pricing.

---

## 🖨️ Print Agent Configuration

The print agent runs on the Windows PC connected to the printer.

### Mock Mode (testing - no real printing)
```bash
# print-agent/.env
PRINT_ADAPTER=MOCK
```

### Real Windows Printing
```bash
# print-agent/.env
PRINT_ADAPTER=WINDOWS
PRINTER_NAME=HP_LaserJet_P1102   # Your Windows printer name
```

To find your Windows printer name:
```powershell
Get-Printer | Select-Object Name
```

For best results with PDF printing, install **SumatraPDF** (free):
- Download from: https://www.sumatrapdfreader.org/

---

## 📋 Features

### Customer Portal
- 📁 Upload PDF, JPG, PNG (max 50MB)
- 🔢 Automatic page count detection for PDFs
- 🖤 Black & White / Color mode selection
- 📄 A4 / A3 / Letter paper sizes
- 🔢 Number of copies (1-100)
- 📝 Page range selection
- 🔁 Duplex (double-sided) printing
- 💰 Real-time price calculation
- 💵 Cash / Online payment selection
- 📱 Order status tracking (real-time via Socket.IO)
- 📋 Order number for reference

### Admin Dashboard
- 📊 Live dashboard with stats (orders, revenue, queue)
- 📋 Orders list with search and filter
- 👁️ Order detail view with full audit trail
- ✅ One-click cash payment confirmation
- 🖨️ Print queue monitoring (real-time)
- 🔄 Retry failed print jobs
- 💰 Pricing management (per paper size × color mode)
- 🖨️ Printer management
- ⚙️ Settings (cafe name, portal URL)
- 🔲 QR code generation for customer portal

### Print Agent
- 🔄 Real-time job polling via Socket.IO + HTTP polling
- 📥 Auto-downloads documents from backend
- 🖨️ Supports real Windows printing + mock mode
- 🔁 Auto-retry on failure (configurable)
- 🗑️ Auto-cleanup of temp files
- 🔒 Token-authenticated connection to backend

---

## 🛡️ Security

- JWT authentication for admin routes
- Token-based authentication for print agent
- File type validation (PDF, JPG, PNG only)
- File size limits (50MB max)
- SQL injection prevention (Prisma ORM)
- CORS restricted to allowed origins

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
```env
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-here
UPLOAD_DIR=./uploads
PRINT_AGENT_TOKEN=your-agent-token
CUSTOMER_APP_URL=http://localhost:5173
ADMIN_APP_URL=http://localhost:5174
```

### Print Agent (`print-agent/.env`)
```env
BACKEND_URL=http://localhost:3001
AGENT_TOKEN=print-agent-dev-token-change-in-production
PRINT_ADAPTER=MOCK   # or WINDOWS
PRINTER_NAME=       # Leave blank for system default
POLL_INTERVAL=3000  # ms
```

---

## 🗄️ Database

Uses SQLite for development (no setup required). The database file is at `backend/prisma/dev.db`.

To reset the database:
```bash
cd backend
npx prisma migrate reset
npx tsx src/seed.ts
```

To view data with Prisma Studio:
```bash
cd backend
npx prisma studio
```

---

## 📁 File Storage

Uploaded files are stored in `backend/uploads/`. Each file gets a UUID-based name.

---

## 🧪 Testing

Run the API test suite:
```bash
node .gemini/antigravity/brain/81eba301-d906-4d69-bf5f-67fcc00d9f7a/scratch/e2e_test.js
node .gemini/antigravity/brain/81eba301-d906-4d69-bf5f-67fcc00d9f7a/scratch/workflow_test.js
```

---

## 🚧 Production Considerations

> This setup is for development. For production:
> 1. Use MySQL/PostgreSQL instead of SQLite
> 2. Use a reverse proxy (Nginx) in front of the Express backend
> 3. Build the React apps (`npm run build`) and serve static files
> 4. Set `NODE_ENV=production`
> 5. Use strong random secrets for JWT and agent tokens
> 6. Configure HTTPS
> 7. Set up process management (PM2 or systemd)
