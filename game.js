/* Apex Lane — Pole Position–style neon arcade racer
   Static files only. No build step. */
(function () {
  "use strict";

  // ─── Constants ─────────────────────────────────────────────
  const TOTAL_LAPS = 3;
  const RIVAL_COUNT = 5;
  const ROAD_WIDTH = 2200;
  const SEG_LENGTH = 200;
  const DRAW_DIST = 180;
  const CAMERA_H = 1200;
  const CAMERA_DEPTH = 0.84;
  const MAX_SPEED = 320;
  const ACCEL = 0.62;
  const BRAKE = 0.55;
  const FRICTION = 0.06;
  const OFFROAD_FRICTION = 0.65;
  const STEER_RATE = 0.028;
  const CENTRIFUGAL = 0.28;
  const NITRO_MAX = 100;
  const NITRO_DRAIN = 0.55;
  const NITRO_REGEN = 0.08;
  const NITRO_BOOST = 1.35;
  const SCORE_KEY = "apexLane.scores.v1";
  const NAME_KEY = "apexLane.lastName";
  const TOP_N = 20;

  // ─── Liveries & car stable ─────────────────────────────────
  const LIVERIES = [
    { id: "rosso", name: "Rosso Corsa", body: "#c8102e", accent: "#1a1a1a", stripe: null, glow: "#ff3355" },
    { id: "giallo", name: "Giallo", body: "#f5c400", accent: "#111111", stripe: null, glow: "#ffe600" },
    { id: "blu", name: "Blu Elettrico", body: "#0066ff", accent: "#0a0a20", stripe: "#00f0ff", glow: "#00aaff" },
    { id: "neon", name: "Night Neon", body: "#1a1030", accent: "#00f0ff", stripe: "#ff2bd6", glow: "#ff2bd6" },
    { id: "carbon", name: "Carbon Stealth", body: "#1c1c22", accent: "#444450", stripe: "#888898", glow: "#666680" },
    { id: "stripe", name: "Racing Stripe", body: "#f0f0f4", accent: "#c8102e", stripe: "#c8102e", glow: "#ffffff" },
    { id: "sponsor", name: "Sponsor Pack", body: "#ff6a00", accent: "#111111", stripe: "#ffffff", glow: "#ff8800" },
  ];

  // Iconic rear/¾ silhouettes (in-universe names; shapes read as classic supercars)
  const CARS = [
    { id: "911rs", name: "911 RS", short: "911", shape: "911", defaultLivery: "stripe" },
    { id: "esprit", name: "Esprit S", short: "ESPRIT", shape: "esprit", defaultLivery: "giallo" },
    { id: "tridente", name: "Tridente GT", short: "TRIDENTE", shape: "tridente", defaultLivery: "blu" },
    { id: "berlinetta", name: "Rosso Berlinetta", short: "BERLINETTA", shape: "berlinetta", defaultLivery: "rosso" },
    { id: "counta", name: "Counta X", short: "COUNTA", shape: "counta", defaultLivery: "neon" },
    { id: "vantage", name: "Vantage S", short: "VANTAGE", shape: "vantage", defaultLivery: "carbon" },
  ];

  function getLivery(id) {
    return LIVERIES.find((l) => l.id === id) || LIVERIES[0];
  }

  function getCar(id) {
    return CARS.find((c) => c.id === id) || CARS[0];
  }

  // ─── DOM ───────────────────────────────────────────────────
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const startScreen = document.getElementById("start-screen");
  const garageScreen = document.getElementById("garage-screen");
  const countdownEl = document.getElementById("countdown");
  const countdownNum = document.getElementById("countdown-num");
  const hud = document.getElementById("hud");
  const hudSpeed = document.getElementById("hud-speed");
  const hudLap = document.getElementById("hud-lap");
  const hudTime = document.getElementById("hud-time");
  const hudPos = document.getElementById("hud-pos");
  const nitroFill = document.getElementById("nitro-fill");
  const resultsScreen = document.getElementById("results-screen");
  const resultsTitle = document.getElementById("results-title");
  const resultsPlace = document.getElementById("results-place");
  const resultsTime = document.getElementById("results-time");
  const resultsBoard = document.getElementById("results-board");
  const nameScreen = document.getElementById("name-screen");
  const nameSummary = document.getElementById("name-summary");
  const playerNameInput = document.getElementById("player-name");
  const scoresScreen = document.getElementById("scores-screen");
  const scoresList = document.getElementById("scores-list");
  const touchEl = document.getElementById("touch");
  const garageCanvas = document.getElementById("garage-canvas");
  const garageCtx = garageCanvas.getContext("2d");
  const carGrid = document.getElementById("car-grid");
  const swatchesEl = document.getElementById("swatches");
  const previewName = document.getElementById("preview-name");
  const previewLivery = document.getElementById("preview-livery");

  // ─── Input ─────────────────────────────────────────────────
  const keys = { left: false, right: false, accel: false, brake: false, boost: false };

  function bindKey(e, down) {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") keys.left = down;
    else if (k === "arrowright" || k === "d") keys.right = down;
    else if (k === "arrowup" || k === "w") keys.accel = down;
    else if (k === "arrowdown" || k === "s") keys.brake = down;
    else if (k === " " || k === "spacebar") {
      keys.boost = down;
      e.preventDefault();
    }
  }
  window.addEventListener("keydown", (e) => bindKey(e, true));
  window.addEventListener("keyup", (e) => bindKey(e, false));

  function bindTouchBtn(btn) {
    const key = btn.dataset.key;
    const set = (v) => {
      keys[key] = v;
      btn.classList.toggle("active", v);
    };
    const on = (e) => { e.preventDefault(); set(true); };
    const off = (e) => { e.preventDefault(); set(false); };
    btn.addEventListener("touchstart", on, { passive: false });
    btn.addEventListener("touchend", off, { passive: false });
    btn.addEventListener("touchcancel", off, { passive: false });
    btn.addEventListener("mousedown", on);
    btn.addEventListener("mouseup", off);
    btn.addEventListener("mouseleave", off);
  }
  touchEl.querySelectorAll(".touch-btn").forEach(bindTouchBtn);

  // ─── State ─────────────────────────────────────────────────
  let state = "title"; // title | garage | countdown | racing | name | results | scores
  let scoresReturnTo = "title";
  let selectedCarId = CARS[0].id;
  let selectedLiveryId = CARS[0].defaultLivery;
  let segments = [];
  let trackLength = 0;
  let player = null;
  let rivals = [];
  let raceTime = 0;
  let bestLapThisRace = Infinity;
  let lapStartTime = 0;
  let cameraZ = 0;
  let rumble = 0;
  let lastTs = 0;
  let pendingResult = null;
  let bgOffset = 0;

  // ─── Track generation ──────────────────────────────────────
  function addSegment(curve, y) {
    const n = segments.length;
    segments.push({
      index: n,
      p1: { world: { z: n * SEG_LENGTH, y: lastY() }, screen: {}, clip: 0 },
      p2: { world: { z: (n + 1) * SEG_LENGTH, y: y }, screen: {}, clip: 0 },
      curve,
      sprites: [],
      color: Math.floor(n / 3) % 2
        ? { road: "#2a2a38", grass: "#0e2818", rumble: "#ff2bd6", lane: "#00f0ff" }
        : { road: "#222230", grass: "#0a1e12", rumble: "#ffffff", lane: "#445566" },
    });
  }
  function lastY() {
    return segments.length ? segments[segments.length - 1].p2.world.y : 0;
  }
  function addRoad(enter, hold, leave, curve, y) {
    const startY = lastY();
    const endY = startY + (y || 0) * (enter + hold + leave);
    for (let n = 0; n < enter; n++)
      addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / (enter + hold + leave)));
    for (let n = 0; n < hold; n++)
      addSegment(curve, easeInOut(startY, endY, (enter + n) / (enter + hold + leave)));
    for (let n = 0; n < leave; n++)
      addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / (enter + hold + leave)));
  }
  function easeIn(a, b, p) { return a + (b - a) * p * p; }
  function easeInOut(a, b, p) { return a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5); }

  function buildTrack() {
    segments = [];
    addRoad(40, 60, 40, 0, 0);
    addRoad(30, 50, 30, 4, 0);
    addRoad(20, 40, 20, 0, 8);
    addRoad(30, 50, 30, -5, 0);
    addRoad(20, 30, 20, 0, -6);
    addRoad(40, 60, 40, 3, 0);
    addRoad(20, 40, 20, -4, 4);
    addRoad(30, 50, 30, 0, 0);
    addRoad(25, 45, 25, 6, -4);
    addRoad(20, 30, 20, -3, 0);
    addRoad(40, 80, 40, 0, 0);
    // roadside objects
    for (let i = 0; i < segments.length; i += 3) {
      const s = segments[i];
      if (Math.random() < 0.7) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const kind = Math.random() < 0.7 ? "tree" : Math.random() < 0.5 ? "billboard" : "stand";
        s.sprites.push({ kind, offset: side * (1.3 + Math.random() * 0.8) });
        if (Math.random() < 0.35) {
          s.sprites.push({ kind: "tree", offset: -side * (1.4 + Math.random() * 0.6) });
        }
      }
    }
    trackLength = segments.length * SEG_LENGTH;
  }

  function findSegment(z) {
    if (!segments.length) return { curve: 0, p1: { world: { y: 0 }, screen: {} }, p2: { world: { y: 0 }, screen: {} }, sprites: [], color: {} };
    const i = Math.floor(z / SEG_LENGTH) % segments.length;
    return segments[i < 0 ? i + segments.length : i];
  }

  // ─── Projection ────────────────────────────────────────────
  function project(p, camX, camY, camZ, w, h) {
    const dz = p.world.z - camZ;
    const scale = CAMERA_DEPTH / (dz <= 0 ? 0.001 : dz);
    p.screen.scale = scale;
    p.screen.x = Math.round(w / 2 + scale * camX * w / 2);
    p.screen.y = Math.round(h / 2 - scale * (p.world.y - camY) * h / 2);
    p.screen.w = Math.round(scale * ROAD_WIDTH * w / 2);
  }

  // ─── Drawing helpers ───────────────────────────────────────
  function rumbleWidth(projectedRoadWidth) {
    return projectedRoadWidth / 6;
  }
  function laneMarkerWidth(projectedRoadWidth) {
    return projectedRoadWidth / 32;
  }

  function drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  function drawSegment(w, h, x1, y1, w1, x2, y2, w2, color) {
    const r1 = rumbleWidth(w1);
    const r2 = rumbleWidth(w2);
    const l1 = laneMarkerWidth(w1);
    const l2 = laneMarkerWidth(w2);
    ctx.fillStyle = color.grass;
    ctx.fillRect(0, y2, w, y1 - y2);
    drawPolygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
    drawPolygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
    drawPolygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);
    if (color.lane) {
      const lanew1 = w1 / 4;
      const lanew2 = w2 / 4;
      drawPolygon(x1 - l1 / 2, y1, x1 + l1 / 2, y1, x2 + l2 / 2, y2, x2 - l2 / 2, y2, color.lane);
      drawPolygon(x1 - lanew1 - l1 / 2, y1, x1 - lanew1 + l1 / 2, y1, x2 - lanew2 + l2 / 2, y2, x2 - lanew2 - l2 / 2, y2, color.lane);
      drawPolygon(x1 + lanew1 - l1 / 2, y1, x1 + lanew1 + l1 / 2, y1, x2 + lanew2 + l2 / 2, y2, x2 + lanew2 - l2 / 2, y2, color.lane);
    }
  }

  function drawSprite(kind, x, y, scale, side) {
    const s = Math.max(4, scale);
    ctx.save();
    if (kind === "tree") {
      const tw = s * 0.9;
      const th = s * 2.2;
      ctx.fillStyle = "#3a2210";
      ctx.fillRect(x - tw * 0.08, y - th * 0.35, tw * 0.16, th * 0.4);
      ctx.fillStyle = "#0d4a28";
      ctx.beginPath();
      ctx.moveTo(x, y - th);
      ctx.lineTo(x + tw * 0.5, y - th * 0.35);
      ctx.lineTo(x - tw * 0.5, y - th * 0.35);
      ctx.fill();
      ctx.fillStyle = "#128a48";
      ctx.beginPath();
      ctx.moveTo(x, y - th * 0.85);
      ctx.lineTo(x + tw * 0.38, y - th * 0.4);
      ctx.lineTo(x - tw * 0.38, y - th * 0.4);
      ctx.fill();
    } else if (kind === "billboard") {
      const bw = s * 1.6;
      const bh = s * 1.1;
      ctx.fillStyle = "#222";
      ctx.fillRect(x - 3, y - bh, 6, bh);
      ctx.fillStyle = "#0a0a1a";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.fillRect(x - bw / 2, y - bh - bh * 0.7, bw, bh * 0.7);
      ctx.strokeRect(x - bw / 2, y - bh - bh * 0.7, bw, bh * 0.7);
      ctx.fillStyle = "#ff2bd6";
      ctx.font = `bold ${Math.max(8, bh * 0.22)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("APEX", x, y - bh - bh * 0.35);
    } else {
      // stand / crowd
      const sw = s * 2.4;
      const sh = s * 1.4;
      ctx.fillStyle = "#1a1528";
      ctx.fillRect(x - sw / 2, y - sh, sw, sh);
      ctx.fillStyle = side > 0 ? "#ff2bd6" : "#00f0ff";
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.4 + (i % 3) * 0.15;
        ctx.fillRect(x - sw / 2 + 4 + i * (sw / 6), y - sh + 6, sw / 8, sh * 0.35);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /** Draw supercar from behind (Pole Position camera). Distinct silhouettes per shape id. */
  function drawCar(g, cx, cy, scale, livery, shape, facing) {
    const L = getLivery(livery);
    const w = scale;
    const h = scale * 0.52;
    g.save();
    g.translate(cx, cy);

    // ground shadow
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.beginPath();
    g.ellipse(0, h * 0.42, w * 0.52, h * 0.12, 0, 0, Math.PI * 2);
    g.fill();

    g.shadowColor = L.glow;
    g.shadowBlur = Math.max(6, scale * 0.14);

    const drawers = {
      "911": drawShape911,
      esprit: drawShapeEsprit,
      tridente: drawShapeTridente,
      berlinetta: drawShapeBerlinetta,
      counta: drawShapeCounta,
      vantage: drawShapeVantage,
    };
    (drawers[shape] || drawShape911)(g, w, h, L);

    g.shadowBlur = 0;

    if (L.id === "sponsor") {
      g.fillStyle = "#fff";
      g.font = `bold ${Math.max(6, scale * 0.08)}px sans-serif`;
      g.textAlign = "center";
      g.fillText("APX", 0, h * 0.08);
    }

    g.restore();
  }

  function paintStripe(g, w, h, L, x0, y0, tw, th) {
    if (!L.stripe) return;
    g.fillStyle = L.stripe;
    g.fillRect(x0, y0, tw, th);
  }

  function drawWheels(g, w, h, leftX, rightX, y, wh, ww) {
    g.fillStyle = "#0a0a0a";
    g.fillRect(leftX, y, ww, wh);
    g.fillRect(rightX, y, ww, wh);
    // rim highlight
    g.fillStyle = "#333";
    g.fillRect(leftX + ww * 0.25, y + wh * 0.2, ww * 0.5, wh * 0.55);
    g.fillRect(rightX + ww * 0.25, y + wh * 0.2, ww * 0.5, wh * 0.55);
  }

  function drawExhaust(g, tips, y, rw, rh) {
    g.fillStyle = "#222";
    tips.forEach((x) => {
      g.beginPath();
      g.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.ellipse(x, y, rw * 0.55, rh * 0.55, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#222";
    });
  }

  /** Round-haunch rear-engine coupe — reads as classic 911 */
  function drawShape911(g, w, h, L) {
    // body with round haunches
    g.fillStyle = L.body;
    g.beginPath();
    g.moveTo(-w * 0.12, -h * 0.38);
    g.lineTo(w * 0.12, -h * 0.38);
    g.quadraticCurveTo(w * 0.22, -h * 0.1, w * 0.48, h * 0.12);
    g.quadraticCurveTo(w * 0.52, h * 0.22, w * 0.46, h * 0.34);
    g.lineTo(-w * 0.46, h * 0.34);
    g.quadraticCurveTo(-w * 0.52, h * 0.22, -w * 0.48, h * 0.12);
    g.quadraticCurveTo(-w * 0.22, -h * 0.1, -w * 0.12, -h * 0.38);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;

    // duckbill spoiler
    g.fillStyle = L.accent;
    g.beginPath();
    g.moveTo(-w * 0.28, h * 0.02);
    g.lineTo(w * 0.28, h * 0.02);
    g.lineTo(w * 0.32, h * 0.1);
    g.lineTo(-w * 0.32, h * 0.1);
    g.closePath();
    g.fill();

    // cabin glass (shallow rear window)
    g.fillStyle = "rgba(40, 60, 100, 0.92)";
    g.beginPath();
    g.moveTo(-w * 0.1, -h * 0.34);
    g.lineTo(w * 0.1, -h * 0.34);
    g.lineTo(w * 0.18, h * 0.0);
    g.lineTo(-w * 0.18, h * 0.0);
    g.closePath();
    g.fill();

    // side mirrors
    g.fillStyle = L.accent;
    g.fillRect(-w * 0.22, -h * 0.22, w * 0.06, h * 0.05);
    g.fillRect(w * 0.16, -h * 0.22, w * 0.06, h * 0.05);

    paintStripe(g, w, h, L, -w * 0.04, -h * 0.36, w * 0.08, h * 0.68);

    // engine-lid grill lines
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = Math.max(1, w * 0.008);
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * w * 0.04, h * 0.12);
      g.lineTo(i * w * 0.04, h * 0.22);
      g.stroke();
    }

    // oval taillights
    g.fillStyle = "#ff2030";
    g.shadowColor = "#ff2030";
    g.shadowBlur = 12;
    g.beginPath();
    g.ellipse(-w * 0.34, h * 0.2, w * 0.07, h * 0.055, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(w * 0.34, h * 0.2, w * 0.07, h * 0.055, 0, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;

    // bumper
    g.fillStyle = L.accent;
    g.fillRect(-w * 0.38, h * 0.28, w * 0.76, h * 0.06);

    drawExhaust(g, [-w * 0.12, w * 0.12], h * 0.36, w * 0.035, h * 0.025);
    drawWheels(g, w, h, -w * 0.52, w * 0.42, h * 0.08, h * 0.28, w * 0.1);

    if (L.id === "neon") {
      g.strokeStyle = L.accent;
      g.lineWidth = Math.max(1, w * 0.018);
      g.strokeRect(-w * 0.16, -h * 0.18, w * 0.32, h * 0.14);
    }
  }

  /** Sharp Giugiaro wedge — reads as Esprit */
  function drawShapeEsprit(g, w, h, L) {
    g.fillStyle = L.body;
    g.beginPath();
    g.moveTo(-w * 0.1, -h * 0.44);
    g.lineTo(w * 0.1, -h * 0.44);
    g.lineTo(w * 0.42, h * 0.08);
    g.lineTo(w * 0.44, h * 0.32);
    g.lineTo(-w * 0.44, h * 0.32);
    g.lineTo(-w * 0.42, h * 0.08);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;

    // sharp rear deck crease
    g.fillStyle = L.accent;
    g.beginPath();
    g.moveTo(-w * 0.36, h * 0.06);
    g.lineTo(w * 0.36, h * 0.06);
    g.lineTo(w * 0.4, h * 0.16);
    g.lineTo(-w * 0.4, h * 0.16);
    g.closePath();
    g.fill();

    // angular cabin
    g.fillStyle = "rgba(25, 45, 80, 0.95)";
    g.beginPath();
    g.moveTo(-w * 0.08, -h * 0.4);
    g.lineTo(w * 0.08, -h * 0.4);
    g.lineTo(w * 0.2, h * 0.02);
    g.lineTo(-w * 0.2, h * 0.02);
    g.closePath();
    g.fill();

    // pop-up headlight humps (visible as small roof steps from rear)
    g.fillStyle = L.body;
    g.fillRect(-w * 0.14, -h * 0.46, w * 0.08, h * 0.05);
    g.fillRect(w * 0.06, -h * 0.46, w * 0.08, h * 0.05);

    // mirrors — sharp stubs
    g.fillStyle = L.accent;
    g.beginPath();
    g.moveTo(-w * 0.2, -h * 0.2);
    g.lineTo(-w * 0.28, -h * 0.16);
    g.lineTo(-w * 0.2, -h * 0.14);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.2, -h * 0.2);
    g.lineTo(w * 0.28, -h * 0.16);
    g.lineTo(w * 0.2, -h * 0.14);
    g.fill();

    paintStripe(g, w, h, L, -w * 0.035, -h * 0.42, w * 0.07, h * 0.7);

    // horizontal rectangular lights
    g.fillStyle = "#ff1830";
    g.shadowColor = "#ff1830";
    g.shadowBlur = 10;
    g.fillRect(-w * 0.4, h * 0.18, w * 0.14, h * 0.06);
    g.fillRect(w * 0.26, h * 0.18, w * 0.14, h * 0.06);
    g.shadowBlur = 0;

    // diffuser
    g.fillStyle = "#111";
    g.fillRect(-w * 0.32, h * 0.26, w * 0.64, h * 0.06);
    g.fillStyle = L.accent;
    for (let i = -2; i <= 2; i++) {
      g.fillRect(i * w * 0.08 - w * 0.015, h * 0.26, w * 0.03, h * 0.06);
    }

    drawExhaust(g, [-w * 0.18, w * 0.18], h * 0.34, w * 0.03, h * 0.02);
    drawWheels(g, w, h, -w * 0.5, w * 0.4, h * 0.06, h * 0.28, w * 0.1);

    if (L.id === "neon") {
      g.strokeStyle = L.accent;
      g.lineWidth = Math.max(1, w * 0.018);
      g.beginPath();
      g.moveTo(-w * 0.18, -h * 0.22);
      g.lineTo(w * 0.18, -h * 0.22);
      g.lineTo(w * 0.22, -h * 0.02);
      g.lineTo(-w * 0.22, -h * 0.02);
      g.closePath();
      g.stroke();
    }
  }

  /** Elegant GT coupe — reads as Maserati */
  function drawShapeTridente(g, w, h, L) {
    g.fillStyle = L.body;
    g.beginPath();
    g.moveTo(-w * 0.14, -h * 0.4);
    g.lineTo(w * 0.14, -h * 0.4);
    g.quadraticCurveTo(w * 0.28, -h * 0.05, w * 0.46, h * 0.14);
    g.lineTo(w * 0.44, h * 0.34);
    g.lineTo(-w * 0.44, h * 0.34);
    g.lineTo(-w * 0.46, h * 0.14);
    g.quadraticCurveTo(-w * 0.28, -h * 0.05, -w * 0.14, -h * 0.4);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;

    // chrome-ish light bar strip
    g.fillStyle = "#c8c8d0";
    g.fillRect(-w * 0.4, h * 0.16, w * 0.8, h * 0.045);

    // cabin — taller, more upright
    g.fillStyle = "rgba(35, 55, 95, 0.9)";
    g.beginPath();
    g.moveTo(-w * 0.12, -h * 0.36);
    g.lineTo(w * 0.12, -h * 0.36);
    g.lineTo(w * 0.22, h * 0.04);
    g.lineTo(-w * 0.22, h * 0.04);
    g.closePath();
    g.fill();

    // C-pillar elegance
    g.fillStyle = L.body;
    g.beginPath();
    g.moveTo(-w * 0.22, h * 0.04);
    g.lineTo(-w * 0.32, h * 0.14);
    g.lineTo(-w * 0.22, h * 0.14);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.22, h * 0.04);
    g.lineTo(w * 0.32, h * 0.14);
    g.lineTo(w * 0.22, h * 0.14);
    g.fill();

    // mirrors
    g.fillStyle = "#c8c8d0";
    g.fillRect(-w * 0.24, -h * 0.24, w * 0.07, h * 0.045);
    g.fillRect(w * 0.17, -h * 0.24, w * 0.07, h * 0.045);

    // subtle lip spoiler
    g.fillStyle = L.accent;
    g.fillRect(-w * 0.3, h * 0.08, w * 0.6, h * 0.035);

    paintStripe(g, w, h, L, -w * 0.04, -h * 0.38, w * 0.08, h * 0.5);

    // oval lights on chrome bar
    g.fillStyle = "#ff2840";
    g.shadowColor = "#ff2840";
    g.shadowBlur = 10;
    g.beginPath();
    g.ellipse(-w * 0.3, h * 0.182, w * 0.055, h * 0.035, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(w * 0.3, h * 0.182, w * 0.055, h * 0.035, 0, 0, Math.PI * 2);
    g.fill();
    // center amber hint
    g.fillStyle = "#ffaa33";
    g.shadowBlur = 4;
    g.beginPath();
    g.ellipse(0, h * 0.182, w * 0.04, h * 0.025, 0, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;

    // bumper
    g.fillStyle = L.accent;
    g.fillRect(-w * 0.36, h * 0.26, w * 0.72, h * 0.07);

    // dual exhaust
    drawExhaust(g, [-w * 0.14, w * 0.14], h * 0.36, w * 0.032, h * 0.022);
    drawWheels(g, w, h, -w * 0.5, w * 0.4, h * 0.08, h * 0.28, w * 0.1);

    // tiny trident vibe — 3 short vertical ticks on rear
    g.strokeStyle = "#c8c8d0";
    g.lineWidth = Math.max(1, w * 0.012);
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(i * w * 0.025, h * 0.1);
      g.lineTo(i * w * 0.025, h * 0.14);
      g.stroke();
    }

    if (L.id === "neon") {
      g.strokeStyle = L.accent;
      g.lineWidth = Math.max(1, w * 0.018);
      g.strokeRect(-w * 0.18, -h * 0.2, w * 0.36, h * 0.16);
    }
  }

  /** Classic mid-engine berlinetta — reads as Ferrari */
  function drawShapeBerlinetta(g, w, h, L) {
    g.fillStyle = L.body;
    g.beginPath();
    g.moveTo(-w * 0.11, -h * 0.4);
    g.lineTo(w * 0.11, -h * 0.4);
    g.quadraticCurveTo(w * 0.2, -h * 0.15, w * 0.36, h * 0.0);
    g.lineTo(w * 0.48, h * 0.16);
    g.quadraticCurveTo(w * 0.5, h * 0.28, w * 0.44, h * 0.36);
    g.lineTo(-w * 0.44, h * 0.36);
    g.quadraticCurveTo(-w * 0.5, h * 0.28, -w * 0.48, h * 0.16);
    g.lineTo(-w * 0.36, h * 0.0);
    g.quadraticCurveTo(-w * 0.2, -h * 0.15, -w * 0.11, -h * 0.4);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;

    // flying-buttress glass tunnels
    g.fillStyle = "rgba(20, 40, 75, 0.95)";
    g.beginPath();
    g.moveTo(-w * 0.09, -h * 0.36);
    g.lineTo(w * 0.09, -h * 0.36);
    g.lineTo(w * 0.16, -h * 0.05);
    g.lineTo(w * 0.28, h * 0.1);
    g.lineTo(w * 0.12, h * 0.1);
    g.lineTo(w * 0.06, -h * 0.02);
    g.lineTo(-w * 0.06, -h * 0.02);
    g.lineTo(-w * 0.12, h * 0.1);
    g.lineTo(-w * 0.28, h * 0.1);
    g.lineTo(-w * 0.16, -h * 0.05);
    g.closePath();
    g.fill();

    // small rear wing
    g.fillStyle = L.accent;
    g.beginPath();
    g.moveTo(-w * 0.22, -h * 0.02);
    g.lineTo(w * 0.22, -h * 0.02);
    g.lineTo(w * 0.26, h * 0.04);
    g.lineTo(-w * 0.26, h * 0.04);
    g.closePath();
    g.fill();
    // wing endplates
    g.fillRect(-w * 0.28, -h * 0.06, w * 0.04, h * 0.12);
    g.fillRect(w * 0.24, -h * 0.06, w * 0.04, h * 0.12);

    // mirrors
    g.fillStyle = L.accent;
    g.beginPath();
    g.ellipse(-w * 0.2, -h * 0.22, w * 0.04, h * 0.03, -0.3, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(w * 0.2, -h * 0.22, w * 0.04, h * 0.03, 0.3, 0, Math.PI * 2);
    g.fill();

    paintStripe(g, w, h, L, -w * 0.04, -h * 0.38, w * 0.08, h * 0.45);

    // round twin taillights (classic berlinetta cluster)
    g.fillStyle = "#ff1028";
    g.shadowColor = "#ff1028";
    g.shadowBlur = 12;
    [[-0.36, -0.28], [0.28, 0.36]].forEach(([a, b]) => {
      g.beginPath();
      g.ellipse(w * a, h * 0.2, w * 0.045, h * 0.045, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(w * b, h * 0.2, w * 0.045, h * 0.045, 0, 0, Math.PI * 2);
      g.fill();
    });
    g.shadowBlur = 0;

    // mesh grill / engine cover
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillRect(-w * 0.2, h * 0.1, w * 0.4, h * 0.08);

    // diffuser fins
    g.fillStyle = "#111";
    g.fillRect(-w * 0.34, h * 0.28, w * 0.68, h * 0.07);
    g.fillStyle = L.accent;
    for (let i = -3; i <= 3; i++) {
      g.fillRect(i * w * 0.07 - w * 0.012, h * 0.28, w * 0.024, h * 0.07);
    }

    // center + twin exhaust
    drawExhaust(g, [-w * 0.1, 0, w * 0.1], h * 0.37, w * 0.028, h * 0.02);
    drawWheels(g, w, h, -w * 0.52, w * 0.42, h * 0.08, h * 0.3, w * 0.1);

    if (L.id === "neon") {
      g.strokeStyle = L.accent;
      g.lineWidth = Math.max(1, w * 0.018);
      g.strokeRect(-w * 0.14, -h * 0.2, w * 0.28, h * 0.14);
    }
  }

  /** Extreme angular wedge — reads as Countach / Aventador */
  function drawShapeCounta(g, w, h, L) {
    g.fillStyle = L.body;
    g.beginPath();
    // ultra-wide geometric rear
    g.moveTo(-w * 0.08, -h * 0.36);
    g.lineTo(w * 0.08, -h * 0.36);
    g.lineTo(w * 0.18, -h * 0.18);
    g.lineTo(w * 0.52, h * 0.1);
    g.lineTo(w * 0.5, h * 0.34);
    g.lineTo(-w * 0.5, h * 0.34);
    g.lineTo(-w * 0.52, h * 0.1);
    g.lineTo(-w * 0.18, -h * 0.18);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;

    // tall hexagonal rear deck
    g.fillStyle = L.accent;
    g.beginPath();
    g.moveTo(-w * 0.3, -h * 0.08);
    g.lineTo(w * 0.3, -h * 0.08);
    g.lineTo(w * 0.38, h * 0.12);
    g.lineTo(-w * 0.38, h * 0.12);
    g.closePath();
    g.fill();

    // NACA / slat vents on deck
    g.fillStyle = "#0a0a0a";
    for (let i = -3; i <= 3; i++) {
      g.fillRect(i * w * 0.055 - w * 0.02, -h * 0.04, w * 0.04, h * 0.12);
    }

    // cabin — small and set forward
    g.fillStyle = "rgba(20, 35, 70, 0.95)";
    g.beginPath();
    g.moveTo(-w * 0.06, -h * 0.34);
    g.lineTo(w * 0.06, -h * 0.34);
    g.lineTo(w * 0.14, -h * 0.1);
    g.lineTo(-w * 0.14, -h * 0.1);
    g.closePath();
    g.fill();

    // giant rear wing
    g.fillStyle = L.accent;
    g.fillRect(-w * 0.36, -h * 0.48, w * 0.72, h * 0.05);
    g.fillRect(-w * 0.38, -h * 0.48, w * 0.05, h * 0.2);
    g.fillRect(w * 0.33, -h * 0.48, w * 0.05, h * 0.2);
    // wing struts
    g.fillRect(-w * 0.12, -h * 0.43, w * 0.04, h * 0.12);
    g.fillRect(w * 0.08, -h * 0.43, w * 0.04, h * 0.12);

    // angular mirrors
    g.fillStyle = L.accent;
    g.beginPath();
    g.moveTo(-w * 0.16, -h * 0.24);
    g.lineTo(-w * 0.28, -h * 0.2);
    g.lineTo(-w * 0.16, -h * 0.16);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.16, -h * 0.24);
    g.lineTo(w * 0.28, -h * 0.2);
    g.lineTo(w * 0.16, -h * 0.16);
    g.fill();

    paintStripe(g, w, h, L, -w * 0.035, -h * 0.34, w * 0.07, h * 0.42);

    // hexagonal / trapezoid taillights
    g.fillStyle = "#ff1830";
    g.shadowColor = "#ff1830";
    g.shadowBlur = 12;
    function hexLight(ox) {
      g.beginPath();
      g.moveTo(ox - w * 0.06, h * 0.16);
      g.lineTo(ox - w * 0.03, h * 0.14);
      g.lineTo(ox + w * 0.03, h * 0.14);
      g.lineTo(ox + w * 0.06, h * 0.16);
      g.lineTo(ox + w * 0.03, h * 0.22);
      g.lineTo(ox - w * 0.03, h * 0.22);
      g.closePath();
      g.fill();
    }
    hexLight(-w * 0.34);
    hexLight(w * 0.34);
    g.shadowBlur = 0;

    // aggressive diffuser
    g.fillStyle = "#0a0a0a";
    g.beginPath();
    g.moveTo(-w * 0.4, h * 0.26);
    g.lineTo(w * 0.4, h * 0.26);
    g.lineTo(w * 0.44, h * 0.36);
    g.lineTo(-w * 0.44, h * 0.36);
    g.closePath();
    g.fill();
    g.fillStyle = L.body;
    for (let i = -2; i <= 2; i++) {
      g.fillRect(i * w * 0.1 - w * 0.02, h * 0.26, w * 0.04, h * 0.1);
    }

    // quad exhaust
    drawExhaust(g, [-w * 0.2, -w * 0.1, w * 0.1, w * 0.2], h * 0.34, w * 0.025, h * 0.018);
    drawWheels(g, w, h, -w * 0.56, w * 0.46, h * 0.06, h * 0.3, w * 0.1);

    if (L.id === "neon") {
      g.strokeStyle = L.accent;
      g.lineWidth = Math.max(1, w * 0.02);
      g.strokeRect(-w * 0.14, -h * 0.28, w * 0.28, h * 0.12);
    }
  }

  /** Refined GT fastback — reads as Aston Martin */
  function drawShapeVantage(g, w, h, L) {
    g.fillStyle = L.body;
    g.beginPath();
    g.moveTo(-w * 0.13, -h * 0.42);
    g.lineTo(w * 0.13, -h * 0.42);
    g.quadraticCurveTo(w * 0.26, -h * 0.12, w * 0.45, h * 0.12);
    g.quadraticCurveTo(w * 0.48, h * 0.24, w * 0.42, h * 0.34);
    g.lineTo(-w * 0.42, h * 0.34);
    g.quadraticCurveTo(-w * 0.48, h * 0.24, -w * 0.45, h * 0.12);
    g.quadraticCurveTo(-w * 0.26, -h * 0.12, -w * 0.13, -h * 0.42);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;

    // continuous elegant light bar
    g.fillStyle = "#ff2038";
    g.shadowColor = "#ff2038";
    g.shadowBlur = 14;
    g.beginPath();
    g.moveTo(-w * 0.38, h * 0.16);
    g.quadraticCurveTo(0, h * 0.13, w * 0.38, h * 0.16);
    g.lineTo(w * 0.38, h * 0.22);
    g.quadraticCurveTo(0, h * 0.19, -w * 0.38, h * 0.22);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;

    // cabin fastback
    g.fillStyle = "rgba(30, 48, 88, 0.92)";
    g.beginPath();
    g.moveTo(-w * 0.11, -h * 0.38);
    g.lineTo(w * 0.11, -h * 0.38);
    g.lineTo(w * 0.2, h * 0.02);
    g.lineTo(-w * 0.2, h * 0.02);
    g.closePath();
    g.fill();

    // side strake suggestion on haunches
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.lineWidth = Math.max(1, w * 0.012);
    g.beginPath();
    g.moveTo(-w * 0.36, h * 0.0);
    g.lineTo(-w * 0.44, h * 0.12);
    g.stroke();
    g.beginPath();
    g.moveTo(w * 0.36, h * 0.0);
    g.lineTo(w * 0.44, h * 0.12);
    g.stroke();

    // mirrors — chrome-ish
    g.fillStyle = "#b8b8c0";
    g.beginPath();
    g.ellipse(-w * 0.2, -h * 0.24, w * 0.045, h * 0.032, -0.2, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(w * 0.2, -h * 0.24, w * 0.045, h * 0.032, 0.2, 0, Math.PI * 2);
    g.fill();

    // lip spoiler
    g.fillStyle = L.accent;
    g.fillRect(-w * 0.28, h * 0.06, w * 0.56, h * 0.03);

    paintStripe(g, w, h, L, -w * 0.04, -h * 0.4, w * 0.08, h * 0.52);

    // refined bumper
    g.fillStyle = L.accent;
    g.fillRect(-w * 0.34, h * 0.26, w * 0.68, h * 0.06);

    // dual oval exhaust
    drawExhaust(g, [-w * 0.12, w * 0.12], h * 0.36, w * 0.038, h * 0.024);
    drawWheels(g, w, h, -w * 0.5, w * 0.4, h * 0.08, h * 0.28, w * 0.1);

    // wing badge hint (small ellipse)
    g.fillStyle = "#c8c8d0";
    g.beginPath();
    g.ellipse(0, h * 0.1, w * 0.04, h * 0.02, 0, 0, Math.PI * 2);
    g.fill();

    if (L.id === "neon") {
      g.strokeStyle = L.accent;
      g.lineWidth = Math.max(1, w * 0.018);
      g.strokeRect(-w * 0.16, -h * 0.22, w * 0.32, h * 0.16);
    }
  }

  // ─── Entities ──────────────────────────────────────────────
  function makePlayer() {
    return {
      z: 0,
      x: 0,
      speed: 0,
      lap: 1,
      finished: false,
      finishTime: 0,
      nitro: NITRO_MAX,
      carId: selectedCarId,
      liveryId: selectedLiveryId,
      spin: 0,
      name: "YOU",
    };
  }

  function makeRivals() {
    const used = new Set([selectedCarId + ":" + selectedLiveryId]);
    const list = [];
    for (let i = 0; i < RIVAL_COUNT; i++) {
      let car, liv, key;
      let tries = 0;
      do {
        car = CARS[(i + 1 + tries) % CARS.length];
        liv = LIVERIES[(i * 2 + tries) % LIVERIES.length];
        key = car.id + ":" + liv.id;
        tries++;
      } while (used.has(key) && tries < 20);
      used.add(key);
      const spacing = SEG_LENGTH * (6 + i * 10); // ahead of player, staggered
      list.push({
        z: spacing % trackLength,
        x: ((i % 3) - 1) * 0.35,
        speed: 0, // fair start — no free launch speed vs player
        targetSpeed: MAX_SPEED * (0.6 + Math.random() * 0.25),
        lap: 1,
        finished: false,
        finishTime: 0,
        carId: car.id,
        liveryId: liv.id,
        name: car.short || car.name.split(" ")[0].toUpperCase(),
        aiPhase: Math.random() * Math.PI * 2,
        spin: 0,
      });
    }
    return list;
  }

  // ─── Race lifecycle ────────────────────────────────────────
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  function hideAllOverlays() {
    [startScreen, garageScreen, countdownEl, resultsScreen, nameScreen, scoresScreen].forEach(hide);
  }

  function goTitle() {
    state = "title";
    hideAllOverlays();
    hide(hud);
    hide(touchEl);
    show(startScreen);
    player = null;
  }

  function goGarage() {
    state = "garage";
    hideAllOverlays();
    show(garageScreen);
    renderGarageUI();
  }

  function startCountdown() {
    state = "countdown";
    hideAllOverlays();
    buildTrack();
    player = makePlayer();
    rivals = makeRivals();
    raceTime = 0;
    bestLapThisRace = Infinity;
    lapStartTime = 0;
    cameraZ = 0;
    rumble = 0;
    show(hud);
    show(touchEl);
    touchEl.setAttribute("aria-hidden", "false");
    updateHUD();
    show(countdownEl);
    let n = 3;
    countdownNum.textContent = "3";
    const tick = () => {
      if (n > 1) {
        n--;
        countdownNum.textContent = String(n);
        setTimeout(tick, 850);
      } else if (n === 1) {
        n = 0;
        countdownNum.textContent = "GO";
        // Race starts on GO — player can accelerate immediately (held keys carry through)
        state = "racing";
        lapStartTime = performance.now();
        lastTs = performance.now();
        // Brief launch assist if accel already held from countdown (keyboard or touch)
        if (keys.accel) {
          player.speed = Math.max(player.speed, MAX_SPEED * 0.18);
        }
        setTimeout(() => {
          hide(countdownEl);
        }, 700);
      }
    };
    setTimeout(tick, 850);
  }

  function finishRace() {
    if (state !== "racing") return;
    state = "name";
    player.finished = true;
    player.finishTime = raceTime;
    if (!player.finishTime) player.finishTime = raceTime;
    // finalize unfinished rivals with projected times
    rivals.forEach((r) => {
      if (!r.finished) {
        const remain = Math.max(0, TOTAL_LAPS * trackLength - (r.z + (r.lap - 1) * trackLength));
        r.finishTime = raceTime + remain / Math.max(40, r.speed);
        r.finished = true;
      }
    });
    const field = [
      { name: "YOU", time: player.finishTime, you: true, carId: player.carId, liveryId: player.liveryId },
      ...rivals.map((r) => ({ name: r.name, time: r.finishTime, you: false, carId: r.carId, liveryId: r.liveryId })),
    ].sort((a, b) => a.time - b.time);
    const place = field.findIndex((f) => f.you) + 1;
    pendingResult = {
      place,
      time: player.finishTime,
      bestLap: bestLapThisRace === Infinity ? player.finishTime / TOTAL_LAPS : bestLapThisRace,
      field,
      carId: player.carId,
      liveryId: player.liveryId,
      wins: place === 1 ? 1 : 0,
    };
    hide(touchEl);
    nameSummary.textContent = `${ordinal(place)} · ${formatTime(pendingResult.time)} · ${getCar(player.carId).name}`;
    playerNameInput.value = localStorage.getItem(NAME_KEY) || "";
    hideAllOverlays();
    show(nameScreen);
    setTimeout(() => playerNameInput.focus(), 100);
  }

  function showResults() {
    state = "results";
    hideAllOverlays();
    show(hud);
    const r = pendingResult;
    resultsTitle.textContent = r.place === 1 ? "VICTORY" : "FINISH";
    resultsPlace.textContent = ordinal(r.place);
    resultsTime.textContent = formatTime(r.time);
    resultsBoard.innerHTML = r.field
      .map((f, i) => {
        const car = getCar(f.carId);
        const liv = getLivery(f.liveryId);
        return `<div class="rb-row${f.you ? " you" : ""}"><span class="rb-pos">${i + 1}</span><span>${f.name}${f.you ? "" : " · " + (car.short || car.name.split(" ")[0])}</span><span>${formatTime(f.time)}</span></div>`;
      })
      .join("");
    show(resultsScreen);
  }

  // ─── High scores (localStorage multi-user) ─────────────────
  function loadScores() {
    try {
      const raw = localStorage.getItem(SCORE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveScores(list) {
    localStorage.setItem(SCORE_KEY, JSON.stringify(list.slice(0, TOP_N)));
  }

  function upsertScore(name, result) {
    const clean = name.trim().toUpperCase().replace(/[^A-Z0-9 _\-.]/g, "").slice(0, 12);
    if (clean.length < 3) return false;
    localStorage.setItem(NAME_KEY, clean);
    let list = loadScores();
    let entry = list.find((e) => e.name === clean);
    const car = getCar(result.carId);
    const liv = getLivery(result.liveryId);
    if (!entry) {
      entry = {
        name: clean,
        bestTime: result.time,
        bestLap: result.bestLap,
        bestPlace: result.place,
        wins: result.wins,
        races: 1,
        carId: result.carId,
        liveryId: result.liveryId,
        carName: car.name,
        liveryName: liv.name,
        updated: Date.now(),
      };
      list.push(entry);
    } else {
      entry.races = (entry.races || 0) + 1;
      entry.wins = (entry.wins || 0) + result.wins;
      if (result.time < entry.bestTime) entry.bestTime = result.time;
      if (result.bestLap < entry.bestLap) entry.bestLap = result.bestLap;
      if (result.place < entry.bestPlace) entry.bestPlace = result.place;
      entry.carId = result.carId;
      entry.liveryId = result.liveryId;
      entry.carName = car.name;
      entry.liveryName = liv.name;
      entry.updated = Date.now();
    }
    list.sort((a, b) => a.bestTime - b.bestTime || a.bestPlace - b.bestPlace);
    saveScores(list);
    return true;
  }

  function renderScoresList() {
    const list = loadScores();
    if (!list.length) {
      scoresList.innerHTML = `<div class="scores-empty">No scores yet. Finish a race and save your name.</div>`;
      return;
    }
    scoresList.innerHTML = list
      .map((e, i) => {
        const top = i < 3 ? " top3" : "";
        return `<div class="score-row${top}">
          <div class="score-rank">${i + 1}</div>
          <div><span class="score-name">${escapeHtml(e.name)}</span>
            <span class="score-meta">${escapeHtml(e.carName || "")} · ${escapeHtml(e.liveryName || "")}</span></div>
          <div class="score-stats">
            <span class="score-time">${formatTime(e.bestTime)}</span>
            <span class="score-extra">Lap ${formatTime(e.bestLap)} · P${e.bestPlace}${e.wins ? " · " + e.wins + "W" : ""}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  function goScores(from) {
    scoresReturnTo = from || state;
    state = "scores";
    hideAllOverlays();
    renderScoresList();
    show(scoresScreen);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatTime(ms) {
    if (!isFinite(ms) || ms < 0) return "—";
    const t = ms / 1000;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const d = Math.floor((t * 10) % 10);
    return `${m}:${s.toString().padStart(2, "0")}.${d}`;
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ─── Garage UI ─────────────────────────────────────────────
  function renderGarageUI() {
    carGrid.innerHTML = "";
    CARS.forEach((car) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "car-slot" + (car.id === selectedCarId ? " selected" : "");
      btn.innerHTML = `<span class="slot-name">${car.name}</span>`;
      const mini = document.createElement("canvas");
      mini.width = 72;
      mini.height = 40;
      btn.appendChild(mini);
      const liv = car.id === selectedCarId ? selectedLiveryId : car.defaultLivery;
      drawCar(mini.getContext("2d"), 36, 24, 48, liv, car.shape, 1);
      btn.addEventListener("click", () => {
        selectedCarId = car.id;
        if (!getLivery(selectedLiveryId)) selectedLiveryId = car.defaultLivery;
        renderGarageUI();
      });
      carGrid.appendChild(btn);
    });

    swatchesEl.innerHTML = "";
    LIVERIES.forEach((liv) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (liv.id === selectedLiveryId ? " selected" : "");
      b.style.background = `linear-gradient(145deg, ${liv.body} 55%, ${liv.accent})`;
      if (liv.stripe) {
        b.style.backgroundImage = `linear-gradient(90deg, transparent 42%, ${liv.stripe} 42%, ${liv.stripe} 58%, transparent 58%), linear-gradient(145deg, ${liv.body} 55%, ${liv.accent})`;
      }
      b.title = liv.name;
      b.innerHTML = `<span class="swatch-tip">${liv.name}</span>`;
      b.addEventListener("click", () => {
        selectedLiveryId = liv.id;
        renderGarageUI();
      });
      swatchesEl.appendChild(b);
    });

    const car = getCar(selectedCarId);
    const liv = getLivery(selectedLiveryId);
    previewName.textContent = car.name;
    previewLivery.textContent = liv.name;
    garageCtx.clearRect(0, 0, garageCanvas.width, garageCanvas.height);
    // floor glow
    garageCtx.fillStyle = "rgba(0,240,255,0.06)";
    garageCtx.beginPath();
    garageCtx.ellipse(90, 88, 70, 12, 0, 0, Math.PI * 2);
    garageCtx.fill();
    drawCar(garageCtx, 90, 62, 110, selectedLiveryId, car.shape, 1);
  }

  // ─── Update / physics ──────────────────────────────────────
  function percentRemaining(n, total) {
    return ((n % total) + total) % total;
  }

  function update(dt) {
    if (state !== "racing" && state !== "countdown") return;
    const canDrive = state === "racing";

    if (canDrive) {
      raceTime += dt * 1000;
      // player
      if (keys.accel) player.speed += ACCEL * (keys.boost && player.nitro > 0 ? NITRO_BOOST : 1) * 60 * dt;
      if (keys.brake) player.speed -= BRAKE * 60 * dt;
      player.speed -= FRICTION * 60 * dt;
      if (keys.boost && player.nitro > 0 && keys.accel) {
        player.nitro = Math.max(0, player.nitro - NITRO_DRAIN * 60 * dt);
      } else {
        player.nitro = Math.min(NITRO_MAX, player.nitro + NITRO_REGEN * 60 * dt);
      }

      const seg = findSegment(player.z);
      let dx = 0;
      if (keys.left) dx -= STEER_RATE * (player.speed / MAX_SPEED) * 60 * dt;
      if (keys.right) dx += STEER_RATE * (player.speed / MAX_SPEED) * 60 * dt;
      // centrifugal from curve
      player.x += dx;
      player.x -= (dx ? 0 : 0) + seg.curve * CENTRIFUGAL * (player.speed / MAX_SPEED) * (player.speed / MAX_SPEED) * 60 * dt * 0.015;

      player.x = Math.max(-2, Math.min(2, player.x));

      // off-road
      if (Math.abs(player.x) > 1) {
        player.speed -= OFFROAD_FRICTION * 60 * dt;
        rumble = Math.min(6, rumble + 0.5);
      } else {
        rumble *= 0.85;
      }

      if (player.spin > 0) {
        player.spin -= dt;
        player.x += Math.sin(player.spin * 20) * 0.01;
        player.speed *= 0.98;
      }

      player.speed = Math.max(0, Math.min(MAX_SPEED * (keys.boost && player.nitro > 0 ? 1.12 : 1), player.speed));
      const oldZ = player.z;
      player.z += player.speed * 60 * dt;
      // lap
      if (player.z >= trackLength) {
        player.z -= trackLength;
        const lapTime = performance.now() - lapStartTime;
        if (player.lap >= 1) bestLapThisRace = Math.min(bestLapThisRace, lapTime);
        player.lap++;
        lapStartTime = performance.now();
        if (player.lap > TOTAL_LAPS) {
          player.z = Math.min(player.z, trackLength - 1);
          finishRace();
          return;
        }
      }

      // rival collisions
      rivals.forEach((r) => {
        const dzFwd = percentRemaining(r.z - player.z, trackLength);
        const dzBack = percentRemaining(player.z - r.z, trackLength);
        const dzNear = Math.min(dzFwd, dzBack);
        if (dzNear < 140 && Math.abs(r.x - player.x) < 0.42) {
          player.speed *= 0.55;
          player.spin = 0.45;
          rumble = 8;
          if (player.x < r.x) player.x -= 0.08;
          else player.x += 0.08;
          r.x += player.x < r.x ? 0.06 : -0.06;
        }
      });

      // AI rivals
      rivals.forEach((r, i) => {
        if (r.finished) return;
        r.aiPhase += dt;
        r.targetSpeed = MAX_SPEED * (0.58 + 0.2 * Math.sin(r.aiPhase * 0.3 + i) * 0.5 + 0.2);
        // slow in curves a bit
        const rseg = findSegment(r.z);
        if (Math.abs(rseg.curve) > 3) r.targetSpeed *= 0.82;
        // Accel/decel comparable to player ACCEL so AI does not get a free jump
        if (r.speed < r.targetSpeed) r.speed += 0.58 * 60 * dt;
        else r.speed -= 0.15 * 60 * dt;
        r.speed = Math.max(0, Math.min(MAX_SPEED * 0.92, r.speed));
        // stay near lane, dodge player
        let tx = ((i % 3) - 1) * 0.4 + Math.sin(r.aiPhase + i) * 0.15;
        const pdz = percentRemaining(player.z - r.z, trackLength);
        if (pdz < 300 && Math.abs(player.x - r.x) < 0.5) tx = player.x > 0 ? -0.55 : 0.55;
        r.x += (tx - r.x) * 0.03 * 60 * dt;
        r.x = Math.max(-0.95, Math.min(0.95, r.x));
        r.z += r.speed * 60 * dt;
        if (r.z >= trackLength) {
          r.z -= trackLength;
          r.lap++;
          if (r.lap > TOTAL_LAPS) {
            r.finished = true;
            r.finishTime = raceTime;
            r.z = trackLength - 1;
          }
        }
      });
    }

    cameraZ = player ? player.z : 0;
    if (segments.length && player) {
      bgOffset += player.speed * 0.02 * (findSegment(cameraZ).curve || 0);
    }
    updateHUD();
  }

  function progressOf(car) {
    return (car.lap - 1) * trackLength + car.z;
  }

  function updateHUD() {
    if (!player) return;
    const kmh = Math.round(player.speed * 1.1);
    hudSpeed.textContent = String(kmh);
    hudLap.textContent = `${Math.min(player.lap, TOTAL_LAPS)}/${TOTAL_LAPS}`;
    hudTime.textContent = formatTime(raceTime);
    nitroFill.style.width = `${(player.nitro / NITRO_MAX) * 100}%`;
    const field = [player, ...rivals];
    field.sort((a, b) => progressOf(b) - progressOf(a));
    const pos = field.indexOf(player) + 1;
    hudPos.innerHTML = `${pos}<span class="pos-of">/${field.length}</span>`;
  }

  // ─── Render world ──────────────────────────────────────────
  function render() {
    const w = canvas.width;
    const h = canvas.height;
    // sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    skyGrad.addColorStop(0, "#06061a");
    skyGrad.addColorStop(0.5, "#12103a");
    skyGrad.addColorStop(1, "#1a0840");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // stars / city glow
    ctx.fillStyle = "rgba(0,240,255,0.35)";
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97 + bgOffset * 0.1) % w + w) % w;
      const sy = (i * 53) % (h * 0.4);
      ctx.fillRect(sx, sy, 2, 2);
    }
    // distant hills
    ctx.fillStyle = "#0c0c22";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.52);
    for (let x = 0; x <= w; x += 40) {
      const y = h * 0.48 + Math.sin((x + bgOffset) * 0.01) * 18 + Math.sin((x + bgOffset) * 0.03) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    if (!segments.length || !player) {
      // idle title backdrop road hint
      ctx.fillStyle = "#0a1e12";
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
      return;
    }

    const baseSeg = findSegment(cameraZ);
    const playerY = baseSeg.p1.world.y;
    let maxY = h;
    let x = 0;
    let dx = 0;
    const camH = CAMERA_H + playerY;
    const startPos = Math.floor(cameraZ / SEG_LENGTH) % segments.length;

    // project and draw road from far to near (Jake Gordon–style strip road)
    for (let n = 0; n < DRAW_DIST; n++) {
      const segIdx = (startPos + n) % segments.length;
      const seg = segments[segIdx];
      const looped = startPos + n >= segments.length;
      const camZ = cameraZ - (looped ? trackLength : 0);

      project(seg.p1, x - player.x * ROAD_WIDTH, camH, camZ, w, h);
      x += dx;
      dx += seg.curve;
      project(seg.p2, x - player.x * ROAD_WIDTH, camH, camZ, w, h);

      if (seg.p1.world.z - camZ <= CAMERA_DEPTH || seg.p2.world.z - camZ <= CAMERA_DEPTH) continue;
      if ((seg.p1.screen.y >= maxY && n > 0) || seg.p2.screen.y >= seg.p1.screen.y) continue;
      maxY = seg.p1.screen.y;

      drawSegment(
        w, h,
        seg.p1.screen.x, seg.p1.screen.y, seg.p1.screen.w,
        seg.p2.screen.x, seg.p2.screen.y, seg.p2.screen.w,
        seg.color
      );
    }

    // sprites & cars — near to far reverse
    for (let n = DRAW_DIST - 1; n > 0; n--) {
      const segIdx = (startPos + n) % segments.length;
      const seg = segments[segIdx];
      // roadside
      const segScale = seg.p1.screen.scale;
      if (segScale > 0.00005) {
        seg.sprites.forEach((sp) => {
          const sx = seg.p1.screen.x + seg.p1.screen.w * sp.offset;
          const sy = seg.p1.screen.y;
          drawSprite(sp.kind, sx, sy, Math.max(8, seg.p1.screen.w * 0.55), sp.offset);
        });
        rivals.forEach((r) => {
          let rSeg = Math.floor(r.z / SEG_LENGTH) % segments.length;
          if (rSeg < 0) rSeg += segments.length;
          if (rSeg !== segIdx) return;
          const cx = seg.p1.screen.x + seg.p1.screen.w * r.x;
          const cy = seg.p1.screen.y;
          const carScale = Math.max(8, seg.p1.screen.w * 0.38);
          if (carScale < 8) return;
          drawCar(ctx, cx, cy, carScale, r.liveryId, getCar(r.carId).shape, 1);
        });
      }
    }

    // player car (bottom center, slight rumble)
    const px = w / 2 + rumble * (Math.random() - 0.5) * 2;
    const py = h - h * 0.14 + rumble * (Math.random() - 0.5);
    drawCar(ctx, px, py, Math.min(160, w * 0.22), player.liveryId, getCar(player.carId).shape, 1);

    // speed lines when boosting
    if (state === "racing" && keys.boost && player.nitro > 0 && player.speed > 100) {
      ctx.strokeStyle = "rgba(0,240,255,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const lx = (Math.random() * w);
        const ly = h * 0.3 + Math.random() * h * 0.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + 20 + player.speed * 0.15);
        ctx.stroke();
      }
    }
  }

  // ─── Loop ──────────────────────────────────────────────────
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    // resize canvas to display
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.max(320, Math.floor(rect.width * dpr));
    const th = Math.max(240, Math.floor(rect.height * dpr));
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    render();
    requestAnimationFrame(frame);
  }

  // ─── Events ────────────────────────────────────────────────
  document.getElementById("btn-start").addEventListener("click", goGarage);
  document.getElementById("btn-back").addEventListener("click", goTitle);
  document.getElementById("btn-confirm").addEventListener("click", startCountdown);
  document.getElementById("btn-again").addEventListener("click", goGarage);
  document.getElementById("btn-menu").addEventListener("click", goTitle);
  document.getElementById("btn-scores-title").addEventListener("click", () => goScores("title"));
  document.getElementById("btn-scores-results").addEventListener("click", () => goScores("results"));
  document.getElementById("btn-scores-back").addEventListener("click", () => {
    if (scoresReturnTo === "results") showResults();
    else goTitle();
  });
  document.getElementById("btn-scores-clear").addEventListener("click", () => {
    if (confirm("Clear all high scores on this device?")) {
      localStorage.removeItem(SCORE_KEY);
      renderScoresList();
    }
  });
  document.getElementById("btn-save-score").addEventListener("click", () => {
    const ok = upsertScore(playerNameInput.value, pendingResult);
    if (!ok) {
      playerNameInput.focus();
      playerNameInput.style.borderColor = "#ff2bd6";
      return;
    }
    showResults();
  });
  document.getElementById("btn-skip-score").addEventListener("click", showResults);
  playerNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btn-save-score").click();
  });

  // boot
  buildTrack();
  goTitle();
  requestAnimationFrame(frame);
})();
