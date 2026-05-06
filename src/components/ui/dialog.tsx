"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/ui/cn";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, children, className }: DialogProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Dialog Content */}
      <div className={cn(
        "relative w-full max-w-lg glass-gold rounded-3xl overflow-hidden animate-slide-up",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          {title && (
            <h2 className="text-xl font-bold text-gold uppercase tracking-wider">
              {title}
            </h2>
          )}
          <button 
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-full hover:bg-white/5 text-foreground-muted hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
