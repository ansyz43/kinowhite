import { useMemo } from "react";

type Photo = { image: string; title: string; meta: string };

const defaultPhotos: Photo[] = [
  { image: "/assets/gallery/2025/LX3A5728_resized.jpg", title: "II Дальневосточная кинопремия", meta: "Улан-Удэ · 2025" },
  { image: "/assets/gallery/2024/3K6A1134_resized.jpg", title: "I Дальневосточная кинопремия", meta: "2024" },
  { image: "/assets/gallery/2025/LX3A5746_resized.jpg", title: "Деловая программа", meta: "Улан-Удэ · 2025" },
  { image: "/assets/gallery/2024/3K6A2040_resized.jpg", title: "Церемония вручения", meta: "2024" },
  { image: "/assets/gallery/2025/LX3A6180_resized.jpg", title: "Мастер-классы", meta: "Улан-Удэ · 2025" },
  { image: "/assets/gallery/2024/3K6A2829_resized.jpg", title: "Локейшен-тур", meta: "2024" },
  { image: "/assets/gallery/2025/LX3A6615_resized.jpg", title: "Гости церемонии", meta: "Улан-Удэ · 2025" },
  { image: "/assets/gallery/2024/3K6A3214_resized.jpg", title: "Шорт-лист 2024", meta: "I Дальневосточная кинопремия" },
];

export default function PhotoMarquee({ photos = defaultPhotos, duration = 60 }: { photos?: Photo[]; duration?: number }) {
  // Дублируем массив один раз — track ширины 200%, анимация уходит на -50%, склейка незаметна.
  const items = useMemo(() => [...photos, ...photos], [photos]);

  return (
    <section className="photo-marquee-section">
      <div className="photo-marquee-head">
        <div>
          <div className="section-eyebrow">Фотоархив</div>
          <h2 className="section-title">Прошлые церемонии</h2>
        </div>
        <p className="photo-marquee-lead">
          Кадры первого и&nbsp;второго сезонов премии: деловая программа, площадки и&nbsp;церемония.
        </p>
      </div>

      <div className="photo-marquee-wrap">
        <div className="photo-marquee-fade photo-marquee-fade-l" />
        <div className="photo-marquee-fade photo-marquee-fade-r" />
        <div
          className="photo-marquee-track"
          style={{ animationDuration: `${duration}s` }}
        >
          {items.map((p, i) => (
            <article
              key={i}
              className="photo-marquee-card"
              aria-hidden={i >= photos.length ? true : undefined}
            >
              <img src={p.image} alt={p.title} loading="lazy" />
              <div className="photo-marquee-cap">
                <h3>{p.title}</h3>
                <p>{p.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
