# Technical Submission: Zorvyn Finance Dashboard

Prepared by: Siddharth Chaturvedi  
Date: April 6, 2026

## 1. Project Vision: Beyond the "CRUD" Application
Most financial applications at this scale are built as simple "Create-Read-Update-Delete" (CRUD) tools. **Zorvyn Finance** was engineered to go beyond that. My goal was to deliver a **production-ready command center** that handles the three "Hard Problems" of Fintech: **Data Velocity**, **Operational Accountability**, and **System Scalability**.

### Live Production Infrastructure
- **Backend Service (Cluster)**: [zorvyn-backend-fnm1.onrender.com](https://zorvyn-backend-fnm1.onrender.com)
- **Interactive Documentation**: [zorvyn-backend-fnm1.onrender.com/docs](https://zorvyn-backend-fnm1.onrender.com/docs)
- **Frontend Portal**: [zorvyn-finance-project.vercel.app](https://zorvyn-finance-project.vercel.app/)

---

## 2. Competitive Differentiators (Production-Grade Engineering)

### A. Performance: Sub-100ms Analytics (Redis Layer)
While standard applications often suffer from "Dashboard Lag" as the database grows, Zorvyn implements a **Redis-backed speed layer**. Critical analytics (Category breakdowns, Monthly trends) are served from memory with a custom-keyed invalidation strategy.

### B. Security: Institutional RBAC & Audit Trails
Zorvyn features a **Compliance-level Audit Stream**. Every modification to the ledger is permanently recorded with an Actor ID and Timestamp, providing the total accountability required in professional financial software.

### C. Meticulous Backend Engineering
I have implemented several sophisticated backend mechanisms in **NestJS** that demonstrate high-level architectural maturity:

-   **Global Data Sanitization**: By implementing a custom `ValidationPipe` combined with `ClassTransformer`, I ensured that all financial data is automatically typed and sanitized at the request gate. This prevents numeric-to-string mismatches and acts as a primary defense against malformed API payloads.
-   **Resilient CORS Handshaking**: I engineered a defensive origin-cleansing utility in `main.ts` that dynamically handles the infrastructure nuances between Vercel and Render (e.g., trailing slashes and whitespace). This ensures that the frontend-to-backend handshake never breaks on production cloud migrations.
-   **Atomic Seeding**: The production hydration script uses **Prisma Upserts** and transaction-safe cleanup to ensure the database can be reset to a "demo-perfect" state at any time without data duplication or key conflicts.

### D. Meticulous Frontend Polish
-   **Localization (₹)**: Replaced generic symbols with the **Indian Rupee (₹)** across all dashboard cards, ledger tables, and entry modals for a personalized local experience.
-   **Chronological Integrity**: Optimized the sorting algorithm so that new entries automatically appear at the top. I also implemented a **"Date Cap" at April 5, 2026** for all seeded records to ensure financial realism.
-   **Silent RBAC Guarding**: Implemented **Silent Guards** in the frontend fetcher. Sensitive pages (Users/Audit) detect permissions early and fail gracefully without triggering 403 error popups, preserving the user flow.

---

## 3. Technical Architecture & Rationale

-   **Persistence**: **PostgreSQL** with **Prisma ORM**. I chose Prisma for its type-safe query generation, ensuring that data-type mismatches never reach the production database.
-   **Containerization**: The entire ecosystem is orchestrated via **Docker**. This eliminates "It works on my machine" issues and ensures a 1-click deployment for anyone on the team.
-   **UI Philosophy (Obsidian Forge)**: A custom-built design system. I avoided "generic" templates to create a deep-dark, neon-accented aesthetic that reflects a professional trading environment.

---

## 4. Engineering Challenges Overcome
-   **Platform Portability**: Configured custom **Prisma Binary Targets** to ensure the database engine operates seamlessly on lightweight Alpine Linux containers.
-   **Production Seeding Automation**: Engineered a custom Docker startup sequence that pre-compiles and executes the database seed using compiled JavaScript, ensuring the project is "Ready-to-Use" immediately upon build.

---

## 5. Local Orchestration (1-Click Launch)
```bash
# High-fidelity launch including all infrastructure
docker-compose up --build
```

---

*Zorvyn Finance is a proof-of-concept for how financial data should be handled: securely, accurately, and at scale. I am excited to discuss the architectural decisions and engineering tradeoffs that made this production launch a success.*
