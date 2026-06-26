import { Router } from "express";
import { DescriptorController } from "./DescriptorController";

export function createDescriptorRoutes(controller: DescriptorController): Router {
  const router = Router();
  router.get("/descriptors", controller.list);
  router.post("/descriptors", controller.upsert);
  return router;
}
