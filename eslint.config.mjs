import coreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * ESLint 9 flat config. Next 16 removed `next lint`, so `npm run lint` calls
 * the ESLint CLI directly and this file replaces the old .eslintrc.json.
 */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
];

export default config;
