/** Shared by the root layout (server) and src/components/app/app-theme.tsx (client). */
export const APP_THEME_KEY = "qasync-app-theme";

/** Runs in <head> before first paint: applies a saved light theme on /app pages (the site stays dark). */
export const APP_THEME_PREPAINT = `try{if(location.pathname.indexOf("/app")===0&&localStorage.getItem("${APP_THEME_KEY}")==="light"){var r=document.documentElement;r.setAttribute("data-theme","light");r.style.colorScheme="light"}}catch(e){}`;
