# 💎 Zorvyn Finance: Institutional High-Density Dashboard

A production-grade, full-stack financial ecosystem built for the Zorvyn Backend Developer Intern assessment. This project goes beyond basic CRUD, implementing enterprise-standard performance layers, immutable auditing, and the custom **"Obsidian Forge"** design system.

---

## 🚀 The Competitive Edge: Why Zorvyn Finance?

While standard submissions provide basic API endpoints, this project implements **Advanced Engineering Principles** that separate a "project" from a "product":

1.  **Speed Layer (Redis)**: Integrated Redis caching for dashboard analytics. This ensures the UI remains responsive and "Banger" level fast even as the ledger grows into millions of rows.
2.  **Institutional Aesthetics**: Built with the **"Obsidian Forge"** design system—a high-density, deep-dark UI optimized for professional fiscal monitoring.
3.  **Audit Integrity**: Includes a global **Immutable Audit Stream** that logs every transaction action (who, what, when) for true fiscal accountability.
4.  **DevOps Excellence**: Fully orchestrated with **Docker-Compose** for one-command local and cloud scaling.

---

## 🛠️ The Tech Stack

### Backend (Institutional Efficiency)
- **Framework**: NestJS (TypeScript) — Enterprise-grade modular architecture.
- **ORM**: Prisma with PostgreSQL for type-safe relational persistence.
- **Cache**: Redis for sub-100ms dashboard state delivery.
- **Auth**: JWT-based Role-Based Access Control (RBAC).

### Frontend (Professional Fidelity)
- **Framework**: Next.js 16 (App Router) — Modern server-side rendering.
- **Styling**: Vanilla CSS with custom-built design tokens (No generic templates).
- **State**: Zustand with local session persistence.

---

## 🛡️ RBAC Permission Matrix

| Role | Ledger CRUD | Audit View | User Management |
| :--- | :--- | :--- | :--- |
| **Admin** | ✅ FULL | ✅ FULL | ✅ FULL |
| **Analyst** | ✅ OWN ONLY | ❌ NONE | ❌ NONE |
| **Viewer** | ⚠️ READ ONLY | ❌ NONE | ❌ NONE |

---

## 📦 One-Click Deployment (Local)

To spin up the entire ecosystem (Frontend, Backend, Postgres, & Redis) locally:

```bash
docker-compose up --build
```

---

## 🏁 Automated Testing

This project includes a comprehensive test suite covering edge cases, RBAC guards, and data integrity:

```bash
cd finance-backend
npm run test:e2e
```

**Zorvyn Finance is designed for the finish line. Stability. Security. Speed.**
