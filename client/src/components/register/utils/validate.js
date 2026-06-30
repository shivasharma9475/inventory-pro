export function validate(form) {
  const errs = {};

  if (!form.companyName.trim())
    errs.companyName = "Company name is required";

  if (!form.email.trim())
    errs.email = "Email is required";
  else if (!/^\S+@\S+\.\S+$/.test(form.email))
    errs.email = "Please use a valid email";

  if (!form.password)
    errs.password = "Password is required";
  else if (form.password.length < 8)
    errs.password = "Minimum 8 characters";

  if (!form.confirmPassword)
    errs.confirmPassword = "Please confirm your password";
  else if (form.password !== form.confirmPassword)
    errs.confirmPassword = "Passwords do not match";

  if (!form.state.trim())
    errs.state = "State is required";

  if (!form.city.trim())
    errs.city = "City is required";

  if (!form.phone.trim())
    errs.phone = "Phone is required";
  else if (!/^\+\d{10,15}$/.test(form.phone))
    errs.phone = "Format: +91XXXXXXXXXX";

  return errs;
}

export const STEP_ONE_FIELDS = [
  "companyName",
  "email",
  "password",
  "confirmPassword",
  "role",
];