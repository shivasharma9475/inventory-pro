import { useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useStarCanvas } from "../components/hooks/useStarCanvas";
import { useOtp } from "../components/otp/hooks/useOtp";
import { useResendTimer } from "../components/otp/hooks/useResendTimer";
import { verifyOtp, resendOtp } from "../services/authService";
import { OtpInput } from "../components/otp/OtpInput";
import { ResendButton } from "../components/otp/ResendButton";
import { fonts, styles } from "../components/otp/styles/otp";

export default function OtpPage() {
  const canvasRef = useRef(null);
  useStarCanvas(canvasRef);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Get email + type
  const email = location.state?.email || localStorage.getItem("email");
  const type = location.state?.type || "register"; // 🔥 important

  const {
    otp,
    inputRefs,
    handleChange,
    handleKeyDown,
    handlePaste,
    reset,
    isFilled,
    value,
  } = useOtp(6);

  const { isDisabled, label, restart } = useResendTimer(59);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ VERIFY HANDLER (UPDATED 🔥)
  const handleVerify = async () => {
    if (!isFilled) return;

    setLoading(true);
    setError("");

    try {
      const res = await verifyOtp({ email, otp: value, type });
      
      // 🔥 Store token and user data
      if (res.data.token && res.data.user) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
      
      if (type === "forgot") {
        // 👉 Forgot password flow
        navigate("/reset-password", {
          state: { email },
        });
      } else {
        // 👉 Register flow - go to dashboard since user is verified
        navigate("/dashboard");
      }

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ RESEND HANDLER (UPDATED 🔥)
  const handleResend = async () => {
    try {
      await resendOtp({ email, type }); // 🔥 pass type
      reset();
      restart();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code.");
    }
  };

  return (
    <div
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden py-10 px-4"
      style={{
        background:
          "radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)",
      }}
    >
      <style>{fonts + styles}</style>

      {/* Star canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />

      {/* Glow blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle,rgba(124,58,237,0.12),transparent 70%)",
          top: "0%",
          left: "-10%",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 350,
          height: 350,
          background:
            "radial-gradient(circle,rgba(59,130,246,0.1),transparent 70%)",
          bottom: "0%",
          right: "-5%",
          borderRadius: "50%",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-lg text-white font-light">
            {type === "forgot"
              ? "Verify Reset Code"
              : "Verify your account"}
          </h2>

          <p className="text-xs font-light text-gray-400">
            We sent a 6-digit code to{" "}
            <span className="text-purple-300">{email}</span>
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-8 bg-white/5 border border-white/10 backdrop-blur">
          <OtpInput
            otp={otp}
            inputRefs={inputRefs}
            handleChange={handleChange}
            handleKeyDown={handleKeyDown}
            handlePaste={handlePaste}
            error={!!error}
          />

          {error && (
            <p className="text-red-400 text-xs mt-2">{error}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || !isFilled}
            className="w-full mt-6 py-3 rounded-xl text-white"
            style={{
              background:
                loading || !isFilled
                  ? "rgba(124,58,237,0.35)"
                  : "linear-gradient(135deg,#7c3aed,#3b82f6)",
            }}
          >
            {loading ? "VERIFYING..." : "VERIFY & CONTINUE"}
          </button>

          <div className="mt-4">
            <ResendButton
              isDisabled={isDisabled}
              label={label}
              onClick={handleResend}
            />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          {type === "forgot" ? (
            <>
              Back to{" "}
              <Link to="/login" className="text-purple-300 underline">
                login
              </Link>
            </>
          ) : (
            <>
              Wrong email?{" "}
              <Link to="/register" className="text-purple-300 underline">
                Register again
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}