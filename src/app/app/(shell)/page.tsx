import { redirect } from "next/navigation";

/** The app opens on Projects; /app stays as a stable entry link (marketing pages point here). */
export default function AppHome() {
  redirect("/app/projects");
}
