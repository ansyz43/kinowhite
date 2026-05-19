"use client";

import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import {
  UploadCloud,
  File as FileIcon,
  Trash2,
  Loader,
  CheckCircle,
} from "lucide-react";

interface FileWithPreview {
  id: string;
  preview: string;
  progress: number;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  file?: File;
}

export default function FileUpload() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      id: `${URL.createObjectURL(file)}-${Date.now()}`,
      preview: URL.createObjectURL(file),
      progress: 0,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      file,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => simulateUpload(f.id));
  };

  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, progress: Math.min(progress, 100) } : f,
        ),
      );
      if (progress >= 100) {
        clearInterval(interval);
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }, 300);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 байт";
    const k = 1024;
    const sizes = ["байт", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6">
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        initial={false}
        animate={{
          borderColor: isDragging ? "#d99d47" : "#dad8d6",
          scale: isDragging ? 1.02 : 1,
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "relative rounded-2xl p-8 md:p-12 text-center cursor-pointer bg-[#faf7f2] border shadow-sm hover:shadow-md group",
          isDragging && "ring-4 ring-[#d99d47]/30 border-[#d99d47]",
        )}
      >
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
            transition={{
              duration: 1.5,
              repeat: isDragging ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <UploadCloud
              className={clsx(
                "w-16 h-16 md:w-20 md:h-20 drop-shadow-sm transition-colors duration-300",
                isDragging ? "text-[#d99d47]" : "text-[#1c1915] group-hover:text-[#d99d47]",
              )}
            />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-medium tracking-tight text-[#1c1915]">
              {isDragging
                ? "Отпустите файлы здесь"
                : files.length
                  ? "Добавить ещё файлы"
                  : "Загрузите файлы заявки"}
            </h3>
            <p className="text-[#333333] md:text-lg max-w-md mx-auto">
              {isDragging ? (
                <span className="font-medium text-[#d99d47]">
                  Отпустите, чтобы загрузить
                </span>
              ) : (
                <>
                  Перетащите файлы сюда или{" "}
                  <span className="text-[#d99d47] font-medium">выберите вручную</span>
                </>
              )}
            </p>
            <p className="text-sm text-[#69727d]">
              Постер, афиша, скриншоты, ссылка на трейлер · до 20МБ
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={onSelect}
            accept="image/*,application/pdf,video/*,audio/*,text/*,application/zip"
          />
        </div>
      </motion.div>

      <div className="mt-8">
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between items-center mb-3 px-2"
            >
              <h3 className="font-semibold text-lg md:text-xl text-[#1c1915]">
                Загружено файлов ({files.length})
              </h3>
              {files.length > 1 && (
                <button
                  onClick={() => setFiles([])}
                  className="text-sm font-medium px-3 py-1 bg-[#f1f1f1] hover:bg-[#dad8d6] rounded-md text-[#333333] hover:text-[#971c2a] transition-colors duration-200"
                >
                  Очистить все
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={clsx("flex flex-col gap-3 overflow-y-auto pr-2", files.length > 3 && "max-h-96")}>
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="px-4 py-4 flex items-start gap-4 rounded-xl bg-[#f1f1f1] shadow hover:shadow-md transition-all duration-200"
              >
                <div className="relative flex-shrink-0">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border shadow-sm"
                    />
                  ) : (
                    <FileIcon className="w-16 h-16 md:w-20 md:h-20 text-[#aba9a7]" />
                  )}
                  {file.progress === 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -right-2 -bottom-2 bg-white rounded-full shadow-sm"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </motion.div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="w-5 h-5 flex-shrink-0 text-[#d99d47]" />
                      <h4 className="font-medium text-base md:text-lg truncate text-[#1c1915]" title={file.name}>
                        {file.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm text-[#69727d]">
                      <span className="text-xs md:text-sm">{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium">{Math.round(file.progress)}%</span>
                        {file.progress < 100 ? (
                          <Loader className="w-4 h-4 animate-spin text-[#d99d47]" />
                        ) : (
                          <Trash2
                            className="w-4 h-4 cursor-pointer text-[#aba9a7] hover:text-[#971c2a] transition-colors duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiles((prev) => prev.filter((f) => f.id !== file.id));
                            }}
                            aria-label="Удалить файл"
                          />
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-[#dad8d6] rounded-full overflow-hidden mt-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      transition={{ duration: 0.4, type: "spring", stiffness: 100, ease: "easeOut" }}
                      className={clsx("h-full rounded-full shadow-inner", file.progress < 100 ? "bg-[#d99d47]" : "bg-emerald-500")}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
