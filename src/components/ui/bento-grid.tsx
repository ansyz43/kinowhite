"use client";

import { cn } from "@/lib/utils";
import { Film, Camera, FileText, Sparkles, Clapperboard, Award } from "lucide-react";

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
  image?: string;     // фоновое фото — для архива
}

interface BentoGridProps {
  items: BentoItem[];
}

const itemsSample: BentoItem[] = [
  {
    title: "Лучший полнометражный фильм",
    meta: "I сезон · 2024",
    description: "Игровые, неигровые и анимационные. Вручается продюсеру.",
    icon: <Film className="w-4 h-4 text-amber-600" />,
    status: "Winner",
    tags: ["Полный метр", "Якутия"],
    colSpan: 2,
    hasPersistentHover: true,
  },
];

function BentoGrid({ items = itemsSample }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 max-w-7xl mx-auto">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "group relative p-4 rounded-xl overflow-hidden transition-all duration-300",
            "border border-gray-100/80 dark:border-white/10 bg-white dark:bg-black",
            "hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_2px_12px_rgba(255,255,255,0.03)]",
            "hover:-translate-y-0.5 will-change-transform",
            item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
            {
              "shadow-[0_2px_12px_rgba(0,0,0,0.03)] -translate-y-0.5":
                item.hasPersistentHover,
              "dark:shadow-[0_2px_12px_rgba(255,255,255,0.03)]":
                item.hasPersistentHover,
            }
          )}
          style={item.image ? { minHeight: 240 } : undefined}
        >
          {/* Фото-фон для архивных карточек */}
          {item.image && (
            <>
              <img
                src={item.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            </>
          )}
          <div
            className={`absolute inset-0 ${
              item.hasPersistentHover
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            } transition-opacity duration-300`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>

          <div className={cn(
            "relative flex flex-col space-y-3",
            item.image && "text-white h-full justify-end"
          )}>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10 group-hover:bg-gradient-to-br transition-all duration-300">
                {item.icon}
              </div>
              {item.status && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-lg backdrop-blur-sm",
                    "bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300",
                    "transition-colors duration-300 group-hover:bg-black/10 dark:group-hover:bg-white/20"
                  )}
                >
                  {item.status}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h3 className={cn(
                "font-medium tracking-tight text-[15px]",
                item.image ? "text-white" : "text-gray-900 dark:text-gray-100"
              )}>
                {item.title}
                {item.meta && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {item.meta}
                  </span>
                )}
              </h3>
              <p className={cn(
                "text-sm leading-snug font-[425]",
                item.image ? "text-white/85" : "text-gray-600 dark:text-gray-300"
              )}>
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                {item.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md bg-black/5 dark:bg-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/20"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.cta || "Подробнее →"}
              </span>
            </div>
          </div>

          <div
            className={`absolute inset-0 -z-10 rounded-xl p-px bg-gradient-to-br from-transparent via-gray-100/50 to-transparent dark:via-white/10 ${
              item.hasPersistentHover
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            } transition-opacity duration-300`}
          />
        </div>
      ))}
    </div>
  );
}

export { BentoGrid, Film, Camera, FileText, Sparkles, Clapperboard, Award };
