import { IDescriptorRepository } from "../../domain/descriptors/IDescriptorRepository";
import { Descriptor } from "../../domain/descriptors/Descriptor";
import { DatabaseConnection } from "./DatabaseConnection";

interface DescriptorRow {
  id: string; label: string | null; descriptor_json: string; created_at: string;
}

export class SqliteDescriptorRepository implements IDescriptorRepository {
  constructor(private readonly conn: DatabaseConnection) {}

  upsert(descriptor: Descriptor): void {
    this.conn.get().prepare(
      "INSERT OR REPLACE INTO descriptors (id,label,descriptor_json,created_at) VALUES (?,?,?,?)"
    ).run(descriptor.id, descriptor.label, JSON.stringify(descriptor.data), descriptor.createdAt);
  }

  findById(id: string): Descriptor | undefined {
    const row = this.conn.get().prepare("SELECT * FROM descriptors WHERE id=?").get(id) as DescriptorRow | undefined;
    return row ? this.toEntity(row) : undefined;
  }

  findAll(): Descriptor[] {
    const rows = this.conn.get().prepare("SELECT * FROM descriptors ORDER BY created_at DESC").all() as DescriptorRow[];
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: DescriptorRow): Descriptor {
    return { id: row.id, label: row.label, data: JSON.parse(row.descriptor_json), createdAt: row.created_at };
  }
}
