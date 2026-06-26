import { Router } from "express";
import { DatabaseConnection } from "./db/DatabaseConnection";
import { SqliteRunRepository } from "./db/SqliteRunRepository";
import { SqliteQualityGateRepository } from "./db/SqliteQualityGateRepository";
import { SqliteExperimentRepository } from "./db/SqliteExperimentRepository";
import { SqliteDescriptorRepository } from "./db/SqliteDescriptorRepository";

import { ListRunsUseCase } from "../application/runs/ListRunsUseCase";
import { UploadRunUseCase } from "../application/runs/UploadRunUseCase";
import { CompareDescriptorsUseCase } from "../application/runs/CompareDescriptorsUseCase";
import { CreateExperimentUseCase } from "../application/experiments/CreateExperimentUseCase";
import { DeleteExperimentUseCase } from "../application/experiments/DeleteExperimentUseCase";
import { GetExperimentMetricsUseCase } from "../application/experiments/GetExperimentMetricsUseCase";
import { UpsertDescriptorUseCase } from "../application/descriptors/UpsertDescriptorUseCase";
import { CreateQualityGateUseCase } from "../application/quality-gates/CreateQualityGateUseCase";
import { EvaluateRunGatesUseCase } from "../application/quality-gates/EvaluateRunGatesUseCase";

import { RunController } from "../presentation/http/runs/RunController";
import { UploadRunController } from "../presentation/http/runs/UploadRunController";
import { ExperimentController } from "../presentation/http/experiments/ExperimentController";
import { DescriptorController } from "../presentation/http/descriptors/DescriptorController";
import { QualityGateController } from "../presentation/http/quality-gates/QualityGateController";

import { createRunRoutes } from "../presentation/http/runs/runRoutes";
import { createExperimentRoutes } from "../presentation/http/experiments/experimentRoutes";
import { createDescriptorRoutes } from "../presentation/http/descriptors/descriptorRoutes";
import { createQualityGateRoutes } from "../presentation/http/quality-gates/qualityGateRoutes";

export interface AppContainer {
  router: Router;
}

export function buildContainer(dbPath?: string): AppContainer {
  const conn = DatabaseConnection.getInstance(dbPath);

  // Repositories
  const runRepo        = new SqliteRunRepository(conn);
  const gateRepo       = new SqliteQualityGateRepository(conn);
  const experimentRepo = new SqliteExperimentRepository(conn);
  const descriptorRepo = new SqliteDescriptorRepository(conn);

  // Use cases — runs
  const listRuns           = new ListRunsUseCase(runRepo);
  const uploadRun          = new UploadRunUseCase(runRepo, descriptorRepo, experimentRepo);
  const compareDescriptors = new CompareDescriptorsUseCase(runRepo);

  // Use cases — experiments
  const createExperiment      = new CreateExperimentUseCase(experimentRepo);
  const deleteExperiment      = new DeleteExperimentUseCase(experimentRepo);
  const getExperimentMetrics  = new GetExperimentMetricsUseCase(runRepo);

  // Use cases — descriptors
  const upsertDescriptor = new UpsertDescriptorUseCase(descriptorRepo);

  // Use cases — quality gates
  const createGate    = new CreateQualityGateUseCase(gateRepo);
  const evaluateGates = new EvaluateRunGatesUseCase(runRepo, gateRepo);

  // Controllers
  const runController        = new RunController(listRuns, compareDescriptors);
  const uploadRunController  = new UploadRunController(uploadRun);
  const experimentController = new ExperimentController(createExperiment, deleteExperiment, getExperimentMetrics, experimentRepo);
  const descriptorController = new DescriptorController(upsertDescriptor, descriptorRepo);
  const gateController       = new QualityGateController(createGate, evaluateGates, gateRepo);

  // Compose single router
  const router = Router();
  router.use(createExperimentRoutes(experimentController));
  router.use(createDescriptorRoutes(descriptorController));
  router.use(createRunRoutes(runController, uploadRunController, runRepo));
  router.use(createQualityGateRoutes(gateController));

  return { router };
}
