// ChannelList.jsx
import React, { useEffect, useState } from "react";
import { execToObjects } from "./utils/SqlHelpers";

/*
  Usage:
  <ChannelList db={db} />
  - db is the sql.js Database instance (returned from parseSessionFile)
  - shows channels with id BETWEEN 21 AND 116 AND snapshotId = 10000
*/

function safeExec(db, sql) {
  try {
    return execToObjects(db, sql);
  } catch (err) {
    console.error("SQL error:", err, sql);
    return [];
  }
}

function msFromSec(s) {
  return (Number(s || 0) * 1000).toFixed(2);
}

export default function ChannelList({ db }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db) return;
    setLoading(true);

    // 1) Fetch channels by id range and snapshotId = 10000 (Channel.id used for range)
    const chanSql = `
      SELECT id, snapshotId, channelNumber, name, gain
      FROM Channel
      WHERE id BETWEEN 21 AND 116
        AND snapshotId = 10000
      ORDER BY id;
    `;
    const chanRows = safeExec(db, chanSql);

    // For each channel row, fetch related tables by channelNumber
    const results = chanRows.map((ch) => {
      const chNum = ch.channelNumber;

      // EQ bands
      // Fetch all EQ rows for this channel
      const eqRowsRaw = safeExec(
        db,
        `
  SELECT id, bandNumber, name, frequency, gain, qvalue
  FROM EqualiserBand
  WHERE channelNumber = ${chNum}
    AND snapshotId = 10000
  ORDER BY bandNumber, id ASC;   -- important: ensures first entry appears first
`
      );

      // Deduplicate by bandNumber (or name). Keep the FIRST row.
      const eqByBand = {};
      for (const row of eqRowsRaw) {
        if (!eqByBand[row.bandNumber]) {
          eqByBand[row.bandNumber] = row;
        }
      }

      // final ordered list A, B, C, D
      const eq = Object.values(eqByBand).sort(
        (a, b) => a.bandNumber - b.bandNumber
      );

      // Compressor = processorNumber = 0
      const compSql = `
        SELECT threashold, ratio, gain, attack, release
        FROM DynamicProcessor
        WHERE channelNumber = ${chNum}
          AND snapshotId = 10000
          AND processorNumber = 0
        LIMIT 1;
      `;
      const compRows = safeExec(db, compSql);
      const comp = compRows.length ? compRows[0] : null;

      // Gate = processorNumber = 1
      const gateSql = `
        SELECT threashold, attack, hold, release
        FROM DynamicProcessor
        WHERE channelNumber = ${chNum}
          AND snapshotId = 10000
          AND processorNumber = 1
        LIMIT 1;
      `;
      const gateRows = safeExec(db, gateSql);
      const gate = gateRows.length ? gateRows[0] : null;

      // Passband (HPF/LPF)
      const passSql = `
        SELECT highPassEnabled, highPassFrequency, lowPassEnabled, lowPassFrequency
        FROM Passband
        WHERE channelNumber = ${chNum}
          AND snapshotId = 10000
        LIMIT 1;
      `;
      const passRows = safeExec(db, passSql);
      const pass = passRows.length ? passRows[0] : null;

      return {
        channelRow: ch,
        eq,
        comp,
        gate,
        pass,
      };
    });

    setChannels(results);
    setLoading(false);
  }, [db]);

  if (!db) {
    return <div style={{ padding: 20 }}>Load a .session file first.</div>;
  }

  if (loading) return <div style={{ padding: 20 }}>Loading channels…</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>
        Channels Information (1 - 48)
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        {channels.length === 0 && (
          <div>No channels found for the requested range/snapshot.</div>
        )}

        {channels.map((c, i) => {
          const ch = c.channelRow;
          const chNum = ch.channelNumber;
          return (
            <section
              key={ch.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 14,
                background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              {/* Heading */}
              <h2 style={{ margin: 0, fontSize: 16 }}>
                Channel {chNum} — {ch.name || "(unnamed)"}
              </h2>
              <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
                ID: {ch.id} • snapshotId: {ch.snapshotId}
              </div>

              {/* Content block */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {/* Left column */}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    Channel name:
                  </div>
                  <div style={{ marginBottom: 10 }}>{ch.name}</div>

                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Gain</div>
                  <div style={{ marginBottom: 10 }}>
                    {Number(ch.gain).toFixed(6)} dB
                  </div>

                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    Compressor
                  </div>
                  {c.comp ? (
                    <div style={{ lineHeight: 1.4 }}>
                      <div>Threshold: {c.comp.threashold} dB</div>
                      <div>Ratio: {c.comp.ratio}</div>
                      <div>Makeup/Gain: {c.comp.gain} dB</div>
                      <div>Attack: {msFromSec(c.comp.attack)} ms</div>
                      <div>Release: {msFromSec(c.comp.release)} ms</div>
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280" }}>No compressor</div>
                  )}
                </div>

                {/* Right column */}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Gate</div>
                  {c.gate ? (
                    <div style={{ lineHeight: 1.4 }}>
                      <div>Threshold: {c.gate.threashold} dB</div>
                      <div>Attack: {msFromSec(c.gate.attack)} ms</div>
                      <div>Hold: {msFromSec(c.gate.hold)} ms</div>
                      <div>Release: {msFromSec(c.gate.release)} ms</div>
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280" }}>No gate</div>
                  )}

                  <div style={{ height: 12 }} />

                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    Passband (HPF / LPF)
                  </div>
                  {c.pass ? (
                    <div style={{ lineHeight: 1.4 }}>
                      <div>
                        HPF enabled: {c.pass.highPassEnabled ? "Yes" : "No"};
                        Frequency: {c.pass.highPassFrequency} Hz
                      </div>
                      <div>
                        LPF enabled: {c.pass.lowPassEnabled ? "Yes" : "No"};
                        Frequency: {c.pass.lowPassFrequency} Hz
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280" }}>No passband settings</div>
                  )}
                </div>
              </div>

              {/* EQ summary + Graph */}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>EQ Bands</div>

                {c.eq && c.eq.length ? (
                  <>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            textAlign: "left",
                          }}
                        >
                          <th style={{ padding: "6px 8px" }}>Band</th>
                          <th style={{ padding: "6px 8px" }}>Freq (Hz)</th>
                          <th style={{ padding: "6px 8px" }}>Gain (dB)</th>
                          <th style={{ padding: "6px 8px" }}>Q</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.eq.map((b, idx) => (
                          <tr
                            key={idx}
                            style={{ borderBottom: "1px solid #f3f4f6" }}
                          >
                            <td style={{ padding: "6px 8px" }}>{b.name}</td>
                            <td style={{ padding: "6px 8px" }}>
                              {b.frequency}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              {Number(b.gain).toFixed(2)}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              {Number(b.qvalue).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* EQ Graph: passes eq bands array + passband object */}
                    <EQGraph
                      eqBands={c.eq}
                      pass={c.pass}
                      width={720}
                      height={200}
                    />
                  </>
                ) : (
                  <div style={{ color: "#6b7280" }}>No EQ bands</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// EQGraph component (paste near top of ChannelList.jsx)
function EQGraph({ eqBands = [], pass = null, width = 760, height = 200 }) {
  // Guard
  if (!eqBands || eqBands.length === 0) {
    return <div style={{ color: "#6b7280" }}>No EQ graph — no bands</div>;
  }

  // Prepare frequency axis (log spaced)
  const N = 320;
  const fmin = 20;
  const fmax = 20000;
  const freqs = new Array(N).fill(0).map((_, i) => {
    const t = i / (N - 1);
    return Math.pow(
      10,
      Math.log10(fmin) + t * (Math.log10(fmax) - Math.log10(fmin))
    );
  });

  // Gaussian bell on log-axis approximation
  function bandContrib(freqsArr, f0, gainDb, q) {
    const safeQ = q && q > 0.0001 ? q : 1.0;
    const sigma = 0.5 / safeQ; // heuristic mapping
    const logf0 = Math.log10(f0 || 1000);
    return freqsArr.map((f) => {
      const lg = Math.log10(f);
      const val = gainDb * Math.exp(-0.5 * Math.pow((lg - logf0) / sigma, 2));
      return val;
    });
  }

  // Compose contributions
  const bandContribs = eqBands.map((b) => {
    const f0 = Number(b.frequency) || 1000;
    const gain = Number(b.gain) || 0;
    const q = Number(b.qvalue ?? b.q ?? 1.0);
    const contrib = bandContrib(freqs, f0, gain, q);
    return { ...b, f0, gain, q, contrib };
  });

  // Sum total
  const total = new Array(freqs.length).fill(0);
  bandContribs.forEach((b) => {
    for (let i = 0; i < freqs.length; ++i) total[i] += b.contrib[i];
  });

  // HPF/LPF approximate responses (1st-order dB)
  function hpfResponse(freqsArr, f0) {
    return freqsArr.map((f) => 20 * Math.log10(f / Math.sqrt(f * f + f0 * f0)));
  }
  function lpfResponse(freqsArr, f0) {
    return freqsArr.map(
      (f) => 20 * Math.log10(f0 / Math.sqrt(f * f + f0 * f0))
    );
  }

  const hpf =
    pass && pass.highPassEnabled
      ? hpfResponse(freqs, Number(pass.highPassFrequency || 20))
      : null;
  const lpf =
    pass && pass.lowPassEnabled
      ? lpfResponse(freqs, Number(pass.lowPassFrequency || 20000))
      : null;

  // Y scale (auto)
  const allValues = total
    .concat(
      ...bandContribs.map((b) => b.contrib),
      ...(hpf || []),
      ...(lpf || [])
    )
    .filter((v) => Number.isFinite(v));
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  // add padding
  const pad = Math.max(6, (maxVal - minVal) * 0.12 || 6);
  const yMin = minVal - pad;
  const yMax = maxVal + pad;

  // SVG mapping helpers
  const padX = 48;
  const padY = 20;
  const w = width;
  const h = height;
  const innerW = w - padX - 12;
  const innerH = h - padY - 30;

  const freqToX = (f) => {
    const t =
      (Math.log10(f) - Math.log10(fmin)) /
      (Math.log10(fmax) - Math.log10(fmin));
    return padX + t * innerW;
  };
  const valToY = (v) => {
    const t = (v - yMin) / (yMax - yMin);
    return padY + (1 - t) * innerH;
  };

  function pathFromArray(vals, color = "#ff7f0e", widthPx = 2, dash = "none") {
    let d = "";
    for (let i = 0; i < vals.length; ++i) {
      const x = freqToX(freqs[i]);
      const y = valToY(vals[i]);
      d +=
        i === 0
          ? `M ${x.toFixed(2)} ${y.toFixed(2)}`
          : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return (
      <path
        d={d}
        stroke={color}
        strokeWidth={widthPx}
        fill="none"
        strokeDasharray={dash}
      />
    );
  }

  // Colors
  const bandColors = [
    "#d62728",
    "#ff7f0e",
    "#2ca02c",
    "#1f77b4",
    "#9467bd",
    "#8c564b",
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <svg
        width={w}
        height={h}
        style={{ background: "#fbfbfb", borderRadius: 6 }}
      >
        {/* background grid lines (freq decades) */}
        {[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].map(
          (f, idx) => (
            <line
              key={f}
              x1={freqToX(f)}
              x2={freqToX(f)}
              y1={padY}
              y2={padY + innerH}
              stroke="#eee"
              strokeWidth={1}
            />
          )
        )}

        {/* y horizontal lines */}
        {Array.from({ length: 5 }).map((_, i) => {
          const v = yMin + (i / 4) * (yMax - yMin);
          return (
            <line
              key={i}
              x1={padX}
              x2={padX + innerW}
              y1={valToY(v)}
              y2={valToY(v)}
              stroke="#f0f0f0"
            />
          );
        })}

        {/* draw per-band dashed lines */}
        {bandContribs.map((b, idx) => (
          <g key={idx}>
            {pathFromArray(
              b.contrib,
              bandColors[idx % bandColors.length],
              1.3,
              "4 4"
            )}
            {/* marker at center */}
            <circle
              cx={freqToX(b.f0)}
              cy={valToY(b.gain)}
              r={3}
              fill={bandColors[idx % bandColors.length]}
              stroke="#000"
              strokeWidth={0.6}
            />
            <text
              x={freqToX(b.f0)}
              y={valToY(b.gain) - 8}
              fontSize="10"
              fill="#222"
              textAnchor="middle"
            >
              {b.name}
            </text>
          </g>
        ))}

        {/* HPF/LPF */}
        {hpf && <g>{pathFromArray(hpf, "#6a0dad", 1.2, "2 3")}</g>}
        {lpf && <g>{pathFromArray(lpf, "#8b4513", 1.2, "2 3")}</g>}

        {/* total */}
        {pathFromArray(total, "#000000", 2.4, "none")}

        {/* axes labels */}
        <g>
          {/* x ticks */}
          {[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].map((f) => (
            <g key={f}>
              <line
                x1={freqToX(f)}
                x2={freqToX(f)}
                y1={padY + innerH}
                y2={padY + innerH + 6}
                stroke="#333"
              />
              <text
                x={freqToX(f)}
                y={padY + innerH + 20}
                fontSize="10"
                textAnchor="middle"
              >
                {f >= 1000 ? f / 1000 + "k" : f}
              </text>
            </g>
          ))}
          {/* y labels (4 ticks) */}
          {Array.from({ length: 5 }).map((_, i) => {
            const v = yMin + (i / 4) * (yMax - yMin);
            return (
              <text key={i} x={6} y={valToY(v) + 4} fontSize="10" fill="#666">
                {v.toFixed(1)}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
