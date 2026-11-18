# Frontend Specification: Microservices E-Commerce Application (`spec.md`)
**Version:** 1.2.0  
**Stack:** React 18/19 (JavaScript `.jsx`), Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons  
**Perimeter Target:** API Gateway (`http://localhost:8000`)  
**Design Language:** Material Design (Subtle elevation, rounded cards, clean shadows, responsive layout)  

---

## 1. Overview & Non-Goals

### 1.1. System Overview
The frontend is a single-page application (SPA) acting as the customer-facing and administrative interface for an enterprise e-commerce platform. It interfaces exclusively with the `gateway_service` on Port 8000. All downstream service invocations (`product_service:8080`, `inventory_service:8081`, `order_service:8082`, `payment_service:8084`) are coordinated and secured through the Gateway via JWT Bearer authentication and header injection.

### 1.2. Core User Personas
1. **Shopper / Customer:** Browses products dynamically by category chips, adds items to an ephemeral cart, performs 1-click "Buy Now", and pays via an in-page Razorpay modal.
2. **Administrator:** Authenticated with `ROLE_ADMIN`, accesses a protected `/admin` dashboard to publish new catalog products and initialize inventory stock.

### 1.3. Explicit Scope & Non-Goals
- **Category-Based Browsing:** Catalog discovery relies exclusively on dynamic category chips (*All*, *Fragrances*, *Beauty*, *Groceries*, etc.) fetching from `/api/v1/products/categories`. Free-text search is omitted.
- **In-Page Razorpay Checkout:** Uses Razorpay Standard Checkout SDK (`checkout.js`) directly in-modal (zero new tabs or external redirects).
- **Material Design:** Built using pure Tailwind CSS with elevation hierarchy, rounded cards, and clean typography.
- **Strict Isolation:** Code is 100% contained within the `frontend/` directory.
- **No GKE / Docker in Scope:** Focused entirely on a clean, responsive Vite development and production build.

---

## 2. Directory Layout & Architecture

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── api/
│   │   ├── client.js             <-- Central Axios instance (Base URL, JWT injection, 401 interceptor)
│   │   ├── authApi.js            <-- Register, Password Login, Send OTP, OTP Login
│   │   ├── productApi.js         <-- Catalog fetching by page & category, Categories, Admin product creation
│   │   ├── cartApi.js            <-- Fetch cart, Add item, Update quantity (+/-), Remove item
│   │   ├── orderApi.js           <-- Cart checkout & Instant Buy Now checkout
│   │   └── userApi.js            <-- Fetch profile & update default delivery address
│   │
│   ├── context/
│   │   ├── AuthContext.jsx       <-- User authentication state, token persistence, login/logout
│   │   └── CartContext.jsx       <-- Ephemeral cart state, badge counter, slide-over drawer toggle
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx        <-- Brand logo, Category navigation, Admin link, Profile & Cart buttons
│   │   │   └── Footer.jsx        <-- Minimalistic material footer
│   │   ├── product/
│   │   │   ├── ProductCard.jsx   <-- Material elevation card, image, price in ₹, Add to Cart & Buy Now
│   │   │   └── CategoryPills.jsx <-- Dynamic horizontal category chips (All, Fragrances, Beauty, etc.)
│   │   ├── cart/
│   │   │   └── CartDrawer.jsx    <-- Right-side slide-over drawer with line items, subtotal, and checkout
│   │   ├── checkout/
│   │   │   ├── BuyNowModal.jsx   <-- Instant single-item purchase modal with address pre-fill
│   │   │   └── RazorpayModal.js  <-- In-page Razorpay Checkout SDK loader and modal launcher
│   │   ├── auth/
│   │   │   └── AuthModal.jsx     <-- Material tabbed modal: [Password Login] | [OTP Login] | [Register]
│   │   └── common/
│   │       ├── Alert.jsx         <-- Floating material feedback alert (Success, Error, Warning)
│   │       └── LoadingSpinner.jsx<-- Lightweight SVG spinner
│   │
│   ├── pages/
│   │   ├── HomePage.jsx          <-- Product catalog grid with pagination and category filtering
│   │   ├── ProfilePage.jsx       <-- User profile details, default shipping address update, password reset
│   │   ├── OrderSuccessPage.jsx  <-- Post-payment confirmation celebration screen with order receipt
│   │   └── AdminPage.jsx         <-- Protected `/admin` view for adding products and initializing stock
│   │
│   ├── utils/
│   │   └── formatters.js         <-- Currency formatter (₹), date formatter, string helpers
│   │
│   ├── App.jsx                   <-- React Router routes & global layout shell
│   ├── main.jsx                  <-- Application entrypoint with Context Providers
│   └── index.css                 <-- Tailwind CSS directives
│
├── index.html                    <-- Contains Razorpay checkout.js script tag
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 3. Data Models & API Contracts

### 3.1. Categories (`GET /api/v1/products/categories`)
```javascript
[
  { "id": 1, "name": "Fragrances", "description": "Luxury perfumes and unisex scents" },
  { "id": 2, "name": "Beauty & Skincare", "description": "Palettes, mirrors, and facial care" },
  { "id": 3, "name": "Groceries", "description": "Daily staples, fruits, and essentials" },
  { "id": 4, "name": "Fresh Produce", "description": "Farm fresh meats and vegetables" },
  { "id": 5, "name": "Cosmetics", "description": "Lipsticks, mascaras, and nail care" },
  { "id": 6, "name": "Health & Nutrition", "description": "Protein powders and health drinks" },
  { "id": 7, "name": "Electronics", "description": "Displays, laptops, and smart gadgets" },
  { "id": 8, "name": "Kitchen & Home", "description": "Kitchen tools and food storage" },
  { "id": 9, "name": "Computers", "description": "High-performance laptops and notebooks" },
  { "id": 10, "name": "Fashion & Apparel", "description": "Shirts, tees, and apparel" }
]
```

### 3.2. Products (`GET /api/v1/products?categoryId=...&page=0&size=12`)
```javascript
{
  content: [
    {
      id: "c024894d-adc4-4cde-a9eb-dc525d533886",
      name: "Essence Mascara Lash Princess - Edition 1",
      description: "Volumizing and lengthening mascara formula.",
      price: 949, // Stored in whole Rupees
      categoryId: 5,
      status: "ACTIVE",
      primaryImageUrl: "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp"
    }
  ],
  totalPages: 10,
  totalElements: 120,
  number: 0
}
```

### 3.3. Cart State (`GET /api/v1/cart`)
```javascript
{
  items: [
    {
      productId: "c024894d-...",
      name: "Essence Mascara Lash Princess",
      quantity: 2,
      unitPrice: 949,
      subtotal: 1898,
      imageUrl: "..."
    }
  ],
  totalAmount: 1898,
  totalCount: 2
}
```

---

## 4. In-Page Razorpay Checkout Modal Flow

```javascript
// Native In-Page Razorpay Checkout (Zero Tab Redirections)
const rzp = new window.Razorpay({
  key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_YourKeyId",
  amount: order.totalAmount * 100, // paise
  currency: "INR",
  name: "Apex E-Commerce",
  description: `Order ${order.orderId}`,
  prefill: {
    name: user.fullName,
    email: user.email,
    contact: user.phoneNumber || ""
  },
  theme: { color: "#4F46E5" },
  handler: function (response) {
    // Payment verified on gateway
    navigate(`/order-success?order_id=${order.orderId}&payment_id=${response.razorpay_payment_id}`);
  }
});
rzp.open();
```

---

## 5. Network Layer & Token Interceptor

```javascript
// src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request: Injects JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: Intercepts 401 Session Expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new Event('auth:session_expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
```
