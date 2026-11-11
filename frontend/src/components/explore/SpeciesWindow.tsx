"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  PointerEvent,
  ReactNode,
} from "react";

import {
  Leaf,
  Minus,
  X,
} from "@phosphor-icons/react";

type Position = {
  x: number;
  y: number;
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
  const windowRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] =
    useState<Position>(initialPosition);

  const [isMobile, setIsMobile] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // --------------------------------------------------
  // KEEP WINDOW INSIDE VIEWPORT
  // --------------------------------------------------

  const constrainPosition = useCallback(
    (next: Position): Position => {
      const element = windowRef.current;

      if (!element) {
        return next;
      }

      const maxX = Math.max(
        WINDOW_MARGIN,
        window.innerWidth -
          element.offsetWidth -
          WINDOW_MARGIN
      );

      const maxY = Math.max(
        WINDOW_MARGIN,
        window.innerHeight -
          element.offsetHeight -
          TASKBAR_HEIGHT -
          WINDOW_MARGIN
      );

      return {
        x: Math.min(
          Math.max(WINDOW_MARGIN, next.x),
          maxX
        ),
        y: Math.min(
          Math.max(WINDOW_MARGIN, next.y),
          maxY
        ),
      };
    },
    []
  );

  // --------------------------------------------------
  // RESPONSIVE BEHAVIOR
  // --------------------------------------------------

  useEffect(() => {
    function updateLayout() {
      const mobile = window.innerWidth < 768;

      setIsMobile(mobile);

      if (!mobile) {
        setPosition((current) =>
          constrainPosition(current)
        );
      }
    }

    updateLayout();

    window.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, [constrainPosition]);

  // --------------------------------------------------
  // DRAG HANDLERS
  // --------------------------------------------------

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (event.button !== 0 || isMobile) {
      return;
    }

    onFocus();

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (!dragRef.current || isMobile) {
      return;
    }

    const {
      startX,
      startY,
      originX,
      originY,
    } = dragRef.current;

    setPosition(
      constrainPosition({
        x: originX + event.clientX - startX,
        y: originY + event.clientY - startY,
      })
    );
  }

  function handlePointerUp(
    event: PointerEvent<HTMLDivElement>
  ) {
    dragRef.current = null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  // --------------------------------------------------
  // WINDOW STYLING
  // --------------------------------------------------

  const windowStyle = isMobile
    ? {
        zIndex,
      }
    : {
        left: position.x,
        top: position.y,
        zIndex,
      };

  return (
    <div
      ref={windowRef}
      style={windowStyle}
      onPointerDown={onFocus}
      className={`
        fixed
        flex
        flex-col
        overflow-hidden
        border-[3px]
        border-[#254d32]
        bg-[#fffdf7]
        shadow-[9px_9px_0_#17291e]
        ${
          isMobile
            ? "inset-x-3 top-3 bottom-[82px]"
            : "h-[min(650px,calc(100dvh-110px))] w-[min(620px,calc(100vw-30px))]"
        }
        ${
          minimized
            ? "hidden"
            : ""
        }
        ${
          isMobile && !active
            ? "hidden"
            : ""
        }
      `}
    >
      {/* ------------------------------------------
          TITLE BAR
      ------------------------------------------ */}

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`
          flex
          shrink-0
          items-center
          justify-between
          gap-3
          border-b-[3px]
          border-[#254d32]
          bg-[#a8bfa0]
          px-4
          py-3
          select-none
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
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={onMinimize}
            aria-label={`Minimize ${title}`}
            className="flex h-8 w-8 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7] transition-colors hover:bg-[#e7a977]"
          >
            <Minus
              size={16}
              weight="bold"
            />
          </button>

          <button
            type="button"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-8 w-8 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7] transition-colors hover:bg-[#e7a977]"
          >
            <X
              size={16}
              weight="bold"
            />
          </button>
        </div>
      </div>

      {/* ------------------------------------------
          WINDOW CONTENT
      ------------------------------------------ */}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}