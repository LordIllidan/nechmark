import { DatabaseConnection } from "./db/DatabaseConnection";
import { SqliteRunRepository } from "./db/SqliteRunRepository";
import { SqliteQualityGateRepository } from "./db/SqliteQualityGateRepository";
import { ListRunsUseCase } from "../application/runs/ListRunsUseCase";
import { CompareDescriptorsUseCase } from "../application/runs/CompareDescriptorsUseCase";
import { CreateQualityGateUseCase } from "../application/quality-gates/CreateQualityGateUseCase";
import { EvaluateRunGatesUseCase } from "../application/quality-gates/EvaluateRunGatesUseCase";
import { RunController } from "../presentation/http/runs/RunController";
import { QualityGateController } from "../presentation/http/quality-gates/QualityGateController";
import { createRunRoutes } from "../presentation/http/runs/runRoutes";
import { createQualityGateRoutes } from "../presentation/http/quality-gates/qualityGateRoutes";
import { Router } from "express";

export interface AppContainer {
  runRouter: Router;
  gateRouter: Router;
}

export function buildContainer(dbPath?: string): AppContainer {
  const conn = DatabaseConnection.getInstance(dbPath);

  const runRepo  = new SqliteRunRepository(conn);
  const gateRepo = new SqliteQualityGateRepository(conn);

  const listRuns          = new ListRunsUseCase(runRepo);
  const compareDescriptors = new CompareDescriptorsUseCase(runRepo);
  const createGate        = new CreateQualityGateUseCase(gateRepo);
  const evaluateGates     = new EvaluateRunGatesUseCase(runRepo, gateRepo);

  const runController  = new RunController(listRuns, compareDescriptors);
  const gateController = new QualityGateController(createGate, evaluateGates, gateRepo);

  return {
    runRouter:  createRunRoutes(runController),
    gateRouter: createQualityGateRoutes(gateController),
  };
}
