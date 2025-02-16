import mediapipe as mp
import cv2
import numpy as np
import uuid
import os
from flask import Flask, Response, render_template


app = Flask(__name__)

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# Open the webcam
cam = cv2.VideoCapture(0)

def generate_frames():
    with mp_hands.Hands(min_detection_confidence=0.8, min_tracking_confidence=0.5) as hands:
        while True:
            success, frame = cam.read()
            if not success:
                break

            # Convert color and process hands
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = cv2.flip(image, 1)
            image.flags.writeable = False
            results = hands.process(image)
            image.flags.writeable = True
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            # Draw hand landmarks
            if results.multi_hand_landmarks:
                for hand in results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(image, hand, mp_hands.HAND_CONNECTIONS)

            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', image)
            frame = buffer.tobytes()

            # Yield frame for streaming
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
