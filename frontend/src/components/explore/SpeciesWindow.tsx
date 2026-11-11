"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  CSSProperties,
  PointerEvent,
  ReactNode,
} from "react";

import {
  ArrowsOutSimple,
  Leaf,
  Minus,
  X,
} from "@phosphor-icons/react";

type Position = {
  x: number;
  y: number;
};

type WindowSize = {
  width: number;
  height: number;
};

type SpeciesWindowProps = {
  title: string;
  children: ReactNode;
  initialPosition: Position;
  zIndex: number;
  minimized: boolean;
  active: boolean;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
};

const TASKBAR_HEIGHT = 72;
const WINDOW_MARGIN = 12;

const DEFAULT_WIDTH = 620;
const DEFAULT_HEIGHT = 650;

const MIN_WIDTH = 350;
const MIN_HEIGHT = 300;

function getViewportBounds() {
  return {
    width: window.innerWidth,
    height: window.innerHeight - TASKBAR_HEIGHT,
  };
}

export default function SpeciesWindow({
  title,
  children,
  initialPosition,
  zIndex,
  minimized,
  active,
  onFocus,
  onMinimize,
  onClose,
}: SpeciesWindowProps) {
  const [position, setPosition] =
    useState<Position>(initialPosition);

  const [size, setSize] = useState<WindowSize>({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });

  const [isMobile, setIsMobile] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);

  // Keep a window fully inside the available viewport.
  const constrainPosition = useCallback(
    (next: Position, currentSize: WindowSize): Position => {
      const bounds = getViewportBounds();

      const maxX = Math.max(
        WINDOW_MARGIN,
        bounds.width - currentSize.width - WINDOW_MARGIN
      );

      const maxY = Math.max(
        WINDOW_MARGIN,
        bounds.height - currentSize.height - WINDOW_MARGIN
      );

      return {
        x: Math.min(Math.max(WINDOW_MARGIN, next.x), maxX),
        y: Math.min(Math.max(WINDOW_MARGIN, next.y), maxY),
      };
    },
    []
  );

  // Prevent resizing beyond the right/bottom viewport edges.
  const constrainSize = useCallback(
    (next: WindowSize, currentPosition: Position): WindowSize => {
      const bounds = getViewportBounds();

      const maxWidth = Math.max(
        1,
        bounds.width - currentPosition.x - WINDOW_MARGIN
      );

      const maxHeight = Math.max(
        1,
        bounds.height - currentPosition.y - WINDOW_MARGIN
      );

      return {
        width: Math.min(
          Math.max(MIN_WIDTH, next.width),
          maxWidth
        ),
        height: Math.min(
          Math.max(MIN_HEIGHT, next.height),
          maxHeight
        ),
      };
    },
    []
  );

  // Clamp both dimensions and position when the viewport changes.
  useEffect(() => {
    function updateLayout() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (mobile) return;

      const bounds = getViewportBounds();

      const nextSize: WindowSize = {
        width: Math.min(
          Math.max(MIN_WIDTH, sizeRef.current.width),
          Math.max(1, bounds.width - WINDOW_MARGIN * 2)
        ),
        height: Math.min(
          Math.max(MIN_HEIGHT, sizeRef.current.height),
          Math.max(1, bounds.height - WINDOW_MARGIN * 2)
        ),
      };

      const nextPosition = constrainPosition(
        positionRef.current,
        nextSize
      );

      sizeRef.current = nextSize;
      positionRef.current = nextPosition;

      setSize(nextSize);
      setPosition(nextPosition);
    }

    updateLayout();

    window.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, [constrainPosition]);

  // Refs give pointer handlers the latest dimensions without
  // depending on asynchronous state updates.
  const positionRef = useRef(position);
  const sizeRef = useRef(size);

  function updatePosition(next: Position) {
    positionRef.current = next;
    setPosition(next);
  }

  function updateSize(next: WindowSize) {
    sizeRef.current = next;
    setSize(next);
  }

  // --------------------------------------------------
  // DRAGGING
  // --------------------------------------------------

  function handleDragStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isMobile) return;

    onFocus();

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    updatePosition(
      constrainPosition(
        {
          x: drag.originX + event.clientX - drag.startX,
          y: drag.originY + event.clientY - drag.startY,
        },
        sizeRef.current
      )
    );
  }

  function handleDragEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // --------------------------------------------------
  // RESIZING
  // --------------------------------------------------

  function handleResizeStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isMobile) return;

    event.stopPropagation();
    onFocus();

    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: sizeRef.current.width,
      originHeight: sizeRef.current.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeMove(event: PointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;

    if (!resize || resize.pointerId !== event.pointerId) return;

    event.stopPropagation();

    updateSize(
      constrainSize(
        {
          width:
            resize.originWidth + event.clientX - resize.startX,
          height:
            resize.originHeight + event.clientY - resize.startY,
        },
        positionRef.current
      )
    );
  }

  function handleResizeEnd(event: PointerEvent<HTMLDivElement>) {
    if (resizeRef.current?.pointerId !== event.pointerId) return;

    event.stopPropagation();
    resizeRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // All window z-indices are relative to the manager's
  // fixed stacking layer, which sits below the taskbar.
  const windowStyle: CSSProperties = isMobile
    ? { zIndex }
    : {
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
      };

    return (
    <div
    style={windowStyle}
    onPointerDown={onFocus}
    className={`
      pointer-events-auto absolute flex flex-col overflow-hidden
        border-[3px] border-[#254d32]
        bg-[#fffdf7] text-[#254d32]
        shadow-[9px_9px_0_#17291e]
        ${
          isMobile
            ? "inset-x-3 top-3 bottom-3"
            : ""
        }
        ${
          minimized || (isMobile && !active)
            ? "hidden"
            : ""
        }
      `}
    >
      {/* TITLE BAR */}

      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        className={`
          flex shrink-0 items-center justify-between gap-3
          border-b-[3px] border-[#254d32]
          bg-[#a8bfa0] px-4 py-3 select-none
          ${
            isMobile
              ? ""
              : "cursor-grab touch-none active:cursor-grabbing"
          }
        `}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Leaf
            size={19}
            weight="fill"
            className="shrink-0"
          />

          <span className="truncate font-[family-name:var(--font-press-start)] text-[9px]">
            {title}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onMinimize}
            aria-label={`Minimize ${title}`}
            className="flex h-8 w-8 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7] transition-colors hover:bg-[#e7a977]"
          >
            <Minus size={16} weight="bold" />
          </button>

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-8 w-8 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7] transition-colors hover:bg-[#e7a977]"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* CONTENT */}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>

      {/* BOTTOM-RIGHT RESIZE HANDLE */}

      {!isMobile && (
        <div
          role="separator"
          aria-label={`Resize ${title}`}
          aria-orientation="vertical"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          className="absolute bottom-0 right-0 z-10 flex h-8 w-8 cursor-nwse-resize touch-none items-center justify-center border-l-2 border-t-2 border-[#254d32] bg-[#e7a977] hover:bg-[#f3c69b]"
          title="Drag to resize window"
        >
          <ArrowsOutSimple
            size={17}
            weight="bold"
            className="pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}