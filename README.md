# FeesTracker

A professional, modular, and full-stack Fee Management System for tuition institutes and schools. 

This project is designed to help educational institutions track students, manage fees, handle payments, and maintain an organized directory with a beautiful, modern interface.

## 🌟 Key Features

- **Student Directory**: Comprehensive list of students with detailed profiles, school details, and contact info.
- **Fee Management**: Create, update, and track complex fee structures per student or grade.
- **Payment Tracking**: Log partial or full payments, view payment history, and monitor outstanding dues.
- **Smart Excel Sync**: Quickly onboard students and fees by importing Excel data via the Smart Update features.
- **Premium UI**: Designed with Tailwind CSS and Framer Motion for a sleek, responsive, dark-mode friendly user experience.

## 🏗️ Project Architecture

This project is built with a decoupled architecture for maximum reusability and scalability.

### 🏛️ Backend (The API)
- **Framework**: Node.js + Express
- **Database**: Firebase Firestore (via `firebase-admin`)
- **Authentication**: Firebase Admin SDK
- **Features**: RESTful API endpoints for Students, Fees, Payments, and Data Sync.

### 🎨 Frontend (The Web App)
- **Framework**: React + Vite
- **Styling**: Tailwind CSS (Premium Design Tokens)
- **State & Routing**: React Context API + React Router
- **Features**: Interactive Dashboard, Student Directory, Fee Architecture, Excel Smart Sync UI.

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [Firebase Account](https://firebase.google.com/) for setting up Firestore and Authentication.

### 2. Backend Setup
1. Navigate to the `/backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Place your Firebase Admin SDK credentials file (`serviceAccountKey.json`) in the root of the `/backend` folder.
4. Create a `.env` file based on any provided templates (e.g., `PORT=5000`).
5. Start the development server:
   ```bash
   npm run dev
   ```
   *(or `npm start` for production)*

### 3. Frontend Setup
1. Navigate to the `/frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure your backend is running, or set up a `.env` file in the frontend with the necessary API URLs (e.g., `VITE_API_BASE_URL=http://localhost:5000/api`).
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 📄 License

This project is licensed under the MIT License.
