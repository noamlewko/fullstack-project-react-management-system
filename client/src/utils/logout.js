// client/src/utils/logout.js

export function logout(navigate) {
  // מוחק את פרטי ההתחברות מה־localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("role");

  // מפנה למסך התחברות
  navigate("/login");
}
