# ExpenseLens 🔍💸

ExpenseLens is a modern, full-stack personal finance and expense tracking application designed to give you absolute clarity over your money. 

## 🎯 The Problem It Solves
Tracking personal finances can often feel like a second job. Many people struggle with overspending simply because they lack real-time visibility into their budgets and transaction histories. Existing apps are either too complicated, heavily monetized, or lack modern aesthetics.

**ExpenseLens** solves this by providing a hyper-fast, beautifully designed, and intuitive platform where you can easily log transactions, monitor categorized budgets, and get automated analytics on your spending habits—all from a single, centralized dashboard.

## ✨ Key Features
- **Secure Passwordless-Style Login:** Built-in custom OTP (One Time Password) email verification system to keep your financial data strictly confidential.
- **Dynamic Dashboard:** A premium, real-time dashboard featuring summary cards (Remaining Balance, Income, Expenses, Savings) and an interactive visual breakdown of your spending categories.
- **Budget Management:** Set monthly limits for different categories (Housing, Food, Entertainment) and track exactly how much of your allocated budget you've consumed.
- **Transaction Tracking:** Easily log income and expenses with precise categorization and date tracking.
- **Responsive Design:** Fully optimized to look stunning on both desktop and mobile devices using a modern dark-mode aesthetic with glassmorphism touches.

## 🛠️ How It Was Built (Tech Stack)
This application was built from the ground up using a modern, fully decoupled architecture:

### Frontend
- **Framework:** React.js (Bootstrapped with Vite for lightning-fast HMR)
- **Styling:** TailwindCSS (For custom, utility-first premium styling without heavy CSS files)
- **Routing:** React Router DOM (Client-side routing for instantaneous page transitions)
- **API Communication:** Axios (Configured with interceptors for seamless JWT authentication)
- **Hosting:** Vercel

### Backend
- **Framework:** FastAPI (High-performance Python web framework)
- **ORM:** SQLAlchemy 2.0 (Running in fully asynchronous mode)
- **Database Driver:** `asyncpg` (For incredibly fast, non-blocking database queries)
- **Security:** `bcrypt` for password hashing and `PyJWT` for secure token generation
- **Hosting:** Render (Deployed via Docker container)

### Database
- **Provider:** Neon.tech (Serverless PostgreSQL)
- **Architecture:** Relational database structured to handle users, categorized budgets, transactions, and secure OTP logs.

## 🚀 Live Demo
Experience the app in action here: **[https://expense-lens-eight.vercel.app/](https://expense-lens-eight.vercel.app/)**

---
*Designed & Developed by Albin Thomas*
