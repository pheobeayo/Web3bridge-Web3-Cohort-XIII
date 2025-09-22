import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "react-hot-toast";
import { NotFoundError } from "@/components/errors/not-found-error";
import { GeneralError } from "@/components/errors/general-error";
import type { RouterContext } from "@/lib/types";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <main className="flex w-full flex-col bg-linear-to-b to-muted from-background min-h-screen">
        <div className="flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"></div>
        <div>
          <Outlet />
        </div>
      </main>
      <Toaster
        toastOptions={{
          duration: 5000,
        }}
        position="top-center"
      />
      {import.meta.env.MODE === "development" && (
        <>
          <TanStackRouterDevtools
            position="bottom-right"
            initialIsOpen={false}
          />
        </>
      )}
    </>
  ),
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});
