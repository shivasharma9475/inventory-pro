export function validateLogin(form) {
  const errs = {};
  if (!form.companyCode.trim())
    errs.companyCode = "Company code is required";
  if (!form.email.trim())
    errs.email = "Email is required";
  else if (!/^\S+@\S+\.\S+$/.test(form.email))
    errs.email = "Please use a valid email";
  if (!form.password)
    errs.password = "Password is required";
  return errs;
}

export function validateForgot(form) {
  const errs = {};
  if (!form.email.trim())
    errs.email = "Email is required";
  else if (!/^\S+@\S+\.\S+$/.test(form.email))
    errs.email = "Please use a valid email";
  return errs;
}