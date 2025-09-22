import { createFileRoute } from "@tanstack/react-router";
import { RecentActivity } from "@/components/pages/recent-activity";
import { Header } from "@/components/layout/header";

export const Route = createFileRoute("/activities")({
  component: Activities,
});

function Activities() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main content area with proper height calculation */}
      <div className=" mx-auto px-2 sm:px-4 py-4 sm:py-6 fixed top-20 left-4 right-4 bottom-4">
        <div className="rounded-2xl sm:rounded-3xl border bg-card shadow-lg bg-gradient-to-tl from-muted to-background max-w-7xl mx-auto overflow-hidden">
          {/* Header - Fixed height */}
          <div className="p-4 sm:p-6 pb-4 border-b border-border/50">
            <h3 className="text-base sm:text-lg font-semibold">
              Recent Activities
            </h3>
          </div>

          {/* Content area with fixed height */}
          <div className="p-4 sm:p-6">
            <div className="h-[calc(100vh-16rem)] sm:h-[calc(90vh-10rem)]">
              <RecentActivity limit={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
