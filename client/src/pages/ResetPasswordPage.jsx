import { useState, useRef } from "react";
import { useStarCanvas } from "../components/hooks/useStarCanvas";
import { validateResetPassword } from "../components/resetPassword/utils/validate";
import { resetPassword } from "../services/authService";
import { fonts, styles } from "../components/resetPassword/styles/reset";
import { PageHeader } from "../components/resetPassword/ui/PageHeader";
import { ResetPasswordForm } from "../components/resetPassword/ResetPasswordForm";
import { ResetSuccessScreen } from "../components/resetPassword/ResetSuccessScreen";
import { useNavigate, useLocation, Link } from "react-router-dom";

const EMPTY_FORM = { password: "", confirmPassword: "" };

export default function ResetPasswordPage() {
  const canvasRef = useRef(null);
  useStarCanvas(canvasRef);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Safe email fetch
  const email = location?.state?.email || localStorage.getItem("email");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ✅ Guard (VERY IMPORTANT 🔥)
  if (!email) {
    return (
      <div className="text-white text-center mt-20">
        Invalid access. Please restart the process.
        <br />
        <button
          onClick={() => navigate("/login")}
          className="mt-4 text-purple-400 underline"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const update = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  // ✅ FINAL HANDLE SUBMIT (FIXED 🔥)
  const handleSubmit = async () => {
    if (loading) return; // 🔥 prevent multiple calls

    const errs = validateResetPassword(form);

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await resetPassword({
        email,
        newPassword: form.password,
      });

      // ✅ Clear email after success
      localStorage.removeItem("email");

      setSuccess(true);

      // ✅ Auto redirect
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      if (err.response?.status === 400) {
        const data = err.response.data;
        if (data.errors) {
          // Validation errors
          const errs = {};
          data.errors.forEach(({ field, message }) => {
            errs[field] = message;
          });
          setErrors(errs);
        } else {
          // Other 400 errors, like OTP not verified
          setErrors({
            password: data.message || "OTP verification required",
          });
        }
      } else if (err.response?.status === 429) {
        setErrors({
          password: "Too many attempts. Please wait and try again.",
        });
      } else {
        setErrors({
          password:
            err.response?.data?.message ||
            "Something went wrong. Try again.",
        });
      }
    } finally {
      setLoading(false);
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
        <PageHeader />

        {/* Form */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          {success ? (
            <ResetSuccessScreen />
          ) : (
            <ResetPasswordForm
              form={form}
              errors={errors}
              update={update}
              loading={loading}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Footer */}
        {!success && (
          <p
            className="text-center text-xs font-light mt-6"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Remembered it?{" "}
            <Link
              to="/login"
              className="underline underline-offset-2"
              style={{ color: "rgba(167,139,250,0.7)" }}
            >
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}