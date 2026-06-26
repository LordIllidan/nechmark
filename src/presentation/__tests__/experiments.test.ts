import request from "supertest";
import { buildTestApp } from "./appFactory";

const app = buildTestApp();

describe("POST /api/experiments", () => {
  it("creates experiment and returns 201", async () => {
    const res = await request(app).post("/api/experiments").send({ name: "Sprint 1", tags: ["ba"] });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Sprint 1");
    expect(res.body.id).toBeDefined();
  });

  it("returns 400 when name missing", async () => {
    const res = await request(app).post("/api/experiments").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe("GET /api/experiments", () => {
  it("returns list of experiments", async () => {
    await request(app).post("/api/experiments").send({ name: "E1" });
    const res = await request(app).get("/api/experiments");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("DELETE /api/experiments/:id", () => {
  it("deletes existing experiment", async () => {
    const created = await request(app).post("/api/experiments").send({ name: "To Delete" });
    const res = await request(app).delete(`/api/experiments/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 404 for unknown experiment", async () => {
    const res = await request(app).delete("/api/experiments/nope");
    expect(res.status).toBe(404);
  });
});
