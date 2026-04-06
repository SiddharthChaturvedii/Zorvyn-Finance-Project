# Zorvyn Finance: Institutional Data Management

A high-fidelity, production-grade financial dashboard engineered for institutional data velocity, operational accountability, and system scalability.

---

### 🔥 Submission Status: **All Systems Go**
- **Live Portal**: [zorvyn-finance-project.vercel.app](https://zorvyn-finance-project.vercel.app/)
- **API Documentation**: [zorvyn-backend-fnm1.onrender.com/docs](https://zorvyn-backend-fnm1.onrender.com/docs)
- **Technical Report**: [View Formal Requisition Report](./ZORVYN_SYSTEM_DOCUMENTATION.md)

---

### 🚀 Rapid Orchestration (Local)
For local evaluation, the entire ecosystem (Backend, Frontend, Postgres, Redis) is containerized via Docker.

```bash
# 1-Click Launch (Ensure Docker is running)
docker-compose up --build
```

---

### 🛡️ Operational Highlights
- **RBAC Matrix**: Multi-level access control (Viewer, Analyst, Admin) enforced at the API-gate.
- **Persistence**: High-fidelity PostgreSQL ledger with Prisma ORM.
- **Analytics Speed**: Redis-backed caching for sub-100ms dashboard totals.
- **Compliance**: Immutable event stream (Audit Persistence) with forensic sequence IDs.

*For full engineering details, tradeoffs, and architecture diagrams, see the [ZORVYN_SYSTEM_DOCUMENTATION.md](./ZORVYN_SYSTEM_DOCUMENTATION.md).*
