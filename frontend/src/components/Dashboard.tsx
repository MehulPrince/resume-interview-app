import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Video,
  Clock,
  CheckCircle,
  Play,
  Trash2,
  Upload,
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { resumeAPI, interviewAPI } from "../services/api";

interface Resume {
  _id: string;
  fileName: string;
  parsedData: {
    skills: string[];
    projects: any[];
    internships: any[];
    education: any[];
    experience: any[];
  };
  createdAt: string;
}

interface Interview {
  _id: string;
  status: "pending" | "in-progress" | "completed";
  totalQuestions: number;
  currentQuestionIndex: number;
  startTime?: string;
  endTime?: string;
  resumeId: {
    fileName: string;
  };
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInterview, setCreatingInterview] = useState<string | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resumesRes, interviewsRes] = await Promise.all([
        resumeAPI.getAll(),
        interviewAPI.getAll(),
      ]);
      setResumes(resumesRes.data);
      setInterviews(interviewsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      await resumeAPI.upload(file);
      await fetchData(); // Refresh the data
    } catch (error: any) {
      alert(error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleCreateInterview = async (resumeId: string) => {
    setCreatingInterview(resumeId);
    try {
      const response = await interviewAPI.create(resumeId);
      const created = response.data.interview;
      const id = created?._id || created?.id;
      if (!id) {
        throw new Error("Invalid interview id from server");
      }
      // Navigate to the interview session; list will refresh next load
      navigate(`/interview/${id}`);
    } catch (error) {
      console.error("Error creating interview:", error);
    } finally {
      setCreatingInterview(null);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (window.confirm("Are you sure you want to delete this resume?")) {
      try {
        await resumeAPI.delete(resumeId);
        setResumes((prev) => prev.filter((r) => r._id !== resumeId));
      } catch (error) {
        console.error("Error deleting resume:", error);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "in-progress":
        return <Play className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">
                AI Interview Pro
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resume Upload Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Upload Resume
          </h2>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload your resume
            </p>
            <p className="text-gray-600 mb-4">
              Drag and drop your PDF or DOCX file here, or click to browse
            </p>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md cursor-pointer transition-colors ${
                uploading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {uploading ? "Uploading..." : "Choose File"}
            </label>
            <div className="mt-4 text-center text-sm text-gray-500">
              Supported formats: PDF, DOCX (Max 10MB)
            </div>
          </div>
        </div>

        {/* Resumes Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Your Resumes
          </h2>
          {resumes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No resumes uploaded
              </h3>
              <p className="text-gray-600">
                Upload your first resume to start practicing interviews
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resumes.map((resume) => (
                <div
                  key={resume._id}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {resume.fileName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(resume.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteResume(resume._id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Skills Found:
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {resume.parsedData.skills
                        .slice(0, 5)
                        .map((skill, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      {resume.parsedData.skills.length > 5 && (
                        <span className="text-xs text-gray-500">
                          +{resume.parsedData.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCreateInterview(resume._id)}
                    disabled={creatingInterview === resume._id}
                    className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      creatingInterview === resume._id
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {creatingInterview === resume._id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Interview
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interviews Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Your Interviews
          </h2>
          {interviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No interviews yet
              </h3>
              <p className="text-gray-600">
                Start your first interview by uploading a resume
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {interviews.map((interview) => (
                      <tr key={interview._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {interview.resumeId.fileName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              interview.status
                            )}`}
                          >
                            {getStatusIcon(interview.status)}
                            <span className="ml-1 capitalize">
                              {interview.status}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {interview.currentQuestionIndex} /{" "}
                            {interview.totalQuestions}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (interview.currentQuestionIndex /
                                    interview.totalQuestions) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {interview.status === "completed" ? (
                            <button
                              onClick={() =>
                                navigate(`/results/${interview._id}`)
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Results
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                navigate(`/interview/${interview._id}`)
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {interview.status === "pending"
                                ? "Start"
                                : "Continue"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
