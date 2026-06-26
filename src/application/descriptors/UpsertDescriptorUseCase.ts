import { IDescriptorRepository } from "../../domain/descriptors/IDescriptorRepository";
import { DescriptorValidator } from "../../domain/descriptors/DescriptorValidator";
import { Descriptor } from "../../domain/descriptors/Descriptor";

export class UpsertDescriptorUseCase {
  private readonly validator = new DescriptorValidator();

  constructor(private readonly descriptorRepo: IDescriptorRepository) {}

  execute(raw: unknown): Descriptor {
    const result = this.validator.validate(raw);
    if (!result.valid) {
      const err = new Error("Invalid descriptor") as Error & { fields: string[]; example: unknown };
      err.fields = result.errors;
      err.example = this.validator.examplePayload();
      throw err;
    }

    const data = this.validator.toDescriptor(raw as Record<string, unknown>);
    const descriptor: Descriptor = {
      id: data.id,
      label: data.label ?? null,
      data,
      createdAt: new Date().toISOString(),
    };

    this.descriptorRepo.upsert(descriptor);
    return descriptor;
  }
}
