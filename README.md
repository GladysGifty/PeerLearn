# PeerLearn – Peer-to-Peer Learning Platform

## About the Project

PeerLearn is a web-based peer-to-peer learning platform that allows students to share knowledge, discover peer tutors, and learn new skills from fellow students. The platform encourages collaborative learning by connecting students who want to learn with students who can teach.

## Features

- **User Authentication:** Register and log in as a student or tutor.
- **Tutor Profiles:** Create tutor profiles with subjects, descriptions, year of study, and learning mode.
- **Explore Tutors:** Browse available peer tutors and their subjects.
- **Learning Sessions:** Request learning sessions and manage session requests.
- **Credit System:** New users receive 10 welcome credits. Students use credits to request sessions, and tutors can earn credits when sessions are completed.
- **MongoDB Database:** Store user accounts, tutor profiles, and session information.

## Technologies Used

**Frontend**
- React.js
- Vite
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js
- MongoDB
- MongoDB Node.js Driver
- JSON Web Tokens (JWT)
- bcryptjs

## Project Structure

```text
PeerLearn/
├── public/
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── Auth.jsx
│   ├── BecomeTutor.jsx
│   ├── SessionRequests.jsx
│   ├── index.css
│   └── main.jsx
├── server/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Installation and Setup

### Prerequisites

Install the following before running the project:

- Node.js and npm
- Git
- MongoDB Atlas account or a compatible MongoDB deployment

### 1. Clone the Repository

```bash
git clone https://github.com/GladysGifty/PeerLearn.git
cd PeerLearn
```

### 2. Set Up the Frontend

Install the frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually `http://localhost:5173`.

### 3. Set Up the Backend

Open another terminal and run:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` folder with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_private_secret
PORT=5000
```

Replace the example values with your own configuration. Never upload your `.env` file or expose your credentials publicly.

Start the backend:

```bash
node server.js
```

The backend should run on port 5000 unless configured otherwise.

## Learning Outcomes

This project provides practical experience in frontend development, REST API integration, database connectivity, user authentication, and full-stack web application development. It demonstrates how React, Node.js, Express, and MongoDB can work together to build a collaborative learning platform.

## Future Enhancements

- Real-time communication between students and tutors
- Session scheduling and reminders
- Student feedback and tutor reviews
- Improved search and filtering
- Online deployment and responsive design improvements

## GitHub Repository

[PeerLearn – GitHub](https://github.com/GladysGifty/PeerLearn)

## Author

**Gladys Gifty**

B.Tech – Computer Science and Engineering (Artificial Intelligence and Machine Learning)
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
