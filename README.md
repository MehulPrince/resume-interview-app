# AI-Powered Interview Practice Application

A full-stack MERN application that helps users practice interviews using AI-powered feedback. Users can upload their resumes, receive personalized interview questions, and get detailed evaluations of their responses.

## 🚀 Features

- **Resume Upload & Parsing**: Upload PDF/DOCX resumes and extract key information
- **AI-Generated Questions**: Get personalized interview questions based on resume content
- **Video/Audio Recording**: Practice with real-time video and audio capture
- **AI Evaluation**: Receive detailed feedback on technical depth, communication, and confidence
- **Comprehensive Reports**: Get structured feedback with strengths, weaknesses, and recommendations
- **User Authentication**: Secure login/registration system

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons

### Backend

- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **OpenAI/OpenRouter** for AI services
- **Multer** for file uploads
- **pdf-parse** & **docx** for resume parsing

## 📁 Project Structure

```
resume-interview-app/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Authentication middleware
│   ├── services/        # AI and business logic
│   ├── uploads/         # File storage
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── App.tsx      # Main app component
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- OpenRouter API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd resume-interview-app
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**

   ```bash
   cd frontend
   npm install
   ```

4. **Environment Configuration**

   Create `.env` file in the backend directory:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   OPENAI_API_KEY=your_openrouter_api_key
   PORT=5000
   ```

5. **Start the Application**

   **Terminal 1 - Backend:**

   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 - Frontend:**

   ```bash
   cd frontend
   npm start
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📋 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Resume Management

- `POST /api/resume/upload` - Upload resume
- `GET /api/resume` - Get user resumes
- `DELETE /api/resume/:id` - Delete resume

### Interview Management

- `POST /api/interview/create` - Create interview
- `GET /api/interview/:id` - Get interview details
- `POST /api/interview/:id/submit-answer` - Submit answer

### Evaluation

- `POST /api/evaluation/evaluate` - Evaluate response
- `GET /api/evaluation/report/:interviewId` - Get evaluation report

## 🎯 Usage

1. **Register/Login**: Create an account or sign in
2. **Upload Resume**: Upload your PDF or DOCX resume
3. **Start Interview**: Begin a practice interview session
4. **Answer Questions**: Respond to AI-generated questions with video/audio
5. **Review Results**: Get detailed feedback and recommendations

## 🔧 Configuration

### MongoDB Setup

1. Create a MongoDB Atlas cluster
2. Get your connection string
3. Add it to the `.env` file

### AI Services Setup

1. Get an OpenRouter API key from https://openrouter.ai
2. Add it to the `.env` file as `OPENAI_API_KEY`

## 🚀 Deployment

### Backend Deployment

- Deploy to Heroku, Railway, or any Node.js hosting platform
- Set environment variables
- Configure MongoDB connection

### Frontend Deployment

- Build the React app: `npm run build`
- Deploy to Vercel, Netlify, or any static hosting platform
- Update API endpoints to production URLs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- MongoDB for database
- React team for the frontend framework
- Tailwind CSS for styling utilities
