import { Header } from "@/components/layout/header";
import { createFileRoute } from "@tanstack/react-router";
import ENSSearch from "@/components/pages/search-name";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="h-screen overflow-auto">
      <Header />
      <ENSSearch />
    </div>
  );
}
