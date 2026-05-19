"use client";

import BasicAccordion from "./basic-accordion";

const items = [
  {
    id: 1,
    title: "01 · Режиссура авторского кино",
    content: (
      <p className="text-sm">
        Подходы к&nbsp;работе со&nbsp;сценарием, актёрами и&nbsp;камерой. Кейсы региональных проектов, выходивших в&nbsp;прокат и&nbsp;на&nbsp;стримингах. 120 мин · 50 мест.
      </p>
    ),
  },
  {
    id: 2,
    title: "02 · Операторская работа: Дальний Восток как декорация",
    content: (
      <p className="text-sm">
        Свет, погода, логистика, работа с&nbsp;натурой региона. Разбор фильмов, снятых в&nbsp;Приморье, на&nbsp;Сахалине и&nbsp;в&nbsp;Якутии. 120 мин · 40 мест.
      </p>
    ),
  },
  {
    id: 3,
    title: "03 · Сценарий и драматургия",
    content: (
      <p className="text-sm">
        От&nbsp;идеи до&nbsp;поэпизодного плана. Региональные мотивы и&nbsp;универсальные истории. Практикум по&nbsp;питчингу. 90 мин · 60 мест.
      </p>
    ),
  },
  {
    id: 4,
    title: "04 · Постпродакшн и цветокоррекция",
    content: (
      <p className="text-sm">
        Работа с&nbsp;референсами, базовые LUT-схемы, рабочий процесс с&nbsp;колористом-удалёнщиком. 90 мин · 30 мест.
      </p>
    ),
  },
];

export default function MasterclassesAccordion() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <BasicAccordion items={items} allowMultiple defaultExpandedIds={[1]} className="bg-background" />
    </div>
  );
}
