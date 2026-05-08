import React, { useEffect, useRef } from "react";
import ParticleField from "./ParticleField.jsx";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function GalleryCorridor({ intro, worlds, worksById, motionEnabled, onEnter }) {
  const corridorRef = useRef(null);
  const frameRef = useRef(0);
  const pointRef = useRef(null);

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const flushPointer = () => {
    frameRef.current = 0;
    const node = corridorRef.current;
    const point = pointRef.current;
    if (!node || !point) return;
    node.style.setProperty("--gx", point.x.toFixed(4));
    node.style.setProperty("--gy", point.y.toFixed(4));
  };

  const handlePointerMove = (event) => {
    if (!motionEnabled) return;
    const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;
    const node = corridorRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointRef.current = {
      x: clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5),
      y: clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5)
    };
    if (!frameRef.current) frameRef.current = window.requestAnimationFrame(flushPointer);
  };

  const heroWorlds = worlds.slice(0, 5);

  return (
    <section
      ref={corridorRef}
      className="gallery-corridor"
      onPointerMove={handlePointerMove}
      style={{ "--gx": 0, "--gy": 0 }}
    >
      <ParticleField />
      <div className="gallery-corridor__depth" aria-hidden="true">
        {heroWorlds.map((world, index) => {
          const work = worksById.get(world.heroWorkId);
          return (
            <div
              key={world.id}
              className={`gallery-floating-frame gallery-floating-frame--${index + 1}`}
              style={{ "--world-accent": world.accent }}
            >
              {work && <img src={work.previewPoster || work.poster} alt="" loading={index < 2 ? "eager" : "lazy"} />}
            </div>
          );
        })}
      </div>
      <div className="gallery-corridor__copy">
        <span>{intro.brand}</span>
        <h1>{intro.title}</h1>
        <p>{intro.description}</p>
        <button type="button" className="gallery-primary-button" onClick={onEnter}>
          {intro.cta}
        </button>
      </div>
      <div className="gallery-corridor__rail" aria-hidden="true" />
    </section>
  );
}
