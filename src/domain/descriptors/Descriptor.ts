import { AgentDescriptor } from "../../agent-descriptor";

export interface Descriptor {
  id: string;
  label: string | null;
  data: AgentDescriptor;
  createdAt: string;
}
