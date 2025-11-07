export default function copyText(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => alert("Copied to clipboard!"))
    .catch((err) => console.error("Failed to copy:", err));
}
