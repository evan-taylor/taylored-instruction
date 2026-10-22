import { Suspense } from "react";
import { AgentAccessAdmin } from "@/components/admin/agent-access";

export default function Page() {
  return (
    <Suspense>
      <AgentAccessAdmin />
    </Suspense>
  );
}
