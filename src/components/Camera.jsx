"use client";
import { useRef, useState, useEffect } from "react";
import { initAudioContext } from "@/utils/AudioController";
import { isFist } from "@/utils/gestureUtils";
import { drawHandLandmarks } from "@/utils/HandVisualiser";
import { loadHandLandmarker } from "@/utils/useHandTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import Link from "next/link";

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

  const stopAudio = () => {
    if (audioCtx && pitchRef.current) {
      pitchRef.current.pause();
      pitchRef.current.currentTime = 0; // Reset position
      audioCtx.close();
      setAudioCtx(null);
      setAudioLoaded(false);
    }
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

          // Flip canvas horizontally for mirror view
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-br from-[#133164] via-[#141924] to-[#070a14] text-zinc-50">
      <Card className="w-full max-w-4xl relative bg-[#18192B]/80 backdrop-blur-xl border-[3px] border-magenta-500/40 shadow-[0_10px_32px_1px_rgba(120,255,183,.14)] transition-all duration-500">
        <CardHeader className="border-b border-[#292955] pb-2">
          <CardTitle className="text-4xl font-black tracking-tight text-zinc-50 bg-gradient-to-r from-green-400 via-pink-500 to-purple-500 bg-clip-text flex items-center gap-3 uppercase">
            <span className="relative flex items-center gap-2">
              <span className="w-7 h-7 bg-gradient-to-r from-teal-400 to-fuchsia-500 opacity-95 rounded-full animate-pulse shadow-glow"></span>
              Wavify
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center mt-2 mb-3 gap-3">
            <div className="flex flex-wrap gap-2 ml-1">
              <Badge className="bg-green-700/80 text-green-200 border border-green-400 shadow">
                Thumb-Index (L): Volume
              </Badge>
              <Badge className="bg-pink-700/80 text-pink-200 border border-pink-400 shadow">
                Thumb-Index (R): Pitch
              </Badge>
              <Badge className="bg-blue-700/80 text-blue-200 border border-blue-400 shadow">
                Thumbs: Bass
              </Badge>
            </div>
          </div>
          <div className="flex items-center mt-1 gap-1 text-sm text-zinc-200 font-mono">
            <span className="animate-pulse text-green-300">●</span>
            Open hand = play | Fist = pause
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="flex gap-6 w-full mb-6">
            {!audioLoaded && (
              <Button
                onClick={loadAudio}
                className="flex-1 py-6 text-lg font-semibold rounded-xl bg-gradient-to-r from-green-400 to-fuchsia-500 shadow-lg hover:brightness-125 animate-pulse transition-all"
                size="lg"
              >
                <span className="uppercase tracking-widest">Start Audio</span>
              </Button>
            )}
            {audioLoaded && (
              <Button
                onClick={stopAudio}
                className="flex-1 py-6 text-lg font-semibold rounded-xl bg-gradient-to-r from-fuchsia-600 to-blue-900 text-white drop-shadow-[0_0_8px_magenta] hover:brightness-110 transition-all"
                size="lg"
                variant="destructive"
              >
                <span className="uppercase tracking-widest">Stop Audio</span>
              </Button>
            )}
          </div>
          <div className="relative flex items-center justify-center">
            <div className="rounded-2xl overflow-hidden ring-8 ring-magenta-400/20 ring-offset-2 ring-offset-[#161621] shadow-2xl bg-black/60">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                width={640}
                height={480}
                className="absolute opacity-0"
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="relative top-0 left-0"
                style={{ minWidth: 320, minHeight: 240 }}
              />
            </div>
            <div className="absolute z-10 top-3 right-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow" />
              <span className="text-green-300 font-semibold font-mono text-xs">
                {audioLoaded ? "Active" : "Idle"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="mt-8 text-zinc-300 text-center max-w-lg text-sm leading-relaxed">
        <i>
          Works best with{" "}
          <span className="text-green-400 font-semibold">good lighting</span>.
          <br />
          All processing is local and private.
          <br />
          <span className="flex items-center justify-center gap-2 mt-2">
            Created by Devansh Tyagi.
            <Link
              href="https://www.github.com/devanshtyagi26"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline hover:text-fuchsia-300"
            >
              <Github width={18} /> /devanshtyagi26
            </Link>
          </span>
        </i>
      </p>
    </div>
  );
}
