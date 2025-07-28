// HandVisualizer.js
export function drawHandLandmarks(ctx, hands, canvas) {
  hands.forEach((hand, idx) => {
    const thumb = hand[4];
    const index = hand[8];

    for (const lm of hand) {
      ctx.beginPath();
      ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(thumb.x * canvas.width, thumb.y * canvas.height);
    ctx.lineTo(index.x * canvas.width, index.y * canvas.height);
    ctx.strokeStyle = idx === 0 ? "lime" : "orange";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = idx === 0 ? "lime" : "orange";
    ctx.fillText(
      idx === 0 ? "VOL" : "PITCH",
      index.x * canvas.width + 16,
      index.y * canvas.height
    );
  });

  // Draw line between thumbs if 2 hands are present
  if (hands.length === 2) {
    const thumb1 = hands[0][4];
    const thumb2 = hands[1][4];

    ctx.beginPath();
    ctx.moveTo(thumb1.x * canvas.width, thumb1.y * canvas.height);
    ctx.lineTo(thumb2.x * canvas.width, thumb2.y * canvas.height);
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "cyan";
    ctx.fillText(
      "BASS",
      ((thumb1.x + thumb2.x) / 2) * canvas.width,
      ((thumb1.y + thumb2.y) / 2) * canvas.height + 8
    );
  }
}
