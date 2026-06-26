import request from "supertest";
import { buildTestApp } from "./appFactory";

const app = buildTestApp();

const validDescriptor = {
  id: "agent-v1",
  label: "Test Agent",
  model: { provider: "anthropic", name: "claude-opus-4-8", temperature: 0.3 },
  prompt: { version: "v1", technique: ["zero-shot"], language: "pl" },
  skills: ["invest-checker"],
  tools: [],
};

describe("POST /api/descriptors", () => {
  it("creates descriptor and returns 201", async () => {
    const res = await request(app).post("/api/descriptors").send(validDescriptor);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("agent-v1");
  });

  it("returns 400 with field errors for invalid descriptor", async () => {
    const res = await request(app).post("/api/descriptors").send({ model: "AA" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(Array.isArray(res.body.fields)).toBe(true);
    expect(res.body.example).toBeTruthy();
  });

  it("returns 400 for minimal invalid JSON {}", async () => {
    const res = await request(app).post("/api/descriptors").send({});
    expect(res.status).toBe(400);
    expect(res.body.fields.length).toBeGreaterThanOrEqual(5);
  });
});

describe("GET /api/descriptors", () => {
  it("returns list including saved descriptor", async () => {
    await request(app).post("/api/descriptors").send(validDescriptor);
    const res = await request(app).get("/api/descriptors");
    expect(res.status).toBe(200);
    expect(res.body.some((d: { id: string }) => d.id === "agent-v1")).toBe(true);
  });
});
