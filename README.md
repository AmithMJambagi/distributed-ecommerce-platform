# High-Throughput E-Commerce Platform

[![Java 21](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot 3.3](https://img.shields.io/badge/Spring%20Boot-3.3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-KRaft-black.svg)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7%20Alpine-red.svg)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Azure%20AKS-326ce5.svg)](https://azure.microsoft.com/en-us/products/kubernetes-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An event-driven e-commerce platform engineered to handle high-concurrency flash sales, zero overselling guarantees, and distributed transaction integrity across microservices.

Features 5 Spring Boot services coordinated via an asynchronous **Choreographed Saga** over **Apache Kafka (KRaft)**, sub-millisecond stock reservation via atomic **Redis Lua scripts**, and an automated **Azure Kubernetes Service (AKS)** deployment with Let's Encrypt TLS.

---

## 🏛️ System Architecture

```
[ Client: React 18 + Vite ] ──REST──> [ Spring Cloud Gateway :8000 ]
                                              │
        ┌───────────────────┬─────────────────┴───────────────┬───────────────────┐
        ▼                   ▼                                 ▼                   ▼
 [ Product Svc ]     [ Inventory Svc ]                 [ Order Svc ]       [ Payment Svc ]
   (Port 8080)         (Port 8081)                       (Port 8082)         (Port 8084)
   Catalog + Redis     Lua Stock Lock                    Redis Cart + Saga   Razorpay Links
        │                   ▲                                 │                   ▲
        │                   └──────── Apache Kafka ───────────┴───────────────────┘
        └───────────────> (KRaft Event Bus: order/inventory/payment topics)
```

### Key Engineering Decisions
* **Sub-Millisecond Stock Reservation**: Flash-sale pre-checks and 10-minute hold leases execute atomically in Redis memory via Lua scripts, shedding 99% of out-of-stock traffic before hitting PostgreSQL.
* **Choreographed Saga Engine**: Eliminates blocking 2PC locks across checkout, stock reservation, and payment settlement. Includes automated compensating refunds for expired holds and late-arriving payments.
* **Ephemeral Cart State**: Shopping carts live in Redis Hashes ($O(1)$ mutations with a 14-day rolling TTL), keeping PostgreSQL completely free of abandoned cart records.
* **Database-per-Service (Pragmatic Isolation)**: Each microservice connects strictly to its own isolated PostgreSQL schema with zero cross-database queries or shared foreign keys. For cost efficiency on Azure, schemas share a single containerized instance for staging, and can decouple to standalone Azure Database for PostgreSQL Flexible Server instances in production with zero code changes.

---

## 📁 Repository Layout

```text
ecommerce/
├── backend/
│   ├── gateway_service/      # Routing, JWT auth verification, email OTPs
│   ├── product_service/      # Catalog, categories, 2-tier Redis cache index
│   ├── inventory_service/    # Concurrency engine, atomic Lua stock locking
│   ├── order_service/        # Redis cart management, Saga orchestrator
│   ├── payment_service/      # Razorpay integration, HMAC webhook validation
│   └── infra/                # Local Docker Compose for Kafka, Redis, Postgres
├── frontend/                 # React 18 + Vite SPA, Tailwind CSS, Playwright tests
└── k8s/                      # Production Kubernetes manifests (AKS) decoupled by service
```

---

## 🚀 Quickstart (Local Development)

### Prerequisites
* **Java 21 (JDK)**
* **Node.js 20+**
* **Docker & Docker Compose**

### 1. Start Infrastructure (Kafka, Redis, PostgreSQL)
```bash
docker-compose -f backend/infra/kafka-docker-compose.yml up -d
```

### 2. Run the Microservices
In separate terminal windows (or import into your IDE):
```bash
cd backend/gateway_service   && ./mvnw spring-boot:run
cd backend/product_service   && ./mvnw spring-boot:run
cd backend/inventory_service && ./mvnw spring-boot:run
cd backend/order_service     && ./mvnw spring-boot:run
cd backend/payment_service   && ./mvnw spring-boot:run
```

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☸️ Cloud Deployment (Azure AKS)

The `/k8s` directory contains modular manifests decoupled by service:

```bash
# 1. Initialize namespace, configmaps, and secrets
kubectl apply -f k8s/01-init.yaml

# 2. Deploy data layer (Postgres, Redis, Kafka KRaft)
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/kafka.yaml

# 3. Deploy microservices & frontend
kubectl apply -f k8s/gateway-service.yaml
kubectl apply -f k8s/product-service.yaml
kubectl apply -f k8s/inventory-service.yaml
kubectl apply -f k8s/order-service.yaml
kubectl apply -f k8s/payment-service.yaml
kubectl apply -f k8s/frontend.yaml

# 4. Apply Ingress & Cert-Manager Let's Encrypt TLS
kubectl apply -f k8s/cluster-issuer.yaml
kubectl apply -f k8s/04-ingress.yaml
```

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
