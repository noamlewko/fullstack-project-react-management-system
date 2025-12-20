# Fullstack Project Management System

A fullstack web application for managing projects between service providers (designers) and clients.

The system allows designers to manage projects, workers, suppliers, questionnaires, and project plans, while clients can log in and view their assigned projects through a dedicated dashboard.

---

## Tech Stack

### Frontend
- React
- React Router
- CSS

### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- JWT Authentication

---

## Features

- User registration and login
- JWT-based authentication
- Role-based access (Designer / Client)
- Protected routes
- Project management (create, edit, delete)
- Client-specific dashboards
- Workers and suppliers management
- Questionnaires and project planning pages

---

## Project Structure

project-root/
├── client/
├── server/
├── docs/
├── .gitignore
├── package.json
└── README.md

---

## Setup & Run (Local)

### Install dependencies
npm install

### Environment variables
Create a .env file inside the server directory (see env.example).

### Run the project
npm run dev

---

## Environment Variables

PORT  
MONGO_URI  
JWT_SECRET  

.env files and node_modules are excluded from the repository.
