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
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-zinc-950 via-indigo-950 to-zinc-900 p-6">
      <Card className="w-full max-w-3xl relative bg-zinc-800 shadow-lg border-2 border-indigo-600/40">
        <CardHeader>
          <CardTitle className="text-4xl font-extrabold text-indigo-400 tracking-wider">
            <span className="inline-flex items-center gap-2">
              <svg width="32" height="32" fill="none" className="animate-pulse">
                <circle cx="16" cy="16" r="14" stroke="cyan" strokeWidth="2" />
                <circle cx="16" cy="16" r="4" fill="indigo" />
              </svg>
              Wavify
            </span>
          </CardTitle>
          <p className="text-indigo-200 mt-4 text-lg leading-relaxed">
            <Badge className="bg-cyan-800 text-white mr-2">How to use</Badge>
            Show both hands to your camera:
            <br />
            <span className="ml-2">
              <Badge className="mr-2 bg-lime-600/40 text-lime-200 shadow">
                Thumb-Index (Left): Volume
              </Badge>
              <Badge className="mr-2 bg-orange-600/40 text-orange-200 shadow">
                Thumb-Index (Right): Pitch
              </Badge>
              <Badge className="bg-cyan-600/40 text-cyan-200 shadow">
                Thumbs: Bass
              </Badge>
            </span>
            <br />
            <span className="mt-2 block font-semibold text-sm text-indigo-300">
              Clench a fist to PAUSE, open hand to PLAY.
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mt-2">
            {!audioLoaded && (
              <Button
                onClick={loadAudio}
                className="flex-1 py-6 text-lg font-bold bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 hover:brightness-125 animate-pulse"
                size="lg"
              >
                <span className="uppercase tracking-wider">Start Audio</span>
              </Button>
            )}
            {audioLoaded && (
              <Button
                onClick={stopAudio}
                className="flex-1 py-6 text-lg font-bold bg-gradient-to-r from-pink-600 to-zinc-800 text-white hover:brightness-125"
                size="lg"
                variant="destructive"
              >
                <span className="uppercase tracking-wider">Stop Audio</span>
              </Button>
            )}
          </div>
          <div className="relative flex items-center justify-center mt-8">
            <div className="rounded-xl overflow-hidden ring-4 ring-indigo-700/80 shadow-xl bg-zinc-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                width={640}
                height={480}
                className="hidden opacity-0"
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="relative top-0 left-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="mt-6 text-zinc-300 text-center max-w-lg">
        <i>Works best with good lighting.</i>
        <br />
        <i> Secure data—video/audio processed locally for privacy.</i>
        <br />
        <i className="flex gap-3 mt-2">
          Created by Devansh Tyagi.{" "}
          <Link
            href="https://www.github.com/devanshtyagi26"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline hover:text-amber-100"
          >
            <Github width={20} /> /devanshtyagi26
          </Link>
        </i>
      </p>
    </div>
  );
}
