import { useState, useEffect } from "react";

export function useResendTimer(initialSeconds = 59) {
  const [timer, setTimer] = useState(initialSeconds);
  const [isDisabled, setIsDisabled] = useState(true);

  useEffect(() => {
    if (!isDisabled) return;
    if (timer === 0) { setIsDisabled(false); return; }
    const id = setInterval(() => setTimer((p) => p - 1), 500);
    return () => clearInterval(id);
  }, [isDisabled, timer]);

  const restart = () => {
    setTimer(initialSeconds);
    setIsDisabled(true);
  };

  const label = `00:${timer.toString().padStart(2, "0")}`;

  return { timer, isDisabled, restart, label };
}