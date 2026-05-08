import React from "react";

export default function TeleportTransition({ active, label = "正在进入作品世界" }) {
  return (
    <div className={`teleport-transition${active ? " is-active" : ""}`} aria-hidden={!active}>
      <div className="teleport-transition__ring" />
      <div className="teleport-transition__core" />
      <p>{label}</p>
    </div>
  );
}
