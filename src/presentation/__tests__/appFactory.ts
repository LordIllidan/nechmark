import express from "express";
import cors from "cors";
import { SqliteExperimentRepository } from "../../infrastructure/db/SqliteExperimentRepository";
import { SqliteDescriptorRepository } from "../../infrastructure/db/SqliteDescriptorRepository";
import { SqliteRunRepository } from "../../infrastructure/db/SqliteRunRepository";
import { SqliteQualityGateRepository } from "../../infrastructure/db/SqliteQualityGateRepository";
import { makeTestConnection } from "../../infrastructure/__tests__/helpers";
import { CreateExperimentUseCase } from "../../application/experiments/CreateExperimentUseCase";
import { DeleteExperimentUseCase } from "../../application/experiments/DeleteExperimentUseCase";
import { GetExperimentMetricsUseCase } from "../../application/experiments/GetExperimentMetricsUseCase";
import { UpsertDescriptorUseCase } from "../../application/descriptors/UpsertDescriptorUseCase";
import { ListRunsUseCase } from "../../application/runs/ListRunsUseCase";
import { UploadRunUseCase } from "../../application/runs/UploadRunUseCase";
import { CompareDescriptorsUseCase } from "../../application/runs/CompareDescriptorsUseCase";
import { CreateQualityGateUseCase } from "../../application/quality-gates/CreateQualityGateUseCase";
import { EvaluateRunGatesUseCase } from "../../application/quality-gates/EvaluateRunGatesUseCase";
import { ExperimentController } from "../http/experiments/ExperimentController";
import { DescriptorController } from "../http/descriptors/DescriptorController";
import { RunController } from "../http/runs/RunController";
import { UploadRunController } from "../http/runs/UploadRunController";
import { QualityGateController } from "../http/quality-gates/QualityGateController";
import { createExperimentRoutes } from "../http/experiments/experimentRoutes";
import { createDescriptorRoutes } from "../http/descriptors/descriptorRoutes";
import { createRunRoutes } from "../http/runs/runRoutes";
import { createQualityGateRoutes } from "../http/quality-gates/qualityGateRoutes";

export function buildTestApp() {
  const conn = makeTestConnection();

  const experimentRepo = new SqliteExperimentRepository(conn);
  const descriptorRepo = new SqliteDescriptorRepository(conn);
  const runRepo        = new SqliteRunRepository(conn);
  const gateRepo       = new SqliteQualityGateRepository(conn);

  const app = express();
  app.use(cors());
  app.use(express.json());

  const experimentCtrl = new ExperimentController(
    new CreateExperimentUseCase(experimentRepo),
    new DeleteExperimentUseCase(experimentRepo),
    new GetExperimentMetricsUseCase(runRepo),
    experimentRepo,
  );
  const descriptorCtrl = new DescriptorController(new UpsertDescriptorUseCase(descriptorRepo), descriptorRepo);
  const runCtrl        = new RunController(new ListRunsUseCase(runRepo), new CompareDescriptorsUseCase(runRepo));
  const uploadCtrl     = new UploadRunController(new UploadRunUseCase(runRepo, descriptorRepo, experimentRepo));
  const gateCtrl       = new QualityGateController(
    new CreateQualityGateUseCase(gateRepo),
    new EvaluateRunGatesUseCase(runRepo, gateRepo),
    gateRepo,
  );

  app.use("/api", createExperimentRoutes(experimentCtrl));
  app.use("/api", createDescriptorRoutes(descriptorCtrl));
  app.use("/api", createRunRoutes(runCtrl, uploadCtrl, runRepo));
  app.use("/api", createQualityGateRoutes(gateCtrl));

  return app;
}
