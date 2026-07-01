import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useStarCanvas } from "../components/hooks/useStarCanvas";
import { validateLogin, validateForgot } from "../components/login/utils/validate";
import { loginUser, forgotPassword } from "../services/authService";
import { fonts, styles } from "../components/login/styles/login";
import { PageHeader } from "../components/login/ui/PageHeader";
import { LoginForm } from "../components/login/LoginForm";
import { ForgotPasswordForm } from "../components/login/ForgotPasswordForm";

export default function LoginPage() {
  const canvasRef = useRef(null);
  useStarCanvas(canvasRef);

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState("");
  const [view, setView] = useState("login");
  const [loginForm, setLoginForm] = useState({companyCode: "", email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get("role");

    if (role) {
      setSelectedRole(role);
    }
  }, [location.search]);


  useEffect(() => {
  setLoginForm({
    email: "",
    password: "",
    companyCode: "",
  });
}, []);

  const [forgotForm, setForgotForm] = useState({ email: "" });
  const [forgotErrors, setForgotErrors] = useState({});
  const [forgotLoading, setForgotLoading] = useState(false);

  const updateLogin = (field) => (e) =>
    setLoginForm((p) => ({ ...p, [field]: e.target.value }));

  const updateForgot = (field) => (e) =>
    setForgotForm((p) => ({ ...p, [field]: e.target.value }));

const handleLogin = async () => {
  console.log("handleLogin called");
  console.log("API URL:", import.meta.env.VITE_API_URL);
  if (loginLoading) return;

  const errs = validateLogin(loginForm);
  if (Object.keys(errs).length) {
    setLoginErrors(errs);
    return;
  }

  setLoginLoading(true);
  setLoginErrors({});

  try {
    const payload = {
      email: loginForm.email.toLowerCase().trim(),
      password: loginForm.password,
      companyCode: loginForm.companyCode.toLowerCase().trim(),
      role: selectedRole, 
    };

    const res = await loginUser(payload);
    const user = res.data.user;

    if (selectedRole && user.role !== selectedRole) {
      setLoginErrors({
        general: `You are not allowed to login as ${selectedRole}`,
      });
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", res.data.token);

    navigate("/dashboard");

  } catch (err) {
    const field = err?.response?.data?.field;
    const message = err?.response?.data?.message;

    if (field) {
      setLoginErrors({ [field]: message });
    } else {
      setLoginErrors({
        general: message || "Invalid credentials",
      });
    }
  } finally {
    setLoginLoading(false);
  }
};

  const handleForgot = async () => {
    if (forgotLoading) return;

    const errs = validateForgot(forgotForm);
    if (Object.keys(errs).length) {
      setForgotErrors(errs);
      return;
    }

    setForgotLoading(true);
    setForgotErrors({});

    try {
      await forgotPassword(forgotForm);
      localStorage.setItem("email", forgotForm.email);
      navigate("/otp", {
        state: {
          email: forgotForm.email,
          type: "forgot",
        },
      });
    } catch (err) {
      if (err.response?.status === 429) {
        setForgotErrors({ email: "Please wait before requesting another OTP" });
      } else {
        setForgotErrors({
          email: err.response?.data?.message || "Something went wrong. Try again.",
        });
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const goToForgot = () => {
    setForgotForm({ email: loginForm.email });
    setForgotErrors({});
    setView("forgot");
  };

  const goToLogin = () => {
    setLoginErrors({});
    setView("login");
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

      <div className="relative z-10 w-full max-w-lg">
        <PageHeader />

        {selectedRole && (
          <p className="text-center text-xs mb-3 text-purple-400">
            Logging in as <strong>{selectedRole}</strong>
          </p>
        )}

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          {view === "login" ? (
            <LoginForm
              form={loginForm}
              errors={loginErrors}
              update={updateLogin}
              loading={loginLoading}
              onSubmit={handleLogin}
              onForgot={goToForgot}
              selectedRole={selectedRole}        
              setSelectedRole={setSelectedRole}
            />
          ) : (
            <ForgotPasswordForm
              form={forgotForm}
              errors={forgotErrors}
              update={updateForgot}
              loading={forgotLoading}
              onSubmit={handleForgot}
              onBack={goToLogin}
            />
          )}
        </div>

        {view === "login" && (
          <p className="text-center text-xs font-light mt-6 text-white/30">
            Don't have an account? <Link to="/register" className="underline text-purple-300">Create one</Link>
          </p>
        )}
      </div>
    </div>
  );
}
