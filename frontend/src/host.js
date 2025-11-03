const host =
  import.meta.env.NODE_ENV === "production"
    ? "https://api.rentkar.com"
    : import.meta.env.VITE_BACKEND_URL;

export default host;
