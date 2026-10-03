# Digital Marketplace

### Full-Stack Digital Products & Creator Marketplace

Digital Marketplace is a full-stack platform for selling and managing digital products online.

The platform provides a complete workflow covering user accounts, digital product publishing, product management, purchases, points, user interactions, custom orders, and content management.

The project was independently designed and developed from the backend and database layer to the frontend and deployment infrastructure.

---

## Overview

The platform was originally designed for a digital-product marketplace where creators can publish and manage their own works while users can browse, purchase, and access digital resources.

Instead of building a simple product catalog, the system provides a complete marketplace workflow:

```text
Creator
   │
   ├── Upload Product
   ├── Manage Product
   └── Provide Custom Services
   │
   ▼
Marketplace
   │
   ├── Product Discovery
   ├── Product Details
   ├── Purchase
   └── Digital Delivery
   │
   ▼
User
   │
   ├── Account
   ├── User Center
   ├── Points
   ├── Messages
   └── Purchase History
```

---

# Key Features

## User System

* User registration and authentication
* Login / logout
* User profile
* User center
* Account management
* Purchase history
* User-specific permissions

---

## Digital Product Marketplace

Creators can publish and manage digital products through the platform.

Features include:

* Product creation
* Product editing
* Product descriptions
* Product pricing
* Product categories
* Product resource management
* Product publishing
* Product status management
* Digital product delivery

---

## Creator / Upload System

The platform provides interfaces for creators to upload and manage their own works.

```text
Creator
   │
   ▼
Create Product
   │
   ├── Title
   ├── Description
   ├── Price
   ├── Cover
   └── Resource
   │
   ▼
Review / Publish
   │
   ▼
Marketplace
```

This allows the marketplace to support multiple creators and a growing product catalog.

---

# Points System

A built-in points system provides an additional user engagement mechanism.

Users can:

* Earn points
* Spend points
* View point history
* Exchange points for eligible products or services

The system keeps track of point transactions to provide a clear record of account changes.

Example:

```text
User
 │
 ├── Earn Points
 │
 ├── Point Balance
 │
 └── Spend Points
        │
        ▼
     Product
```

---

# Custom Order System

The platform also supports custom development / customization requests.

Users can submit requirements for customized work, while the system provides a structured workflow for managing these requests.

Example workflow:

```text
User
  │
  ▼
Submit Requirement
  │
  ▼
Custom Order
  │
  ├── Requirement
  ├── Communication
  ├── Status
  └── Delivery
  │
  ▼
Completed
```

This allows the platform to support both:

* Standard digital products
* Custom development services

---

# Message / Guestbook System

A message system allows users to interact with products and the platform.

The system supports:

* User messages
* Product-related messages
* Guestbook functionality
* User identity association
* Message management

---

# System Architecture

```text
                         ┌─────────────────────┐
                         │       Client        │
                         │  Web / Mobile Web   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │       Nginx         │
                         │ Reverse Proxy / SSL  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Node.js API      │
                         │                     │
                         │ Authentication      │
                         │ User Management     │
                         │ Product Management  │
                         │ Orders              │
                         │ Points              │
                         │ Messages            │
                         │ Custom Orders       │
                         └──────────┬──────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │   MongoDB    │    │ File Storage │    │ Payment API  │
        │              │    │              │    │              │
        │ Users        │    │ Digital      │    │ Payment      │
        │ Products     │    │ Resources    │    │ Callbacks    │
        │ Orders       │    │              │    │ Verification │
        │ Points       │    │              │    │              │
        │ Messages     │    │              │    │              │
        └──────────────┘    └──────────────┘    └──────────────┘
```

---

# Backend Architecture

The backend follows a modular service-oriented structure.

```text
Request
  │
  ▼
Route
  │
  ▼
Controller
  │
  ▼
Service
  │
  ├── User Service
  ├── Product Service
  ├── Order Service
  ├── Point Service
  ├── Message Service
  └── Custom Order Service
  │
  ▼
Database / External Services
```

This separation keeps business logic independent from HTTP request handling and makes individual modules easier to maintain.

---

# Data Model

The core data entities include:

```text
User
 │
 ├── Orders
 ├── Point Transactions
 ├── Messages
 └── Custom Orders

Product
 │
 ├── Creator
 ├── Category
 ├── Price
 ├── Resource
 └── Product Metadata

Order
 │
 ├── User
 ├── Product
 ├── Amount
 ├── Payment Status
 └── Delivery Status

Point Transaction
 │
 ├── User
 ├── Amount
 ├── Type
 └── Reference

Custom Order
 │
 ├── User
 ├── Requirement
 ├── Status
 └── Delivery Information
```

---

# Payment Flow

The payment workflow validates the transaction on the server side instead of trusting the client-side payment result.

```text
User
 │
 ▼
Create Order
 │
 ▼
Payment Gateway
 │
 ▼
Payment Callback
 │
 ▼
Server-side Verification
 │
 ├── Order ID
 ├── Amount
 ├── Payment Status
 └── Transaction Reference
 │
 ▼
Update Order
 │
 ▼
Grant Product Access
```

This prevents clients from directly modifying payment status or purchase results.

---

# Technology Stack

## Backend

* Node.js
* Express.js
* JavaScript

## Frontend

* HTML
* CSS
* JavaScript
* React / Vue where applicable

## Database

* MongoDB
* Redis where applicable

## Infrastructure

* Linux
* Nginx
* Docker
* VPS

## Authentication & Security

* JWT
* HTTP cookies
* Password hashing
* Authentication middleware
* Authorization checks
* Server-side validation

---

# Project Structure

```text
digital-marketplace/
│
├── server/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── config/
│
├── client/
│   ├── pages/
│   ├── components/
│   ├── assets/
│   └── utils/
│
├── public/
│
├── scripts/
│
├── tests/
│
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

---

# Getting Started

## Requirements

* Node.js 20+
* MongoDB
* Redis (if enabled)
* Nginx (production)
* Docker (optional)

---

## Installation

Clone the repository:

```bash
git clone https://github.com/TangGuo11/Digital-Marketplace-Platform.git

cd digital-marketplace
```

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Configure the required environment variables.

---

# Environment Variables

Example:

```env
NODE_ENV=development

PORT=3000

MONGO_URI=mongodb://localhost:27017/digital_marketplace

JWT_SECRET=your_secret

REDIS_URL=redis://localhost:6379

PAYMENT_API_KEY=your_payment_api_key
```

> Never commit real credentials, API keys, payment secrets, or private configuration to the repository.

---

# Running the Project

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Using Docker:

```bash
docker compose up -d
```

---

# Deployment

A typical production deployment uses:

```text
Internet
   │
   ▼
Nginx
   │
   ▼
Node.js Application
   │
   ├── MongoDB
   ├── Redis
   ├── File Storage
   └── Payment Provider
```

Nginx acts as the reverse proxy and handles HTTPS termination and request forwarding.

The Node.js application handles business logic and API requests, while MongoDB stores structured application data.

---

# Engineering Challenges

## 1. Building a Complete Marketplace

The project combines multiple business modules into a single platform:

* Authentication
* Product management
* Orders
* Payments
* Digital delivery
* Points
* Messages
* Custom orders

This required maintaining consistent relationships between users, products, orders, and transactions.

---

## 2. Secure Payment Verification

Payment callbacks cannot simply be trusted.

The server verifies:

* Order identity
* Expected amount
* Payment status
* Transaction reference
* Order state

before granting access to a purchased resource.

---

## 3. Points Accounting

Points are treated as account transactions rather than simply modifying a balance from the frontend.

This makes it possible to maintain a transaction history and audit how points were earned or spent.

---

## 4. Digital Resource Delivery

Digital products require controlled access after purchase.

The system separates product metadata from the actual resource and controls access based on the user's purchase state.

---

## 5. Modular Business Logic

As the platform grew, different business functions were separated into dedicated services.

This makes the system easier to extend without coupling every feature to a single large controller.

---

# Security Considerations

The production system follows several security practices:

* Server-side input validation
* Authentication middleware
* Authorization checks
* Password hashing
* JWT / cookie-based authentication
* Payment callback verification
* Rate limiting where appropriate
* Protected administrative endpoints
* Environment-based secret management
* HTTPS deployment

---

# Future Improvements

Potential improvements include:

* Multi-creator marketplace accounts
* Advanced creator dashboards
* Product analytics
* Recommendation system
* Full-text product search
* Distributed caching
* Background job processing
* Automated fraud detection
* CDN integration
* More payment providers
* Automated testing and CI/CD
* Microservice extraction for high-load components

---

# Project Status

This repository contains a sanitized version of the project for demonstration and portfolio purposes.

Production credentials, private configuration, payment secrets, and sensitive user data are excluded.

---

## Author

Independently designed and developed as a full-stack digital marketplace project.

The project focuses on:

* Full-stack web development
* Backend architecture
* Database design
* Authentication
* Payment integration
* Digital product delivery
* Points and transaction systems
* User-generated content
* Business workflow design
* Production deployment
