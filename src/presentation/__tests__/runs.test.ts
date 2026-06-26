import request from "supertest";
import { buildTestApp } from "./appFactory";

const app = buildTestApp();
let experimentId: string;

const minimalOutput = {
  userStories: [],
  rawInput: { format: "free_text", content: "Logowanie 2FA" },
};

beforeAll(async () => {
  const res = await request(app).post("/api/experiments").send({ name: "Run Test Exp" });
  experimentId = res.body.id;
});

describe("POST /api/experiments/:id/runs", () => {
  it("uploads run and returns 201 with metrics", async () => {
    const res = await request(app)
      .post(`/api/experiments/${experimentId}/runs`)
      .send({ output: minimalOutput, caseId: "RC-001", caseName: "Login 2FA" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.overall_score).toBeDefined();
    expect(res.body.hardMetrics).toBeDefined();
  });

  it("returns 404 for unknown experiment", async () => {
    const res = await request(app)
      .post("/api/experiments/nope/runs")
      .send({ output: minimalOutput, caseId: "RC-001" });
    expect(res.status).toBe(404);
  });

  it("returns 400 when output missing", async () => {
    const res = await request(app)
      .post(`/api/experiments/${experimentId}/runs`)
      .send({ caseId: "RC-001" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/runs", () => {
  it("returns runs list", async () => {
    const res = await request(app).get("/api/runs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("filters by minScore", async () => {
    const res = await request(app).get("/api/runs?minScore=100");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("GET /api/experiments/:id/runs", () => {
  it("returns runs for experiment", async () => {
    await request(app)
      .post(`/api/experiments/${experimentId}/runs`)
      .send({ output: minimalOutput, caseId: "RC-002" });
    const res = await request(app).get(`/api/experiments/${experimentId}/runs`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("DELETE /api/runs/:id", () => {
  it("deletes run", async () => {
    const created = await request(app)
      .post(`/api/experiments/${experimentId}/runs`)
      .send({ output: minimalOutput, caseId: "RC-DEL" });
    const res = await request(app).delete(`/api/runs/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
