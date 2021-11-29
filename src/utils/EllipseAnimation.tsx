import { useEffect, useState } from "react";

const maxDots = 3;

export function EllipseAnimation({ delay }: { delay?: number }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((dots + 1) % maxDots);
    }, delay || 200);
    return () => clearInterval(interval);
  });
  return (
    <span
      style={{
        whiteSpace: "pre",
      }}
    >
      {".".repeat(dots + 1)}
      {" ".repeat(maxDots - (dots + 1))}
    </span>
  );
}
