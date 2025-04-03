import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { makePostgresPersistence, Persistence } from ".";

let container: StartedPostgreSqlContainer;
let persistence: Persistence;

beforeEach(async () => {
  container = await new PostgreSqlContainer().start();
  const uri = container.getConnectionUri();
  persistence = await makePostgresPersistence(uri);
}, 60_000);

afterEach(async () => {
  await persistence.terminate();
  await container.stop();
});

describe("insert", () => {
  it("returns true if workflow is inserted", async () => {
    const result = await persistence.insert(
      "workflow-1",
      "handler-1",
      "input-1"
    );

    expect(result).toBeTruthy();
  });

  it("returns false if workflow already exists", async () => {
    await persistence.insert("workflow-1", "handler-1", "input-1");

    const result = await persistence.insert(
      "workflow-1",
      "handler-1",
      "input-1"
    );

    expect(result).toBeFalsy();
  });
});
