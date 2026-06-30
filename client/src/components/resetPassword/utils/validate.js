export function validateResetPassword(form) {
  const errs = {};
  if (!form.password)
    errs.password = "Password is required";
  else {
    if (form.password.length < 8)
      errs.password = "Minimum 8 characters";
    else {
      const hasLower = /[a-z]/.test(form.password);
      const hasUpper = /[A-Z]/.test(form.password);
      const hasNumber = /\d/.test(form.password);
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password);
      if (!hasLower || !hasUpper || !hasNumber || !hasSymbol) {
        errs.password = "Password must include uppercase, lowercase, number, and special character";
      }
    }
  }
  if (!form.confirmPassword)
    errs.confirmPassword = "Please confirm your password";
  else if (form.password !== form.confirmPassword)
    errs.confirmPassword = "Passwords do not match";
  return errs;
}