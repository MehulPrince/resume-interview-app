import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { interviewAPI } from "../services/api";

type Question = {
  _id: string;
  text: string;
  category?: string;
};

const InterviewSession: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const QUESTION_TIME_LIMIT_SECONDS = 90;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    QUESTION_TIME_LIMIT_SECONDS
  );
  const [mediaError, setMediaError] = useState<string>("");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const fetchCurrent = useCallback(async () => {
    if (!id) return;
    try {
      const res = await interviewAPI.getCurrentQuestion(id);
      if (res.data?.completed) {
        // stop camera/mic before navigating away
        try {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }
        } catch {}
        navigate(`/results/${id}`);
        return;
      }
      setQuestion(res.data.question);
      setProgress(res.data.progress);
      setRemainingSeconds(QUESTION_TIME_LIMIT_SECONDS);
    } catch (e) {
      console.error("Failed to fetch current question", e);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const startInterview = async () => {
    if (!id) return;
    setStarting(true);
    try {
      await interviewAPI.start(id);
      await fetchCurrent();
      // initialize mic/cam and begin recording immediately
      await initMicCam();
      await startRecording();
    } catch (e) {
      console.error("Failed to start interview", e);
    } finally {
      setStarting(false);
    }
  };

  const initMicCam = async () => {
    setMediaError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        const videoEl = videoRef.current as HTMLVideoElement & {
          srcObject: any;
        };
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Mic/Cam init error", err);
      setMediaError(err?.message || "Failed to access camera/microphone");
      throw err;
    }
  };

  const startRecording = async () => {
    if (!mediaStreamRef.current) await initMicCam();
    const stream = mediaStreamRef.current!;
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorder.start(250);
    setRecording(true);
    setRecordingTime(0);
    setRemainingSeconds(QUESTION_TIME_LIMIT_SECONDS);
    timerRef.current = window.setInterval(
      () => setRecordingTime((t) => t + 1),
      1000
    );

    // Simple speech recognition if available
    const SR: any =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let txt = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          txt += e.results[i][0].transcript + " ";
        }
        // accumulate silently, not shown to the user
        setTranscript((prev) => (prev ? prev + " " : "") + txt.trim());
      };
      rec.onerror = () => {};
      rec.start();
      recognitionRef.current = rec;
    }
  };

  const stopRecording = async (): Promise<{ audio?: Blob; video?: Blob }> => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    const mediaRecorder = mediaRecorderRef.current;
    return new Promise((resolve) => {
      if (!mediaRecorder) return resolve({});
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        resolve({ audio: blob });
      };
      mediaRecorder.stop();
    });
  };

  // Enforce per-question countdown and auto-submit
  useEffect(() => {
    if (!recording) return;
    if (remainingSeconds <= 0) {
      (async () => {
        try {
          const { audio } = await stopRecording();
          if (id && question) {
            const resp = await interviewAPI.submitAnswer(id, {
              transcript: transcript.trim() || "(transcript unavailable)",
              questionId: question._id,
              duration: recordingTime,
              audio: audio as any,
            });
            setTranscript("");
            setRecordingTime(0);
            if (resp.data?.completed) {
              try {
                if (mediaStreamRef.current) {
                  mediaStreamRef.current.getTracks().forEach((t) => t.stop());
                  mediaStreamRef.current = null;
                }
              } catch {}
              navigate(`/results/${id}`);
            } else {
              await fetchCurrent();
            }
          }
        } catch (e) {
          console.error("Auto-submit failed", e);
        }
      })();
      return;
    }
    const iv = window.setInterval(() => {
      setRemainingSeconds((s) => s - 1);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [
    recording,
    remainingSeconds,
    id,
    question,
    transcript,
    recordingTime,
    fetchCurrent,
  ]);

  // Cleanup all media resources on unmount
  useEffect(() => {
    return () => {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
          recognitionRef.current = null;
        }
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      } catch {}
    };
  }, []);

  const submitAnswer = async () => {
    if (!id || !question) return;
    setSubmitting(true);
    try {
      let audioBlob: Blob | undefined;
      if (recording) {
        const { audio } = await stopRecording();
        audioBlob = audio;
      }

      const resp = await interviewAPI.submitAnswer(id, {
        transcript: transcript.trim() || "(transcript unavailable)",
        questionId: question._id,
        duration: recordingTime,
        audio: audioBlob as any,
      });

      // Reset state for next question
      setTranscript("");
      setRecordingTime(0);
      const data = resp.data;
      if (data?.completed) {
        // stop media and go to results
        try {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }
        } catch {}
        navigate(`/results/${id}`);
      } else {
        await fetchCurrent();
      }
    } catch (e) {
      console.error("Failed to submit answer", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Interview</h1>
            {progress && (
              <div className="text-sm text-gray-600">
                Q{progress.current} / {progress.total}
              </div>
            )}
          </div>

          {!question ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Your interview has not started yet.
              </p>
              <button
                onClick={startInterview}
                disabled={starting}
                className={`px-4 py-2 rounded text-white ${
                  starting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {starting ? "Starting..." : "Start Interview"}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Question
                </h2>
                <p className="mt-2 text-gray-800">{question.text}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <video
                    ref={videoRef}
                    className="w-full rounded bg-black/5"
                    playsInline
                    autoPlay
                    muted
                  />
                  <div className="mt-3 flex items-center gap-2">
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Stop
                      </button>
                    )}
                    <span className="text-sm text-gray-600">
                      Time: {recordingTime}s • Remaining: {remainingSeconds}s
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    Recording... Your answer is being captured and analyzed.
                  </div>
                  {mediaError && (
                    <div className="mt-2 text-sm text-red-600">
                      {mediaError}
                    </div>
                  )}
                  <div className="mt-3">
                    <button
                      onClick={submitAnswer}
                      disabled={submitting}
                      className={`px-4 py-2 rounded text-white ${
                        submitting
                          ? "bg-gray-400"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {submitting ? "Submitting..." : "Submit Answer"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Live Feedback
          </h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>- Confidence: estimated from voice/video once submitted</li>
            <li>- Sentiment: extracted during evaluation</li>
            <li>- Tips: keep answers structured and concise</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
