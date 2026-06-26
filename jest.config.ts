import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "src/domain/**/*.ts",
    "src/application/**/*.ts",
    "src/infrastructure/**/*.ts",
    "src/presentation/**/*.ts",
  ],
  coverageReporters: ["text", "lcov"],
  moduleNameMapper: {},
};

export default config;
