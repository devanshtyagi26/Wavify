"use client";
import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function CameraFeed() {
  // Refs for video & canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioCtx, setAudioCtx] = useState(null);
  const gainRef = useRef(null);
  const pitchRef = useRef(null);
  const bassRef = useRef(null);
  const trackRef = useRef(null);

  // Initialize Audio & Effects
  const loadAudio = () => {
    if (audioCtx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = new Audio("/sample.mp3");
    audio.loop = true;
    audio.crossOrigin = "anonymous";

    const track = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = 1;

    // Bass effect (Low-shelf filter)
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 200;
    bass.gain.value = 0;

    // Pitch effect (playbackRate, not real pitch shifting, for demo)
    // For real pitch-shifting use more advanced DSP
    pitchRef.current = audio; // will adjust audio.playbackRate

    // Connect graph: track → bass → gain → destination
    track.connect(bass).connect(gain).connect(ctx.destination);

    audio.play();
    setAudioLoaded(true);
    setAudioCtx(ctx);
    gainRef.current = gain;
    bassRef.current = bass;
    trackRef.current = track;
  };

  // Returns true if hand appears to be a fist (all tips except thumb are close to base joints)
  function isFist(landmarks) {
    // Indices for tips and their base joints
    const fingerTips = [8, 12, 16, 20]; // index, middle, ring, pinky tips
    const fingerBases = [5, 9, 13, 17]; // their base MCP joints

    // Check if each finger tip is close to its base
    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]];
      const base = landmarks[fingerBases[i]];
      const dx = tip.x - base.x,
        dy = tip.y - base.y,
        dz = (tip.z || 0) - (base.z || 0);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 0.06) return false; // threshold tuned for most hands/cam distances
    }
    return true;
  }

  // Camera & Gesture logic
  useEffect(() => {
    let handLandmarker,
      running = true;

    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

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
          // Collect the thumb and index of both hands (if 2 present)
          let thumbs = [],
            indices = [];
          hands.forEach((hand, idx) => {
            // Thumb tip: 4, Index tip: 8
            const thumb = hand[4],
              index = hand[8];
            thumbs.push({ ...thumb, hand: idx });
            indices.push({ ...index, hand: idx });

            // Draw all hand landmarks
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

            // Draw line: thumb–index finger
            ctx.beginPath();
            ctx.moveTo(thumb.x * canvas.width, thumb.y * canvas.height);
            ctx.lineTo(index.x * canvas.width, index.y * canvas.height);
            ctx.strokeStyle = idx === 0 ? "lime" : "orange";
            ctx.lineWidth = 4;
            ctx.stroke();

            // Draw label
            ctx.font = "bold 20px sans-serif";
            ctx.fillStyle = idx === 0 ? "lime" : "orange";
            ctx.fillText(
              idx === 0 ? "VOL" : "PITCH",
              index.x * canvas.width + 16,
              index.y * canvas.height
            );
          });

          // Draw line between the two thumbs
          if (thumbs.length === 2) {
            ctx.beginPath();
            ctx.moveTo(thumbs[0].x * canvas.width, thumbs[0].y * canvas.height);
            ctx.lineTo(thumbs[1].x * canvas.width, thumbs[1].y * canvas.height);
            ctx.strokeStyle = "cyan";
            ctx.lineWidth = 4;
            ctx.stroke();
            // Draw label
            ctx.font = "bold 20px sans-serif";
            ctx.fillStyle = "cyan";
            ctx.fillText(
              "BASS",
              ((thumbs[0].x + thumbs[1].x) / 2) * canvas.width,
              ((thumbs[0].y + thumbs[1].y) / 2) * canvas.height + 8
            );
          }

          // Assume audio play/pause controlled by pitchRef.current (the Audio element)
          let anyFist = false;
          for (const hand of hands) {
            if (isFist(hand)) {
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

          // Gesture → Parameter mapping
          // (Tune min/max empirically for your setup)
          // 1st hand (VOL)
          if (hands[0]) {
            const dx = hands[0][4].x - hands[0][8].x,
              dy = hands[0][4].y - hands[0][8].y,
              dz = (hands[0][4].z || 0) - (hands[0][8].z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const vol = Math.min(1, Math.max(0, (dist - 0.02) / (0.15 - 0.02)));
            if (gainRef.current) gainRef.current.gain.value = vol;
          }
          // 2nd hand (PITCH)
          if (hands[1]) {
            const dx = hands[1][4].x - hands[1][8].x,
              dy = hands[1][4].y - hands[1][8].y,
              dz = (hands[1][4].z || 0) - (hands[1][8].z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const pitch =
              0.5 + Math.min(1, Math.max(0, (dist - 0.02) / (0.15 - 0.02)));
            if (pitchRef.current) pitchRef.current.playbackRate = pitch;
          }
          // Thumbs (BASS)
          if (thumbs.length === 2) {
            const dx = thumbs[0].x - thumbs[1].x,
              dy = thumbs[0].y - thumbs[1].y,
              dz = (thumbs[0].z || 0) - (thumbs[1].z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            // Bass: Map distance to -20 (cut) to +20 (boost)
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
  }, [audioCtx]);

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
