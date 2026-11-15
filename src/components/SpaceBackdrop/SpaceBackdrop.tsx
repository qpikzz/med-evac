// Fixed decorative space background for every screen: faint grid, blue/violet/teal nebula glows,
// twinkling stars, a slowly turning orbit with a satellite and an occasional shooting star.
// Pure SVG/CSS, no images, no network. Hidden from assistive tech; motion off with reduced motion.
import type React from "react";
import "./SpaceBackdrop.css";

// Deterministic pseudo-random stars (same layout every load).
function makeStars(count: number) {
  let seed = 40;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: rand() * 100,
    y: rand() * 100,
    r: rand() < 0.15 ? 1.6 : rand() < 0.5 ? 1.1 : 0.7,
    delay: (rand() * 6).toFixed(2),
    dur: (2.5 + rand() * 4).toFixed(2),
    tint: i % 9 === 0 ? "#9fc0ff" : i % 13 === 0 ? "#8ff0e0" : "#ffffff",
  }));
}

const STARS = makeStars(110);

// Shooting stars in different parts of the sky: position, travel angle, length, period and start delay
// all differ, so they never fall in the same place or rhythm.
const SHOOTING = [
  { top: "12%", left: "72%", angle: 150, len: 140, dur: 11, delay: 3 },
  { top: "8%", left: "22%", angle: 35, len: 110, dur: 14, delay: 8 },
  { top: "46%", left: "92%", angle: 160, len: 170, dur: 17, delay: 12 },
  { top: "64%", left: "6%", angle: 20, len: 120, dur: 19, delay: 6 },
  { top: "30%", left: "48%", angle: 135, len: 90, dur: 23, delay: 16 },
  { top: "82%", left: "60%", angle: 165, len: 130, dur: 21, delay: 10 },
];

function SpaceBackdrop() {
  return (
    <div className="space-backdrop" aria-hidden="true">
      <div className="space-grid" />
      <div className="space-nebula space-nebula-a" />
      <div className="space-nebula space-nebula-b" />
      <div className="space-nebula space-nebula-c" />
      <svg className="space-stars" width="100%" height="100%">
        {STARS.map((s, i) => (
          <circle
            key={i}
            className="space-star"
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill={s.tint}
            style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
          />
        ))}
      </svg>
      <svg className="space-orbit" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <g className="space-orbit-ring">
          <ellipse cx="800" cy="500" rx="900" ry="380" />
          <ellipse cx="800" cy="500" rx="640" ry="260" strokeDasharray="3 12" />
          <circle className="space-satellite" cx="1700" cy="500" r="4" />
        </g>
      </svg>
      {SHOOTING.map((s, i) => (
        <span
          key={i}
          className="space-shooting"
          style={
            {
              top: s.top,
              left: s.left,
              width: `${s.len}px`,
              "--angle": `${s.angle}deg`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default SpaceBackdrop;
