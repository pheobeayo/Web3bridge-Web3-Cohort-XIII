import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { ENSRegister } from "@/components/pages/register-ens";

export const Route = createFileRoute("/register-name")({
  component: Register,
});

function Register() {
  const { name } = Route.useSearch() as { name: string };
  console.log("Registering name:", name);

  return (
    <div className="h-screen overflow-hidden relative">
      <Header />
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-start rounded-3xl border bg-card p-6 min-h-[30vh] max-w-7xl mx-auto shadow-lg bg-gradient-to-tl from-muted to-background">
          <h3 className="text-lg font-semibold mb-4">Register Your Name</h3>
          <ENSRegister name={name} />
        </div>
      </div>
    </div>
  );
}
