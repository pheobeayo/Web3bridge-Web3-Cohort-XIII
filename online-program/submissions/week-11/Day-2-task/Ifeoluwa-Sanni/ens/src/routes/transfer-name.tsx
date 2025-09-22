import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { ENSTransfer } from "@/components/pages/transfer-ens";

export const Route = createFileRoute("/transfer-name")({
  component: TransferName,
});

function TransferName() {
  return (
    <div className="h-screen overflow-hidden relative">
      <Header />
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-start rounded-3xl border bg-card p-6 min-h-[30vh] max-w-7xl mx-auto shadow-lg bg-gradient-to-tl from-muted to-background">
          <h3 className="text-lg font-semibold mb-4">Transfer Your Name</h3>
          <ENSTransfer />
        </div>
      </div>
    </div>
  );
}
