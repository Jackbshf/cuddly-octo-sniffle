import React, { useEffect, useRef } from "react";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

export default function Layered3DCard({
  work,
  className = "",
  aspect = "16 / 9",
  variant = "standard",
  eager = false,
  compact = false,
  showDescription = true,
  onOpen
}) {
  const cardRef = useRef(null);
  const frameRef = useRef(0);
  const pointerRef = useRef(null);

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  if (!work) return null;

  const resetMotion = () => {
    const node = cardRef.current;
    if (!node) return;
    node.style.setProperty("--rx", "0deg");
    node.style.setProperty("--ry", "0deg");
    node.style.setProperty("--mx", "0");
    node.style.setProperty("--my", "0");
    node.style.setProperty("--glow-x", "50%");
    node.style.setProperty("--glow-y", "50%");
  };

  const flushMotion = () => {
    frameRef.current = 0;
    const node = cardRef.current;
    const point = pointerRef.current;
    if (!node || !point) return;
    node.style.setProperty("--rx", `${point.y * -8}deg`);
    node.style.setProperty("--ry", `${point.x * 8}deg`);
    node.style.setProperty("--mx", point.x.toFixed(4));
    node.style.setProperty("--my", point.y.toFixed(4));
    node.style.setProperty("--glow-x", `${point.px * 100}%`);
    node.style.setProperty("--glow-y", `${point.py * 100}%`);
  };

  const handlePointerMove = (event) => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    if (reduced || !finePointer) return;
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    pointerRef.current = {
      px,
      py,
      x: px - 0.5,
      y: py - 0.5
    };
    if (!frameRef.current) frameRef.current = window.requestAnimationFrame(flushMotion);
  };

  const handlePointerLeave = () => {
    pointerRef.current = null;
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    resetMotion();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen?.(work);
  };

  const hasLayers = Boolean(work.layers && (work.layers.bg || work.layers.subject || work.layers.foreground || work.layers.light));
  const mediaClassName = `layered-card__media${hasLayers ? " is-layered" : ""}`;

  return (
    <article
      ref={cardRef}
      className={[
        "work-card",
        "layered-card",
        `work-card--${variant}`,
        compact ? "work-card--compact" : "",
        className
      ].filter(Boolean).join(" ")}
      style={{ "--card-aspect": aspect }}
      tabIndex={0}
      role="button"
      aria-label={`查看作品：${work.title}`}
      onClick={() => onOpen?.(work)}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className={mediaClassName}>
        {hasLayers ? (
          <>
            {(work.layers.bg || work.poster) && (
              <img
                className="layer layer--bg"
                src={work.layers.bg || work.poster}
                alt=""
                aria-hidden="true"
                width="1600"
                height="1000"
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? "high" : "auto"}
                decoding="async"
              />
            )}
            {(work.layers.subject || work.poster) && (
              <img
                className="layer layer--subject"
                src={work.layers.subject || work.poster}
                alt={work.alt}
                width="1600"
                height="1000"
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? "high" : "auto"}
                decoding="async"
              />
            )}
            {work.layers.foreground && (
              <img
                className="layer layer--foreground"
                src={work.layers.foreground}
                alt=""
                aria-hidden="true"
                width="1600"
                height="1000"
                loading="lazy"
                decoding="async"
              />
            )}
            {work.layers.light && (
              <img
                className="layer layer--light"
                src={work.layers.light}
                alt=""
                aria-hidden="true"
                width="1600"
                height="1000"
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        ) : (
          <img
            className="layered-card__poster"
            src={work.poster}
            alt={work.alt}
            width="1600"
            height="1000"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
          />
        )}
        <span className="layered-card__glow" aria-hidden="true" />
        {work.type === "video" && (
          <span className="play-button" aria-hidden="true">
            <PlayGlyph />
          </span>
        )}
      </div>

      <div className="work-card__content">
        <div className="work-card__meta">
          <span>{work.category}</span>
          {work.duration && <span>{work.duration}</span>}
        </div>
        <h3>{work.title}</h3>
        {showDescription && <p>{work.description}</p>}
      </div>
    </article>
  );
}
