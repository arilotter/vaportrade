import { useEffect, useState } from "react";

export function EllipseAnimation({ delay }: { delay?: number }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((dots + 1) % 3);
    }, delay || 200);
    return () => clearInterval(interval);
  });
  return <span>{".".repeat(dots + 1)}</span>;
}
