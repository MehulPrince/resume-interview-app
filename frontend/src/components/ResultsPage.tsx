import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { evaluationAPI } from "../services/api";

type Scores = {
  technicalDepth: number;
  clarity: number;
  confidence: number;
  overall: number;
};

type SummaryResponse = {
  totalQuestions: number;
  completedQuestions: number;
  averageScores: Scores;
  flags: {
    total: number;
    reading: number;
    silence: number;
    irrelevant: number;
  };
  responses: Array<{
    question: string;
    category: string;
    transcript: string;
    evaluation: any;
    duration: number;
    videoAnalysis?: {
      notes?: string;
      attentionLostSeconds?: number;
      multipleFacesDetected?: boolean;
      noFaceDetected?: boolean;
    };
  }>;
};

const ResultsPage: React.FC = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string>("");

  const fetchSummary = async () => {
    if (!interviewId) return;
    try {
      const res = await evaluationAPI.getSummary(interviewId);
      setSummary(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load summary");
    }
  };

  const generateAndLoadReport = async () => {
    if (!interviewId) return;
    setGenerating(true);
    setError("");
    try {
      const gen = await evaluationAPI.generateReport(interviewId);
      const reportId = gen.data?.report?.id;
      if (reportId) {
        const rep = await evaluationAPI.getReport(reportId);
        setReport(rep.data);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchSummary();
      setLoading(false);
    })();
  }, [interviewId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Interview Results
          </h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded shadow text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-3 text-gray-600">Loading results...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>
            )}

            {summary && (
              <div className="bg-white p-6 rounded shadow">
                <h2 className="text-lg font-semibold text-gray-900">
                  Overview
                </h2>
                <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-xs text-gray-500">Total Questions</div>
                    <div className="text-xl font-semibold">
                      {summary.totalQuestions}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-xs text-gray-500">Completed</div>
                    <div className="text-xl font-semibold">
                      {summary.completedQuestions}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-xs text-gray-500">Avg Overall</div>
                    <div className="text-xl font-semibold">
                      {summary.averageScores.overall.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-xs text-gray-500">Flags</div>
                    <div className="text-xl font-semibold">
                      {summary.flags.total}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-sm text-gray-700">Technical Depth</div>
                    <div className="text-2xl font-semibold">
                      {summary.averageScores.technicalDepth.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-sm text-gray-700">Clarity</div>
                    <div className="text-2xl font-semibold">
                      {summary.averageScores.clarity.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-sm text-gray-700">Confidence</div>
                    <div className="text-2xl font-semibold">
                      {summary.averageScores.confidence.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Per-question details from summary */}
                <div className="mt-6">
                  <h3 className="text-md font-semibold text-gray-900">
                    Per-question details
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {summary.responses.map((r, i) => (
                      <li key={i} className="p-4 rounded bg-gray-50">
                        <div className="text-sm text-gray-500">
                          Q{i + 1} ({r.category})
                        </div>
                        <div className="font-medium text-gray-900 mt-1">
                          {r.question}
                        </div>
                        <div className="mt-2 text-gray-700">
                          <span className="text-sm text-gray-500">
                            Transcript:
                          </span>
                          <div className="mt-1 whitespace-pre-wrap">
                            {r.transcript}
                          </div>
                        </div>
                        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                          <div className="p-2 bg-white rounded border">
                            <div className="text-gray-500">Technical</div>
                            <div className="font-semibold">
                              {r.evaluation?.technicalDepth?.score ?? "-"} / 5
                            </div>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <div className="text-gray-500">Clarity</div>
                            <div className="font-semibold">
                              {r.evaluation?.clarity?.score ?? "-"} / 5
                            </div>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <div className="text-gray-500">Confidence</div>
                            <div className="font-semibold">
                              {r.evaluation?.confidence?.score ?? "-"} / 5
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-sm">
                          <span className="text-gray-500">Sentiment:</span>
                          <span className="ml-2 font-medium capitalize">
                            {r.evaluation?.sentiment ?? "n/a"}
                          </span>
                        </div>
                        {r.evaluation?.flags && (
                          <div className="mt-2 text-xs text-gray-600">
                            Flags:{" "}
                            {r.evaluation.flags.reading ? "reading " : ""}
                            {r.evaluation.flags.silence ? "silence " : ""}
                            {r.evaluation.flags.irrelevant ? "irrelevant" : ""}
                          </div>
                        )}
                        {r.videoAnalysis && (
                          <div className="mt-3 text-sm">
                            <div className="text-gray-500">Video analysis:</div>
                            <div className="mt-1">
                              {r.videoAnalysis.notes ||
                                "No significant issues detected."}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Attention lost:{" "}
                              {r.videoAnalysis.attentionLostSeconds ?? 0}s ·
                              Multiple faces:{" "}
                              {r.videoAnalysis.multipleFacesDetected
                                ? "Yes"
                                : "No"}{" "}
                              · No face:{" "}
                              {r.videoAnalysis.noFaceDetected ? "Yes" : "No"}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Final Report
                </h2>
                <button
                  onClick={generateAndLoadReport}
                  disabled={generating}
                  className={`px-4 py-2 rounded text-white ${
                    generating ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {generating ? "Generating..." : "Generate Report"}
                </button>
              </div>

              {report ? (
                <div className="mt-4 grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900">Summary</h3>
                    <p className="mt-2 text-gray-700">
                      {typeof report?.summary?.summary === "string"
                        ? report.summary.summary
                        : ""}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Strengths</h3>
                    <ul className="mt-2 list-disc list-inside text-gray-700 space-y-1">
                      {(
                        report.summary?.strengths ||
                        report.strengths ||
                        []
                      ).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Weaknesses</h3>
                    <ul className="mt-2 list-disc list-inside text-gray-700 space-y-1">
                      {(
                        report.summary?.weaknesses ||
                        report.weaknesses ||
                        []
                      ).map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Recommendations
                    </h3>
                    <ul className="mt-2 list-disc list-inside text-gray-700 space-y-1">
                      {(
                        report.summary?.recommendations ||
                        report.recommendations ||
                        []
                      ).map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  {report.summary?.ai?.hireability !== undefined && (
                    <div>
                      <h3 className="font-medium text-gray-900">Hireability</h3>
                      <p className="mt-2 text-gray-700">
                        {report.summary.ai.hireability}/100
                      </p>
                    </div>
                  )}
                  {Array.isArray(report.summary?.ai?.perQuestion) && (
                    <div className="md:col-span-2">
                      <h3 className="font-medium text-gray-900">
                        Per-question analysis
                      </h3>
                      <ul className="mt-2 space-y-2 text-gray-700">
                        {report.summary.ai.perQuestion.map(
                          (p: any, i: number) => (
                            <li key={i} className="p-3 rounded bg-gray-50">
                              <div className="text-sm text-gray-500">
                                Q{i + 1}: {p.question}
                              </div>
                              <div>{p.assessment}</div>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-gray-600">
                  Generate the final report to see sentiment, strengths,
                  weaknesses, and hireability guidance.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
