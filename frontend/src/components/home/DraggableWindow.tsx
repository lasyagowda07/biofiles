"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { Minus, X } from "@phosphor-icons/react";

type Position = {
  x: number;
  y: number;
};

type DraggableWindowProps = {
  title: string;
  children: ReactNode;
  initialPosition: Position;
  zIndex: number;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
  className?: string;
};

export default function DraggableWindow({
  title,
  children,
  initialPosition,
  zIndex,
  onFocus,
  onMinimize,
  onClose,
  className = "",
}: DraggableWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>(initialPosition);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const constrainPosition = useCallback((next: Position): Position => {
    const element = windowRef.current;
    const container = element?.parentElement;

    if (!element || !container) {
      return next;
    }

    const maxX = Math.max(0, container.clientWidth - element.offsetWidth);
    const maxY = Math.max(0, container.clientHeight - element.offsetHeight);

    return {
      x: Math.min(Math.max(0, next.x), maxX),
      y: Math.min(Math.max(0, next.y), maxY),
    };
  }, []);

  useEffect(() => {
    const element = windowRef.current;
    const container = element?.parentElement;

    if (!container) return;

    const updatePosition = () => {
      setPosition((current) => constrainPosition(current));
    };

    updatePosition();

    const observer = new ResizeObserver(updatePosition);

    observer.observe(container);

    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [constrainPosition]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    onFocus();

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;

    const { startX, startY, originX, originY } = dragRef.current;

    const nextPosition = {
      x: originX + event.clientX - startX,
      y: originY + event.clientY - startY,
    };

    setPosition(constrainPosition(nextPosition));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={windowRef}
      className={`bio-window absolute border-[3px] border-[#254D32] bg-[#FFFDF7] shadow-[8px_8px_0px_#254D32] ${className}`}
      style={{
        left: position.x,
        top: position.y,
        zIndex,
      }}
      onPointerDown={onFocus}
    >
      <div
        className="bio-window-title flex cursor-grab touch-none select-none items-center justify-between border-b-[3px] border-[#254D32] bg-[#A8BFA0] px-3 py-2 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="font-retro text-xl tracking-wide">{title}</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Minimize ${title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onMinimize}
            className="bio-window-control"
          >
            <Minus size={14} weight="bold" />
          </button>

          <button
            type="button"
            aria-label={`Close ${title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            className="bio-window-control"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}