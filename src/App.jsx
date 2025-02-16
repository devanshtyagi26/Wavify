import { useRef } from "react";
import * as ts from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import Webcam from "react-webcam";
import { Drawing } from "./Drawing";

function App() {
  const webRef = useRef(null);
  const canvasRef = useRef(null);

  const runHandPose = async () => {
    const network = await handpose.load();
    console.log("Handpose loaded");

    setInterval(() => {
      detectHand(network);
    }, 100);
  };
  const detectHand = async (network) => {
    if (
      typeof webRef.current !== "undefined" &&
      webRef.current !== null &&
      webRef.current.video.readyState === 4
    ) {
      const video = webRef.current.video;
      const videoWidth = webRef.current.video.videoWidth;
      const videoHeight = webRef.current.video.videoHeight;

      webRef.current.video.width = videoWidth;
      webRef.current.video.height = videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const hand = await network.estimateHands(video);
      console.log(hand);
      const ctx = canvasRef.current.getContext("2d");
      Drawing(hand, ctx);
    }
  };
  runHandPose();
  return (
    <>
      <Webcam
        ref={webRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 4,
          width: "100vw",
          height: "100vh",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 4,
          width: "100vw",
          height: "100vh",
        }}
      />
    </>
  );
}

export default App;
