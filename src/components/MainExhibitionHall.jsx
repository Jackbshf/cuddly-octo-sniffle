import React from "react";

export default function MainExhibitionHall({ worlds, worksById, onOpenWorld, onBackToCorridor }) {
  return (
    <section className="main-exhibition-hall">
      <div className="main-exhibition-hall__top">
        <button type="button" className="gallery-text-button" onClick={onBackToCorridor}>
          返回入口走廊
        </button>
        <div>
          <span>MAIN HALL</span>
          <h2>主展厅</h2>
          <p>选择一幅画框，进入对应的独立作品世界。</p>
        </div>
      </div>
      <div className="world-frame-grid" aria-label="作品世界入口">
        {worlds.slice(0, 5).map((world, index) => {
          const work = worksById.get(world.heroWorkId);
          return (
            <button
              type="button"
              key={world.id}
              className="world-frame"
              style={{ "--world-accent": world.accent }}
              onClick={() => onOpenWorld(world.id)}
            >
              <span className="world-frame__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="world-frame__media">
                {work && (
                  <img
                    src={work.previewPoster || work.poster}
                    alt={work.alt}
                    width="1600"
                    height="1000"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                )}
              </span>
              <span className="world-frame__copy">
                <small>{world.kicker}</small>
                <strong>{world.name}</strong>
                <em>{world.description}</em>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
