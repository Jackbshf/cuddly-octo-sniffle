import React from "react";

const particles = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  y: (index * 53) % 100,
  size: 2 + (index % 5),
  delay: (index % 7) * 0.35,
  duration: 7 + (index % 6)
}));

export default function ParticleField({ className = "" }) {
  return (
    <div className={["gallery-particles", className].filter(Boolean).join(" ")} aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          style={{
            "--particle-x": `${particle.x}%`,
            "--particle-y": `${particle.y}%`,
            "--particle-size": `${particle.size}px`,
            "--particle-delay": `${particle.delay}s`,
            "--particle-duration": `${particle.duration}s`
          }}
        />
      ))}
    </div>
  );
}
