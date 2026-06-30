import { useState, useRef } from "react";
import { useStarCanvas } from "../components/hooks/useStarCanvas";
import { validate, STEP_ONE_FIELDS } from "../components/register/utils/validate";
import { fonts, styles } from "../components/register/styles/register";
import { StepBar } from "../components/register/ui/StepBar";
import { AccountStep } from "../components/register/AccountStep";
import { LocationStep } from "../components/register/LocationStep";
import { registerUser } from "../services/authService";
import { useNavigate } from "react-router-dom";

const EMPTY_FORM = {
  companyName: "",
  email: "",
  password: "",
  confirmPassword: "",
  country: "India",
  state: "",
  city: "",
  phone: "",
  companyCode: "",
};

export default function Register() {
  const canvasRef = useRef(null);
  useStarCanvas(canvasRef);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const goNext = () => {
    const allErrs = validate(form);
    const stepErrs = Object.fromEntries(
      STEP_ONE_FIELDS.filter((f) => allErrs[f]).map((f) => [f, allErrs[f]])
    );
    if (Object.keys(stepErrs).length) {
      setErrors(stepErrs);
      return;
    }
    setErrors({});
    setStep(2);
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const errs = validate(form);
  if (Object.keys(errs).length) {
    setErrors(errs);
    return;
  }

  setLoading(true);
  setErrors({});

  try {
    const payload = {
      companyName: form.companyName.toLowerCase().trim(),
      email: form.email,
      password: form.password,
      country: form.country,
      state: form.state,
      city: form.city,
      phone: form.phone,
    };

    const res = await registerUser(payload);

    console.log("FULL RESPONSE:", res.data);

    setForm((prev) => ({
  ...prev,
  companyCode: res.data.companyCode
}));

    localStorage.setItem("email", form.email);

    setSuccess(true);

    setTimeout(() => {
      navigate("/otp", {
        state: {
           email: form.email,
          companyCode: res.data.companyCode
         }
      });
    }, 1000);

  } catch (err) {
  console.log("🔥 FULL ERROR:", err);
  console.log("🔥 BACKEND RESPONSE:", err.response?.data);

  const message =
    err.response?.data?.message || "Something went wrong";

  if (!err.response) {
    setErrors({ email: "Server not responding" });
  } 
  else if (err.response.status === 409) {
    // 🔥 smarter mapping
    if (message.toLowerCase().includes("email")) {
      setErrors({ email: message });
    } else if (message.toLowerCase().includes("company")) {
      setErrors({ companyName: message });
    } else {
      setErrors({ general: message });
    }
  } 
  else if (err.response.status === 403) {
    setStep(1);
    setErrors({
      companyName: message,
    });
  } 
  else {
    setErrors({ general: message });
  }
} finally {
    setLoading(false);
  }
};

  const handleReset = () => {
    setSuccess(false);
    setStep(1);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  return (
    <div
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden py-10 px-4"
      style={{ background: "radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)" }}
    >
      <style>{fonts + styles}</style>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />

      <div className="absolute pointer-events-none" style={{ width: 400, height: 400, background: "radial-gradient(circle,rgba(124,58,237,0.12),transparent 70%)", top: "0%", left: "-10%", borderRadius: "50%" }} />
      <div className="absolute pointer-events-none" style={{ width: 350, height: 350, background: "radial-gradient(circle,rgba(59,130,246,0.1),transparent 70%)", bottom: "0%", right: "-5%", borderRadius: "50%" }} />

      <div className="relative z-10 w-full max-w-lg" style={{ animation: "fadeDown 0.8s ease both" }}>
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)" }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity="0.9" />
              <rect x="11.5" y="1" width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity="0.9" />
              <rect x="1" y="11.5" width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity="0.6" />
              <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity="0.6" />
            </svg>
            <span className="text-xs font-light tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.55)" }}>
              Inventory Pro
            </span>
          </div>
          <StepBar total={2} current={step} />
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            {step === 1 && (
              <AccountStep form={form} errors={errors} update={update} onNext={goNext} />
            )}
            {step === 2 && (
              <LocationStep
                form={form}
                errors={errors}
                update={update}
                onBack={() => {
                  setStep(1);
                  setErrors({});
                }}
                loading={loading}
              />
            )}
          </form>
        </div>

        <p className="text-center text-xs font-light mt-6" style={{ color: "rgba(255,255,255,0.25)" }}>
          Already have an account? <a href="/login" className="underline underline-offset-2" style={{ color: "rgba(167,139,250,0.7)" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
