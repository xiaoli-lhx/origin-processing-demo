import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isUserOrOrgPage = repositoryName?.endsWith(".github.io");
const base =
  process.env.GITHUB_ACTIONS && repositoryName && !isUserOrOrgPage
    ? `/${repositoryName}/`
    : "/";

export default defineConfig({
  base,
  plugins: [react()],
});
