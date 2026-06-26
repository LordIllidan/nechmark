import { Router } from "express";
import { ExperimentController } from "./ExperimentController";

export function createExperimentRoutes(controller: ExperimentController): Router {
  const router = Router();
  router.get("/experiments", controller.list);
  router.post("/experiments", controller.create);
  router.delete("/experiments/:id", controller.delete);
  router.get("/experiments/:experimentId/metrics", controller.metrics);
  return router;
}
