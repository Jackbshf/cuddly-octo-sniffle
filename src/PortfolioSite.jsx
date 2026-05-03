import React from "react";
import { contactContent, heroBoard, works } from "./portfolioWorks.js";

const navItems = [
  { href: "#selected-works", label: "Selected Works" },
  { href: "#commercial-poster-design", label: "Posters" },
  { href: "#ai-commercial-video", label: "Video" },
  { href: "#contact", label: "Contact" }
];

const cx = (...classNames) => classNames.filter(Boolean).join(" ");

const ImageTile = ({ src, alt, className = "", label = "", children }) => (
  <figure className={cx("group portfolio-image-tile", className)}>
    {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="portfolio-placeholder">Replace Image</div>}
    <figcaption className="portfolio-image-caption">
      {label && <span>{label}</span>}
      {children}
    </figcaption>
  </figure>
);

const SectionHeader = ({ work, align = "split" }) => (
  <div className={cx("portfolio-section-heading", align === "stack" && "portfolio-section-heading-stack")}>
    <div className="portfolio-section-number">{work.index}</div>
    <div>
      <h2>{work.title}</h2>
      <p className="portfolio-section-subtitle">{work.subtitle}</p>
    </div>
    <p className="portfolio-section-description">{work.description}</p>
  </div>
);

const SiteChrome = () => (
  <header className="portfolio-site-header">
    <a className="portfolio-brand" href="#top" aria-label="ZHANG WEI portfolio home">
      <span>ZW</span>
      <strong>ZHANG WEI</strong>
    </a>
    <nav aria-label="Portfolio sections">
      {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
    </nav>
  </header>
);

export const PortfolioHero = () => (
  <section id="top" className="portfolio-hero">
    <div className="portfolio-hero-copy">
      <h1>ZHANG WEI</h1>
      <h2>AIGC Commercial Visual Creator</h2>
      <p className="portfolio-hero-line">AI Visual Direction for Product, Fashion, Ads and Short-form Campaigns.</p>
      <p className="portfolio-hero-cn">AI 商业视觉导演，专注电商产品图、商业海报、AI广告视频、AI模特造型、短剧分镜与整合 Campaign 视觉方案。</p>
      <div className="portfolio-hero-actions">
        <a href="#selected-works">Selected Works</a>
        <a href="#contact">Contact</a>
      </div>
    </div>
    <div className="portfolio-hero-board" aria-label="AIGC portfolio hero board">
      <ImageTile src={heroBoard.primary} alt="AIGC product visual hero board" className="portfolio-hero-primary" label="Campaign Visual" />
      <div className="portfolio-hero-stack">
        {heroBoard.secondary.map((src, index) => (
          <ImageTile key={src} src={src} alt={`AIGC portfolio board image ${index + 1}`} label={["Model", "Art", "Video", "Product"][index]} />
        ))}
      </div>
      <div className="portfolio-board-line portfolio-board-line-top" />
      <div className="portfolio-board-line portfolio-board-line-bottom" />
    </div>
  </section>
);

export const WorkNavigation = ({ items }) => (
  <section id="selected-works" className="portfolio-work-nav">
    <div className="portfolio-work-nav-title">
      <span>Selected Works</span>
      <h2>精选目录</h2>
      <p>以作品导航进入每个案例板，覆盖商业产品图、广告视频、模特造型、短剧分镜与整合 Campaign。</p>
    </div>
    <div className="portfolio-work-nav-grid">
      {items.map((work) => (
        <a key={work.id} href={`#${work.id}`}>
          <span>{work.index}</span>
          <strong>{work.title}</strong>
          <small>{work.subtitle}</small>
        </a>
      ))}
    </div>
  </section>
);

const EcommerceBoard = ({ work }) => (
  <WorkSection work={work}>
    <div className="portfolio-ecommerce-board">
      <ImageTile src={work.heroImage} alt={work.title} className="portfolio-ecommerce-main" label="Main Visual" />
      <div className="portfolio-ecommerce-side">
        {work.galleryImages.slice(0, 3).map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} ${index + 1}`} label={work.labels[index + 1]} />
        ))}
      </div>
      <div className="portfolio-thumbnail-rail">
        {work.galleryImages.slice(3).map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} thumbnail ${index + 1}`} label={work.labels[index + 4]} />
        ))}
      </div>
    </div>
  </WorkSection>
);

const PosterBoard = ({ work }) => (
  <WorkSection work={work} className="portfolio-poster-section">
    <div className="portfolio-poster-board">
      <aside>
        <span>{work.index}</span>
        <h3>{work.title}</h3>
        <p>{work.description}</p>
      </aside>
      <div className="portfolio-poster-grid">
        {work.galleryImages.map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} poster ${index + 1}`} label={work.labels[index]} />
        ))}
      </div>
    </div>
  </WorkSection>
);

const ProductProcessBoard = ({ work }) => (
  <WorkSection work={work}>
    <div className="portfolio-process-board">
      {work.processSteps.map((step, index) => (
        <div className="portfolio-process-step" key={step.title}>
          <ImageTile src={step.image} alt={step.title} label={step.title} />
          {index < work.processSteps.length - 1 && <span className="portfolio-process-arrow" aria-hidden="true">→</span>}
        </div>
      ))}
    </div>
  </WorkSection>
);

const FashionBoard = ({ work }) => (
  <WorkSection work={work}>
    <div className="portfolio-fashion-board">
      <div className="portfolio-fashion-looks">
        {work.galleryImages.slice(0, 4).map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} look ${index + 1}`} label={work.labels[index]} />
        ))}
      </div>
      <div className="portfolio-detail-strip">
        {work.galleryImages.slice(4).map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} detail ${index + 1}`} label={work.labels[index + 4]} />
        ))}
      </div>
    </div>
  </WorkSection>
);

export const VideoStoryboard = ({ work }) => (
  <WorkSection work={work}>
    <div className="portfolio-video-board">
      <ImageTile src={work.heroImage} alt={work.title} className="portfolio-video-cover" label="Video Cover">
        <span className="portfolio-play-button" aria-hidden="true" />
      </ImageTile>
      <div className="portfolio-frame-strip">
        {work.galleryImages.map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} keyframe ${index + 1}`} label={`Frame ${String(index + 1).padStart(2, "0")}`} />
        ))}
      </div>
    </div>
  </WorkSection>
);

const DigitalArtBoard = ({ work }) => (
  <WorkSection work={work}>
    <div className="portfolio-art-board">
      {work.galleryImages.map((src, index) => (
        <ImageTile key={src} src={src} alt={`${work.title} ${index + 1}`} label={work.labels[index]} className={index === 0 ? "portfolio-art-feature" : ""} />
      ))}
    </div>
  </WorkSection>
);

const ShortDramaBoard = ({ work }) => (
  <WorkSection work={work}>
    <div className="portfolio-drama-board">
      <ImageTile src={work.galleryImages[0]} alt="AI short drama character visual" className="portfolio-drama-character" label="Character" />
      <ImageTile src={work.galleryImages[1]} alt="AI short drama scene visual" className="portfolio-drama-scene" label="Scene" />
      <div className="portfolio-frame-strip portfolio-drama-frames">
        {work.galleryImages.slice(2).map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} storyboard ${index + 1}`} label={`Frame ${String(index + 1).padStart(2, "0")}`} />
        ))}
      </div>
    </div>
  </WorkSection>
);

export const CaseBoard = ({ work }) => (
  <WorkSection work={work}>
    <div className="portfolio-campaign-board">
      <ImageTile src={work.galleryImages[0]} alt="Campaign product poster" className="portfolio-campaign-poster" label="Product Poster" />
      <div className="portfolio-campaign-grid">
        {work.galleryImages.slice(1).map((src, index) => (
          <ImageTile key={src} src={src} alt={`${work.title} asset ${index + 1}`} label={["E-Commerce", "Video Cover", "Lifestyle", "Storyboard", "Texture"][index]} />
        ))}
      </div>
      <div className="portfolio-palette" aria-label="Campaign color palette">
        {work.palette.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
      </div>
    </div>
  </WorkSection>
);

export const WorkSection = ({ work, children, className = "" }) => (
  <section id={work.id} className={cx("portfolio-work-section", className)}>
    <SectionHeader work={work} />
    <div className="portfolio-tags">
      {work.tags.map((tag) => <span key={tag}>{tag}</span>)}
    </div>
    {children}
  </section>
);

const renderWork = (work) => {
  if (work.id === "ecommerce-content-package") return <EcommerceBoard key={work.id} work={work} />;
  if (work.id === "commercial-poster-design") return <PosterBoard key={work.id} work={work} />;
  if (work.id === "ai-3d-product-visuals") return <ProductProcessBoard key={work.id} work={work} />;
  if (work.id === "ai-model-fashion-styling") return <FashionBoard key={work.id} work={work} />;
  if (work.id === "ai-commercial-video") return <VideoStoryboard key={work.id} work={work} />;
  if (work.id === "digital-art-direction") return <DigitalArtBoard key={work.id} work={work} />;
  if (work.id === "ai-short-drama-development") return <ShortDramaBoard key={work.id} work={work} />;
  return <CaseBoard key={work.id} work={work} />;
};

export const ContactSection = () => (
  <section id="contact" className="portfolio-contact">
    <div>
      <span>{contactContent.subtitle}</span>
      <h2>{contactContent.title}</h2>
      <p>{contactContent.description}</p>
    </div>
    <a href="mailto:" aria-label="Contact Zhang Wei">{contactContent.ctaLabel}</a>
  </section>
);

export default function PortfolioSite() {
  return (
    <main className="portfolio-site">
      <SiteChrome />
      <PortfolioHero />
      <WorkNavigation items={works} />
      {works.map(renderWork)}
      <ContactSection />
    </main>
  );
}
