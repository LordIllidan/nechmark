import { Router } from "express";
import { RunController } from "./RunController";
import { UploadRunController } from "./UploadRunController";
import { IRunRepository } from "../../../domain/runs/IRunRepository";
import { AddRunNoteUseCase } from "../../../application/runs/AddRunNoteUseCase";

export function createRunRoutes(
  controller: RunController,
  uploadController: UploadRunController,
  runRepo: IRunRepository,
): Router {
  const addNote = new AddRunNoteUseCase(runRepo);
  const router = Router();

  router.get("/runs", controller.list);
  router.get("/runs/:id", (req, res) => {
    const run = runRepo.findById(String(req.params.id));
    if (!run) { res.status(404).json({ error: "not found" }); return; }
    res.json(run);
  });
  router.delete("/runs/:id", (req, res) => {
    runRepo.delete(String(req.params.id));
    res.json({ ok: true });
  });
  router.patch("/runs/:id/notes", (req, res) => {
    try {
      addNote.execute(String(req.params.id), String(req.body.notes ?? ""));
      res.json({ ok: true });
    } catch (e: unknown) {
      res.status(404).json({ error: (e as Error).message });
    }
  });

  router.get("/experiments/:experimentId/runs", controller.listByExperiment);
  router.post("/experiments/:experimentId/runs", uploadController.upload);
  router.get("/experiments/:experimentId/compare", controller.compare);
  return router;
}
