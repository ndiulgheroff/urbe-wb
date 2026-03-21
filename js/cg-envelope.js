import { CG_ENVELOPES } from './fleet-data.js';
import { t } from './i18n.js';

const MARGIN = { top: 44, right: 30, bottom: 58, left: 80 };
const CG_MIN = 2.35, CG_MAX = 2.58;
const MASS_MIN = 900, MASS_MAX = 1350;

export function renderEnvelope(canvas, options) {
  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;
  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = displayW - MARGIN.left - MARGIN.right;
  const h = displayH - MARGIN.top - MARGIN.bottom;

  function toCx(cg) { return MARGIN.left + (cg - CG_MIN) / (CG_MAX - CG_MIN) * w; }
  function toCy(mass) { return MARGIN.top + h - (mass - MASS_MIN) / (MASS_MAX - MASS_MIN) * h; }

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, displayW, displayH);

  // Grid
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  for (let cg = 2.35; cg <= 2.58; cg += 0.05) {
    ctx.beginPath(); ctx.moveTo(toCx(cg), MARGIN.top); ctx.lineTo(toCx(cg), MARGIN.top + h); ctx.stroke();
  }
  for (let m = 900; m <= 1350; m += 50) {
    ctx.beginPath(); ctx.moveTo(MARGIN.left, toCy(m)); ctx.lineTo(MARGIN.left + w, toCy(m)); ctx.stroke();
  }

  // Draw envelope polygon
  const envelope = CG_ENVELOPES[options.maxTakeoffMass];
  if (envelope) {
    const fwdPoints = envelope.map(p => [p.cgFwd, p.mass]);
    const aftPoints = envelope.map(p => [p.cgAft, p.mass]).reverse();
    const polygon = [...fwdPoints, ...aftPoints];

    ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    polygon.forEach(([cg, mass], i) => {
      const x = toCx(cg), y = toCy(mass);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, MARGIN.top);
  ctx.lineTo(MARGIN.left, MARGIN.top + h);
  ctx.lineTo(MARGIN.left + w, MARGIN.top + h);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#ccc';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  for (let cg = 2.35; cg <= 2.58; cg += 0.05) {
    ctx.fillText(cg.toFixed(2), toCx(cg), MARGIN.top + h + 22);
  }
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('CG (m)', MARGIN.left + w / 2, MARGIN.top + h + 46);

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'right';
  for (let m = 900; m <= 1350; m += 50) {
    ctx.fillText(m.toString(), MARGIN.left - 10, toCy(m) + 5);
  }

  ctx.save();
  ctx.translate(16, MARGIN.top + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Mass (kg)', 0, 0);
  ctx.restore();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t('cgDiagram'), MARGIN.left + w / 2, 24);

  // Plot CG points with label offset to avoid overlap
  function plotPoint(cg, mass, color, label, labelYOffset) {
    if (cg == null || mass == null || mass <= 0) return;
    const x = toCx(cg), y = toCy(mass);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Label with background for readability
    ctx.font = 'bold 13px sans-serif';
    const textW = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
    ctx.fillRect(x + 10, y + labelYOffset - 12, textW + 6, 17);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 13, y + labelYOffset);
  }

  // CG without fuel (reference, always orange) — label ABOVE the point
  plotPoint(options.cgNoFuel, options.massNoFuel, '#FF9800', t('cgNoFuel'), -14);

  // CG with fuel (green if in limits, red if not) — label BELOW the point
  const fullColor = options.cgFullInLimits ? '#4CAF50' : '#f44336';
  plotPoint(options.cgFull, options.massFull, fullColor, t('cgWithFuel'), 18);
}
