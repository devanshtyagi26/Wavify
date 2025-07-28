"use client";
import { useRef, useState, useEffect } from "react";
import { initAudioContext } from "@/utils/AudioController";
import { isFist } from "@/utils/gestureUtils";
import { drawHandLandmarks } from "@/utils/HandVisualiser";
import { loadHandLandmarker } from "@/utils/useHandTracker";

export default function CameraFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioCtx, setAudioCtx] = useState(null);
  const gainRef = useRef(null);
  const pitchRef = useRef(null);
  const bassRef = useRef(null);
  const trackRef = useRef(null);

  const loadAudio = () => {
    if (audioCtx) return;
    const { ctx, audio, gain, bass, track } = initAudioContext("/sample.mp3");

    audio.play();
    setAudioCtx(ctx);
    setAudioLoaded(true);

    gainRef.current = gain;
    bassRef.current = bass;
    trackRef.current = track;
    pitchRef.current = audio;
  };

  useEffect(() => {
    let handLandmarker;
    let running = true;

    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      handLandmarker = await loadHandLandmarker();

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

          const result = await handLandmarker.detectForVideo(video, Date.now());
          const hands = result.landmarks || [];

          drawHandLandmarks(ctx, hands, canvas);

          // Detect if any hand is a fist
          let anyFist = false;
          for (const hand of hands) {
            if (isFist(hand, 0.1)) {
              anyFist = true;
              break;
            }
          }

          if (pitchRef.current && audioLoaded) {
            if (anyFist) {
              pitchRef.current.pause();
            } else if (pitchRef.current.paused) {
              pitchRef.current.play();
            }
          }

          // Volume (left hand)
          if (hands[0]) {
            const dx = hands[0][4].x - hands[0][8].x;
            const dy = hands[0][4].y - hands[0][8].y;
            const dz = (hands[0][4].z || 0) - (hands[0][8].z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const vol = Math.min(1, Math.max(0, (dist - 0.02) / (0.15 - 0.02)));
            if (gainRef.current) gainRef.current.gain.value = vol;
          }

          // Pitch (right hand)
          if (hands[1]) {
            const dx = hands[1][4].x - hands[1][8].x;
            const dy = hands[1][4].y - hands[1][8].y;
            const dz = (hands[1][4].z || 0) - (hands[1][8].z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const pitch =
              0.5 + Math.min(1, Math.max(0, (dist - 0.02) / (0.15 - 0.02)));
            if (pitchRef.current) pitchRef.current.playbackRate = pitch;
          }

          // Bass (between thumbs)
          if (hands.length === 2) {
            const thumb1 = hands[0][4];
            const thumb2 = hands[1][4];
            const dx = thumb1.x - thumb2.x;
            const dy = thumb1.y - thumb2.y;
            const dz = (thumb1.z || 0) - (thumb2.z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const bass =
              -20 + 40 * Math.min(1, Math.max(0, (dist - 0.01) / (0.5 - 0.01)));
            if (bassRef.current) bassRef.current.gain.value = bass;
          }
        }

        if (running) requestAnimationFrame(processFrame);
      };

      processFrame();
    };

    startCamera();

    return () => {
      running = false;
      if (audioCtx) audioCtx.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioCtx, audioLoaded]);

  return (
    <div>
      <h1>Hand-Controlled Audio with Visualized Gesture Lines</h1>
      <p>
        <b>Instructions:</b> Hold both hands in front of the camera.
        <br />- Thumb–index finger distance on{" "}
        <span style={{ color: "lime" }}>left hand</span>: <b>Volume</b>.<br />-
        Thumb–index finger distance on{" "}
        <span style={{ color: "orange" }}>right hand</span>: <b>Pitch</b>.<br />
        - Distance between <span style={{ color: "cyan" }}>both thumbs</span>:{" "}
        <b>Bass</b>.<br />
        <br />
        Click "Start Audio" to begin.
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
          the frame.
        </i>
      </p>
    </div>
  );
}
