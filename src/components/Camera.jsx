"use client";
import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function CameraFeed() {
  // Refs for video & canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Audio & gesture state
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioCtx, setAudioCtx] = useState(null);
  const gainRef = useRef(null);
  const trackRef = useRef(null);

  // Load and play audio once user interacts (browser policy)
  const loadAudio = () => {
    if (audioCtx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Load local audio file or stream
    const audio = new Audio("/sample.mp3");
    audio.loop = true;
    audio.crossOrigin = "anonymous";

    const track = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = 1;

    track.connect(gain).connect(ctx.destination);

    audio.play();
    setAudioLoaded(true);
    setAudioCtx(ctx);
    gainRef.current = gain;
    trackRef.current = track;
  };

  // Start webcam and gesture processing
  useEffect(() => {
    let handLandmarker,
      running = true;

    const startCamera = async () => {
      // 1. Get webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      // 2. Prepare MediaPipe HandLandmarker
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      const handLandmarker = await HandLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        }
      );

      // 3. Process each frame
      const processFrame = async () => {
        if (
          videoRef.current &&
          videoRef.current.readyState === 4 &&
          handLandmarker
        ) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // HandLandmarker API
          const result = await handLandmarker.detectForVideo(video, Date.now());
          // Draw landmarks & compute gesture
          if (result.landmarks && result.landmarks.length > 0) {
            for (const hand of result.landmarks) {
              // Draw points
              for (const lm of hand) {
                ctx.beginPath();
                ctx.arc(
                  lm.x * canvas.width,
                  lm.y * canvas.height,
                  8,
                  0,
                  2 * Math.PI
                );
                ctx.fillStyle = "red";
                ctx.fill();
              }
              // Calculate thumb-index distance (landmarks 4, 8)
              const [thumb, index] = [hand[4], hand[8]];
              const dx = thumb.x - index.x,
                dy = thumb.y - index.y,
                dz = (thumb.z || 0) - (index.z || 0);
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

              // Map to a normalized value (tuned min/max)
              const value = Math.min(
                1,
                Math.max(0, (dist - 0.02) / (0.15 - 0.02))
              );

              // Optionally, smooth the value here for stability

              // Control audio volume
              if (gainRef.current) gainRef.current.gain.value = value;

              // Show debug text
              ctx.font = "bold 24px sans-serif";
              ctx.fillStyle = "lime";
              ctx.fillText(
                `Volume: ${value.toFixed(2)}`,
                hand[8].x * canvas.width + 20,
                hand[8].y * canvas.height
              );
            }
          }
        }
        if (running) requestAnimationFrame(processFrame);
      };
      processFrame();
    };

    startCamera();

    // Cleanup on unmount
    return () => {
      running = false;
      if (audioCtx) audioCtx.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioCtx]);

  return (
    <div>
      <h1>Hand Gesture Audio Control Demo</h1>
      <p>
        <b>How to use:</b> Click "Start Audio", bring your hand in front of the
        camera, & use thumb–index finger distance to set the audio volume. (Try
        opening or closing your fingers!)
      </p>
      {!audioLoaded && (
        <button onClick={loadAudio} style={{ fontSize: 24, padding: 16 }}>
          Start Audio
        </button>
      )}
      <div style={{ position: "relative", width: 640, height: 480 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          width={640}
          height={480}
          style={{ position: "absolute", left: 0, top: 0, opacity: 0 }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}
        />
      </div>
      <p style={{ color: "gray", marginTop: 20 }}>
        <i>
          Note: Works best with good lighting and when entire hand is visible in
          frame.
        </i>
      </p>
    </div>
  );
}
