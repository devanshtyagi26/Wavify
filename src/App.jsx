import { useRef, useEffect } from "react";
import Webcam from "react-webcam";

function App() {
  const webRef = useRef(null);
  const canvasRef = useRef(null);

  const detectHand = () => {
    if (
      webRef.current &&
      webRef.current.video.readyState === 4 // Ensure video is fully loaded
    ) {
      console.log("Webcam video is ready");

      const video = webRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Set canvas size to match video
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const ctx = canvasRef.current.getContext("2d");
      console.log("Canvas context:", ctx);
    }
  };

  useEffect(() => {
    const interval = setInterval(detectHand, 1000); // Call detectHand every second
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

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
