import { CG_ENVELOPES } from './fleet-data.js';
import { t } from './i18n.js';

const MARGIN = { top: 50, right: 40, bottom: 60, left: 80 };
const CG_MIN = 2.38, CG_MAX = 2.58;
const MASS_MIN = 920, MASS_MAX = 1330;
const MAX_ZERO_FUEL_MASS = 1200;

export function renderEnvelope(canvas, options, printMode = false) {
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

  // Colors
  const pm = printMode;
  const c = {
    bg:        pm ? 'transparent' : '#fafafa',
    border:    pm ? '#000' : '#333',
    grid:      pm ? '#ddd' : '#e0e0e0',
    axis:      pm ? '#000' : '#333',
    axisLabel: pm ? '#000' : '#333',
    title:     pm ? '#000' : '#000',
    envelope:  pm ? '#000' : '#1a5e1f',
    envFill:   pm ? 'rgba(200,230,200,0.3)' : 'rgba(200,230,200,0.4)',
    dashLine:  pm ? '#000' : '#666',
    text:      pm ? '#000' : '#333',
    labelBg:   pm ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.9)',
  };

  // Background
  if (printMode) {
    ctx.clearRect(0, 0, displayW, displayH);
  } else {
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, displayW, displayH);
  }

  // Border frame
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(MARGIN.left, MARGIN.top, w, h);

  // Grid lines
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 0.5;
  for (let cg = 2.40; cg <= 2.56; cg += 0.02) {
    const x = toCx(cg);
    ctx.beginPath(); ctx.moveTo(x, MARGIN.top); ctx.lineTo(x, MARGIN.top + h); ctx.stroke();
  }
  for (let m = 940; m <= 1320; m += 20) {
    const y = toCy(m);
    ctx.beginPath(); ctx.moveTo(MARGIN.left, y); ctx.lineTo(MARGIN.left + w, y); ctx.stroke();
  }

  // Draw envelope polygon
  const envelope = CG_ENVELOPES[options.maxTakeoffMass];
  if (envelope) {
    const fwdPoints = envelope.map(p => [p.cgFwd, p.mass]);
    const aftPoints = envelope.map(p => [p.cgAft, p.mass]).reverse();
    const polygon = [...fwdPoints, ...aftPoints];

    // Fill
    ctx.fillStyle = c.envFill;
    ctx.beginPath();
    polygon.forEach(([cg, mass], i) => {
      const x = toCx(cg), y = toCy(mass);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Stroke — thick solid line like the AFM
    ctx.strokeStyle = c.envelope;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    polygon.forEach(([cg, mass], i) => {
      const x = toCx(cg), y = toCy(mass);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  // MTOM line (dashed)
  const mtom = options.maxTakeoffMass;
  if (mtom <= MASS_MAX) {
    ctx.save();
    ctx.strokeStyle = c.dashLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    const yMtom = toCy(mtom);
    ctx.beginPath(); ctx.moveTo(MARGIN.left, yMtom); ctx.lineTo(MARGIN.left + w, yMtom); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`MTOM ${mtom} kg`, MARGIN.left + 4, yMtom - 4);
    ctx.restore();
  }

  // Max Zero Fuel Mass line (dashed)
  ctx.save();
  ctx.strokeStyle = c.dashLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 3]);
  const yZF = toCy(MAX_ZERO_FUEL_MASS);
  ctx.beginPath(); ctx.moveTo(MARGIN.left, yZF); ctx.lineTo(MARGIN.left + w, yZF); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = c.text;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Max Zero Fuel Mass 1200 kg', MARGIN.left + 4, yZF - 4);
  ctx.restore();

  // Axes tick marks and labels
  ctx.fillStyle = c.axisLabel;
  ctx.strokeStyle = c.axis;
  ctx.lineWidth = 1;

  // X axis labels (CG)
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  for (let cg = 2.40; cg <= 2.56; cg += 0.02) {
    const x = toCx(cg);
    // Tick mark
    ctx.beginPath(); ctx.moveTo(x, MARGIN.top + h); ctx.lineTo(x, MARGIN.top + h + 5); ctx.stroke();
    ctx.fillText(cg.toFixed(2), x, MARGIN.top + h + 20);
  }
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Center of Gravity Position [m]', MARGIN.left + w / 2, MARGIN.top + h + 45);

  // Y axis labels (Mass)
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  for (let m = 940; m <= 1320; m += 20) {
    const y = toCy(m);
    // Tick mark
    ctx.beginPath(); ctx.moveTo(MARGIN.left - 5, y); ctx.lineTo(MARGIN.left, y); ctx.stroke();
    // Only label every 40 kg to avoid clutter
    if (m % 40 === 0 || m === 940) {
      ctx.fillText(m.toString(), MARGIN.left - 8, y + 4);
    }
  }

  ctx.save();
  ctx.translate(16, MARGIN.top + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Flight Mass [kg]', 0, 0);
  ctx.restore();

  // Title
  ctx.fillStyle = c.title;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('6.4.4  PERMISSIBLE CENTER OF GRAVITY RANGE', MARGIN.left + w / 2, MARGIN.top - 16);

  // Plot CG points
  function plotPoint(cg, mass, color, label, labelYOffset) {
    if (cg == null || mass == null || mass <= 0) return;
    // Clamp to chart area for display
    const x = toCx(cg), y = toCy(mass);

    // Marker: filled triangle like AFM style
    const sz = 7;
    ctx.beginPath();
    ctx.moveTo(x, y - sz);
    ctx.lineTo(x - sz, y + sz);
    ctx.lineTo(x + sz, y + sz);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label with background
    ctx.font = 'bold 12px sans-serif';
    const textW = ctx.measureText(label).width;
    ctx.fillStyle = c.labelBg;
    ctx.fillRect(x + 12, y + labelYOffset - 11, textW + 6, 16);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 15, y + labelYOffset);
  }

  // CG without fuel (reference) — orange triangle, label above
  plotPoint(options.cgNoFuel, options.massNoFuel, '#e65100', t('cgNoFuel'), -14);

  // CG with fuel — green/red triangle, label below
  const fullColor = options.cgFullInLimits ? '#2E7D32' : '#c62828';
  plotPoint(options.cgFull, options.massFull, fullColor, t('cgWithFuel'), 18);

  // Draw line connecting the two points (like AFM examples)
  if (options.cgNoFuel && options.cgFull && options.massNoFuel > 0 && options.massFull > 0) {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(toCx(options.cgNoFuel), toCy(options.massNoFuel));
    ctx.lineTo(toCx(options.cgFull), toCy(options.massFull));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
