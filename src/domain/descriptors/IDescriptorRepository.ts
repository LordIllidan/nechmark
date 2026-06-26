import { Descriptor } from "./Descriptor";

export interface IDescriptorRepository {
  upsert(descriptor: Descriptor): void;
  findById(id: string): Descriptor | undefined;
  findAll(): Descriptor[];
}
