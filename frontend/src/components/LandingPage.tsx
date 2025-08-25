import React from "react";
import { Link } from "react-router-dom";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-6">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          AI-Powered Interview Practice
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload your resume, get personalized questions, and practice with
          AI-powered feedback
        </p>
        <div className="space-x-4">
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            to="/register"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
