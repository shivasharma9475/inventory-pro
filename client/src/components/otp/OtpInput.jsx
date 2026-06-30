export function OtpInput({ otp, inputRefs, handleChange, handleKeyDown, handlePaste, error }) {
  return (
    <div className="flex justify-between gap-3">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-full outline-none text-center text-xl font-light transition-all duration-200"
          style={{
            height: 56,
            borderRadius: 10,
            background: error
              ? "rgba(248,113,113,0.06)"
              : "rgba(255,255,255,0.05)",
            border: error
              ? "0.5px solid rgba(248,113,113,0.6)"
              : digit
              ? "0.5px solid rgba(167,139,250,0.5)"
              : "0.5px solid rgba(255,255,255,0.12)",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            caretColor: "#a78bfa",
          }}
          onFocus={(e) => {
            e.target.style.border = "0.5px solid rgba(167,139,250,0.6)";
            e.target.style.background = "rgba(167,139,250,0.06)";
          }}
          onBlur={(e) => {
            e.target.style.border = error
              ? "0.5px solid rgba(248,113,113,0.6)"
              : digit
              ? "0.5px solid rgba(167,139,250,0.5)"
              : "0.5px solid rgba(255,255,255,0.12)";
            e.target.style.background = "rgba(255,255,255,0.05)";
          }}
        />
      ))}
    </div>
  );
}