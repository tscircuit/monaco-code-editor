import baseConfig from "./tailwind.config.js"

/**
 * Config for compiling the distributable stylesheet (src/styles.compiled.css).
 * Only scans library source so example-only classes stay out of the output.
 * @type {import("tailwindcss").Config}
 */
export default {
  ...baseConfig,
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
}
