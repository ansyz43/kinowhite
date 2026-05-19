# Дальневосточная Кинопремия 2026 — сайт

Astro 6 + Tailwind 4 + React (islands) + Fraunces/Inter Tight.

## Локально

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # сборка в dist/
npm run preview  # просмотр собранной версии
```

## Деплой

**Vercel** (1 клик): импортируешь репо → Deploy. `vercel.json` настраивает всё автоматически.

**Netlify**: то же самое, `netlify.toml` уже в репо.

**Любой статический хостинг** (Beget, Timeweb static): локально `npm run build` → залить содержимое `dist/`.

**Timeweb VPS с nginx**: после `npm run build` папка `dist/` содержит готовые HTML — раздай её nginx'ом.

## Структура

```
src/
├── pages/      # все 13 страниц сайта (.astro)
├── layouts/    # Layout.astro — общая обвязка
├── components/ # Nav.astro, Footer.astro, PhotoMarquee.tsx, ui/*
├── lib/        # utils.ts (cn helper)
└── styles/     # global.css + legacy.css (вся вёрстка)
public/
├── assets/     # картинки, лого, фото галерей
└── app.js      # nav, accordion, scroll-reveal обработчики
```
