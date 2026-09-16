import { createRootRoute, HeadContent, Outlet, Scripts, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Providers } from "@/components/providers";
import { AuthFrame } from "@/components/auth-frame";
import appCss from "../styles.css?url";

const APP_NAME = "Arden Stores";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const u = await getSessionUser();
  return u ? { id: u.id, email: u.email } : null;
});

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const sessionUser = await fetchSessionUser();
    const path = location.pathname;
    const isPublic = path === "/login" || path.startsWith("/api/") || path.startsWith("/auth/");
    if (!sessionUser && !isPublic) {
      throw redirect({ to: "/login" });
    }
    return { sessionUser };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#1A4A42" },
      {
        name: "description",
        content: "Campus inventory, student register, staff directory, and invoicing for Arden School.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const { sessionUser } = Route.useRouteContext();
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <Providers>
          <AuthFrame sessionHint={sessionUser}>
            <Outlet />
          </AuthFrame>
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}
