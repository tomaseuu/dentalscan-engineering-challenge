"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2 } from "lucide-react";

/**
 * CHALLENGE: SCAN ENHANCEMENT
 *
 * Your goal is to improve the User Experience of the Scanning Flow.
 * 1. Implement a Visual Guidance Overlay (e.g., a circle or mouth outline) on the video feed.
 * 2. Add real-time feedback to the user (e.g., "Face not centered", "Move closer").
 * 3. Ensure the UI feels premium and responsive.
 */

type QuickMessage = {
  id: string;
  content: string;
  sender: string;
  createdAt: string;
};

export default function ScanningFlow() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camReady, setCamReady] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGoodPosition, setIsGoodPosition] = useState(false);
  const notificationSentRef = useRef(false);
  const scanIdRef = useRef(`scan-${Date.now()}`);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");

  const VIEWS = [
    {
      label: "Front View",
      instruction: "Smile and center your mouth in the guide.",
    },
    {
      label: "Left View",
      instruction:
        "Turn your head to the left and keep your mouth in the guide.",
    },
    {
      label: "Right View",
      instruction:
        "Turn your head to the right and keep your mouth in the guide.",
    },
    {
      label: "Upper Teeth",
      instruction:
        "Tilt your head back, open wide, and keep your mouth in the guide.",
    },
    {
      label: "Lower Teeth",
      instruction:
        "Tilt your head down, open wide, and keep your mouth in the guide.",
    },
  ];

  // Simple scan quality feedback for the guide and status
  const scanStatusText = isGoodPosition ? "Good Position" : "Hold Still";
  const scanStatusStyle = isGoodPosition
    ? "border-green-400 text-green-200 bg-green-900/50"
    : "border-yellow-400 text-yellow-200 bg-yellow-900/50";
  const guideStyle = isGoodPosition ? "border-green-400" : "border-yellow-400";

  // Each scan step starts in "Hold Still", then turns green after a short delay
  useEffect(() => {
    if (!camReady || currentStep >= VIEWS.length) {
      setIsGoodPosition(false);
      return;
    }

    setIsGoodPosition(false);

    const timer = window.setTimeout(() => {
      setIsGoodPosition(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [camReady, currentStep, VIEWS.length]);

  // Start the camera when the scan screen loads
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCamReady(true);
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    }
    startCamera();
  }, []);

  // Send one notification after the final scan photo
  const sendScanCompleteNotification = useCallback(async () => {
    if (notificationSentRef.current) return;

    notificationSentRef.current = true;

    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scanId: scanIdRef.current,
          status: "completed",
          userId: "demo-clinic",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create notification");
      }
    } catch (err) {
      notificationSentRef.current = false;
      console.error("Failed to send scan notification", err);
    }
  }, []);

  // Save a quick patient message for the clinic
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return;

    setIsSendingMessage(true);
    setMessageError("");

    try {
      const response = await fetch("/api/messaging", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: "demo-patient",
          content: messageText,
          sender: "patient",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      setMessages((prev) => [...prev, data.message]);
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message", err);
      setMessageError("Message failed to send. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
  }, [messageText]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImages((prev) => [...prev, dataUrl]);
      setCurrentStep((prev) => {
        const nextStep = prev + 1;

        // The fifth photo completes this mock scan.
        if (nextStep === VIEWS.length) {
          void sendScanCompleteNotification();
        }
        return nextStep;
      });
    }
  }, [sendScanCompleteNotification, VIEWS.length]);

  return (
    <div className="flex flex-col items-center bg-black min-h-screen text-white">
      {/* Header */}
      <div className="p-4 w-full bg-zinc-900 border-b border-zinc-800 flex justify-between">
        <a
          href="/"
          className="font-bold text-blue-400 hover:text-blue-300 transition-colors"
        >
          DentalScan AI
        </a>

        <span className="text-xs text-zinc-500">
          Step {Math.min(currentStep + 1, VIEWS.length)}/{VIEWS.length}
        </span>
      </div>

      {/* Main Viewport */}
      <div className="relative mt-6 w-full max-w-md aspect-[3/4] bg-zinc-950 overflow-hidden flex items-center justify-center">
        {currentStep < VIEWS.length ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Guidance Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-8 pt-24">
              <div
                className={`relative flex aspect-[2/1] w-[58%] max-w-[250px] items-center justify-center rounded-full border-4 transition-colors duration-300 ${guideStyle}`}
              ></div>
            </div>

            {/* Feedback */}
            <div className="absolute left-4 top-4">
              <div
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors duration-300 ${scanStatusStyle}`}
              >
                {scanStatusText}
              </div>
            </div>

            {/* Instruction Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t px-6 pb-12 from-black text-center">
              <p className="text-sm font-medium">
                {VIEWS[currentStep].instruction}
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col gap-5 p-6">
            <div className="text-center">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold">Scan Complete</h2>
              <p className="text-zinc-400 mt-2">
                Your scan is ready for clinic review.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left">
              <h3 className="font-semibold text-white">Quick Message</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Send a note to the clinic about symptoms, sensitivity, or
                questions.
              </p>

              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                rows={4}
                className="mt-4 w-full resize-none rounded-md border border-zinc-700 bg-black p-3 text-sm text-white outline-none focus:border-blue-400"
                placeholder="Example: I have sensitivity on my lower left side."
              />

              {messageError && (
                <p className="mt-2 text-sm text-red-400">{messageError}</p>
              )}

              <button
                onClick={handleSendMessage}
                disabled={isSendingMessage || !messageText.trim()}
                className="mt-3 w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isSendingMessage ? "Sending..." : "Send Message"}
              </button>

              {messages.length > 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Recent Messages
                  </p>

                  <div className="mt-2 space-y-2">
                    {messages.map((message) => (
                      <div key={message.id} className="rounded-md bg-black p-3">
                        <p className="text-xs text-zinc-500">
                          {message.sender}
                        </p>
                        <p className="text-sm text-zinc-100">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-10 w-full flex justify-center">
        {currentStep < VIEWS.length && (
          <button
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Camera className="text-black" />
            </div>
          </button>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 p-4 overflow-x-auto w-full justify-center">
        {VIEWS.map((v, i) => (
          <div
            key={i}
            className={`w-16 h-20 rounded border-2 shrink-0 ${i === currentStep ? "border-blue-500 bg-blue-500/10" : "border-zinc-800"}`}
          >
            {capturedImages[i] ? (
              <img
                src={capturedImages[i]}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-700">
                {i + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
