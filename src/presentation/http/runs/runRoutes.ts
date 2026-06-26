import { Router } from "express";
import { RunController } from "./RunController";

export function createRunRoutes(controller: RunController): Router {
  const router = Router();
  router.get("/runs", controller.list);
  router.get("/experiments/:experimentId/runs", controller.listByExperiment);
  router.get("/experiments/:experimentId/compare", controller.compare);
  return router;
}
