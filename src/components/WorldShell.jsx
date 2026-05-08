import React, { useEffect, useRef, useState } from "react";
import Layered3DCard from "./Layered3DCard.jsx";

const cardWork = (work) => work ? { ...work, poster: work.previewPoster || work.poster } : work;

function SoundLab({ active, setActive }) {
  return (
    <div className={`world-interaction world-sound${active ? " is-active" : ""}`}>
      <button type="button" onClick={() => setActive((value) => !value)}>
        {active ? "暂停声场" : "启动声场"}
      </button>
      <div className="world-sound__bars" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--bar": index }} />)}
      </div>
    </div>
  );
}

function EnergyPod() {
  const [power, setPower] = useState(62);
  return (
    <div className="world-interaction world-energy" style={{ "--energy": power }}>
      <label>
        <span>冰点能量阀</span>
        <input type="range" min="12" max="100" value={power} onChange={(event) => setPower(Number(event.target.value))} />
      </label>
      <div className="world-energy__rings" aria-hidden="true"><span /><span /><span /></div>
    </div>
  );
}

function FilmRail({ works }) {
  const railRef = useRef(null);
  const dragRef = useRef(null);

  const handlePointerDown = (event) => {
    const node = railRef.current;
    if (!node) return;
    dragRef.current = { x: event.clientX, left: node.scrollLeft };
    node.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const node = railRef.current;
    const drag = dragRef.current;
    if (!node || !drag) return;
    node.scrollLeft = drag.left - (event.clientX - drag.x);
  };

  const stopDrag = () => { dragRef.current = null; };

  return (
    <div
      ref={railRef}
      className="world-film-rail"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      {works.map((work) => (
        <figure key={work.id}>
          <img src={work.previewPoster || work.poster} alt={work.alt} loading="lazy" />
          <figcaption>{work.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function Stargate({ motionEnabled }) {
  const gateRef = useRef(null);

  const handlePointerMove = (event) => {
    if (!motionEnabled) return;
    const node = gateRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    node.style.setProperty("--gate-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    node.style.setProperty("--gate-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <div ref={gateRef} className="world-stargate" onPointerMove={handlePointerMove} aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}

function BrandShowroom({ works }) {
  return (
    <div className="world-brand-shelves">
      {works.map((work) => (
        <article key={work.id}>
          <img src={work.previewPoster || work.poster} alt={work.alt} loading="lazy" />
          <span>{work.category}</span>
          <strong>{work.title}</strong>
        </article>
      ))}
    </div>
  );
}

export default function WorldShell({ world, works, heroWork, motionEnabled, onBack }) {
  const [soundActive, setSoundActive] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  if (!world || !heroWork) return null;

  return (
    <section className={`world-shell world-shell--${world.interaction}`} style={{ "--world-accent": world.accent }}>
      <div className="world-shell__header">
        <button type="button" className="gallery-text-button" onClick={onBack}>返回画廊</button>
        <span>{world.kicker}</span>
      </div>
      <div className="world-shell__grid">
        <div className="world-shell__copy">
          <h2>{world.name}</h2>
          <p>{world.description}</p>
          <div className="world-shell__tags">
            {heroWork.tags?.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        <div className="world-shell__hero">
          <Layered3DCard work={cardWork(heroWork)} variant="world" eager onOpen={() => {}} />
        </div>
      </div>
      {world.interaction === "sound" && <SoundLab active={soundActive} setActive={setSoundActive} />}
      {world.interaction === "energy" && <EnergyPod />}
      {world.interaction === "film" && <FilmRail works={works} />}
      {world.interaction === "stargate" && <Stargate motionEnabled={motionEnabled} />}
      {world.interaction === "showroom" && <BrandShowroom works={works} />}
    </section>
  );
}
