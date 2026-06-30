import { useState, useRef } from "react";

export function useOtp(length = 6) {
  const [otp, setOtp] = useState(Array(length).fill(""));
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").slice(0, length).split("");
    const newOtp = [...otp];
    data.forEach((char, i) => { if (i < length) newOtp[i] = char; });
    setOtp(newOtp);
    const nextFocus = data.length < length ? data.length : length - 1;
    inputRefs.current[nextFocus].focus();
  };

  const reset = () => {
    setOtp(Array(length).fill(""));
    inputRefs.current[0]?.focus();
  };

  const isFilled = otp.every((d) => d !== "");
  const value = otp.join("");

  return { otp, inputRefs, handleChange, handleKeyDown, handlePaste, reset, isFilled, value };
}