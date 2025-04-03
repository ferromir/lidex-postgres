import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { makePostgresPersistence } from ".";

let container: StartedPostgreSqlContainer;

beforeEach(async () => {
  container = await new PostgreSqlContainer().start();
});

afterEach(async () => {
  container.stop();
});

describe("makePostgresPersistence", () => {
  it("works", async () => {
    const uri = container.getConnectionUri();
    const persistence = await makePostgresPersistence(uri);
    expect(persistence).toBeDefined();
    container.stop();
  });
});
