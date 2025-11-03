import autoprefixer from "autoprefixer";

// postcss.config.js
import tailwind from "@tailwindcss/postcss";

export default {
  plugins: [
    tailwind({
      config: "./tailwind.config.js", // optional if you're using default
    }),
    autoprefixer(),
  ],
};
