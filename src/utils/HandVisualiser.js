export function drawHandLandmarks(ctx, hands, canvas) {
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  hands.forEach((hand, idx) => {
    const thumb = hand[4];
    const index = hand[8];

    // Draw landmarks
    for (const lm of hand) {
      ctx.beginPath();
      ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    }

    // Draw line: thumb to index
    ctx.beginPath();
    ctx.moveTo(thumb.x * canvas.width, thumb.y * canvas.height);
    ctx.lineTo(index.x * canvas.width, index.y * canvas.height);
    ctx.strokeStyle = idx === 0 ? "lime" : "orange";
    ctx.lineWidth = 4;
    ctx.stroke();
  });

  // ✅ Draw thumb-to-thumb line BEFORE restoring flip
  if (hands.length === 2) {
    const thumb1 = hands[0][4];
    const thumb2 = hands[1][4];

    ctx.beginPath();
    ctx.moveTo(thumb1.x * canvas.width, thumb1.y * canvas.height);
    ctx.lineTo(thumb2.x * canvas.width, thumb2.y * canvas.height);
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.restore(); // exit flipped mode

  // ✅ Draw text labels (mirrored manually after flipping)
  hands.forEach((hand, idx) => {
    const index = hand[8];
    const x = canvas.width - index.x * canvas.width;
    const y = index.y * canvas.height;

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = idx === 0 ? "lime" : "orange";
    ctx.fillText(idx === 0 ? "VOL" : "PITCH", x + 16, y);
  });

  if (hands.length === 2) {
    const thumb1 = hands[0][4];
    const thumb2 = hands[1][4];
    const midX = (thumb1.x + thumb2.x) / 2;
    const midY = (thumb1.y + thumb2.y) / 2;

    const x = canvas.width - midX * canvas.width;
    const y = midY * canvas.height;

    ctx.fillStyle = "cyan";
    ctx.fillText("BASS", x, y + 8);
  }
}
