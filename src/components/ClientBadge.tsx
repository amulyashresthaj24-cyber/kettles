import type { Client } from "@/lib/types";
import { Badge } from "./ui/badge";

export function ClientBadge({ client }: { client?: Client }) {
  if (!client) return null;
  return <Badge variant="default">{client.name}</Badge>;
}
