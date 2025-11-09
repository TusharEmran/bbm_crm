"use client";

import React, { useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface ToastProps {
  type?: "success" | "error";
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  type = "success",
  message,
  show,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`relative flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md border ${
          type === "success"
            ? "bg-green-500/90 border-green-400 text-white"
            : "bg-red-500/90 border-red-400 text-white"
        }`}
      >

        <div className="shrink-0">
          {type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
        </div>

        <div className="font-medium text-sm md:text-base">{message}</div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`absolute bottom-0 left-0 h-1 rounded-b-xl ${
            type === "success" ? "bg-green-300" : "bg-red-300"
          } animate-[shrink_3s_linear_forwards]`}
        ></div>
      </div>
    </div>
  );
};

export default Toast;


