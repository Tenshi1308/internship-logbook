"use client";

import { useLayoutEffect, useRef, useState } from "react";

const A4_WIDTH_PX = 794;

export default function ScaledPreview({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setScale(Math.min(1, container.clientWidth / A4_WIDTH_PX));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="preview-scale w-full overflow-hidden print:overflow-visible"
    >
      <div
        style={{ zoom: scale }}
        className="w-[794px] max-w-none origin-top-left"
      >
        {children}
      </div>
    </div>
  );
}
