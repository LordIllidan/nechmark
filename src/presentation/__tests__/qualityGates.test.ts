import request from "supertest";
import { buildTestApp } from "./appFactory";

const app = buildTestApp();
let experimentId: string;

beforeAll(async () => {
  const res = await request(app).post("/api/experiments").send({ name: "Gate Test Exp" });
  experimentId = res.body.id;
});

const validGate = {
  name: "AC Quality Gate",
  action: "fail",
  rules: [{ metric: "acMeasurability", operator: ">=", threshold: 6 }],
};

describe("POST /api/experiments/:id/gates", () => {
  it("creates gate and returns 201", async () => {
    const res = await request(app)
      .post(`/api/experiments/${experimentId}/gates`)
      .send(validGate);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.rules).toHaveLength(1);
  });

  it("returns 400 when name missing", async () => {
    const res = await request(app)
      .post(`/api/experiments/${experimentId}/gates`)
      .send({ rules: validGate.rules, action: "warn" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when rules empty", async () => {
    const res = await request(app)
      .post(`/api/experiments/${experimentId}/gates`)
      .send({ name: "X", rules: [], action: "warn" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/experiments/:id/gates", () => {
  it("returns gates for experiment", async () => {
    await request(app).post(`/api/experiments/${experimentId}/gates`).send(validGate);
    const res = await request(app).get(`/api/experiments/${experimentId}/gates`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("DELETE /api/gates/:id", () => {
  it("deletes gate", async () => {
    const created = await request(app)
      .post(`/api/experiments/${experimentId}/gates`)
      .send(validGate);
    const res = await request(app).delete(`/api/gates/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
