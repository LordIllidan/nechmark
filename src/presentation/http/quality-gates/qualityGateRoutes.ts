import { Router } from "express";
import { QualityGateController } from "./QualityGateController";

export function createQualityGateRoutes(controller: QualityGateController): Router {
  const router = Router();
  router.get("/experiments/:experimentId/gates", controller.list);
  router.post("/experiments/:experimentId/gates", controller.create);
  router.delete("/gates/:id", controller.delete);
  router.get("/runs/:runId/gates/evaluate", controller.evaluate);
  return router;
}
