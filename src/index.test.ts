import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { makePostgresPersistence, Persistence } from ".";

import pg from "pg";

let container: StartedPostgreSqlContainer;
let persistence: Persistence;
let client: pg.Client;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  const uri = container.getConnectionUri();
  persistence = await makePostgresPersistence(uri);
  client = new pg.Client({ connectionString: uri });
  await client.connect();
}, 60_000);

afterAll(async () => {
  await client.end();
  await persistence.terminate();
  await container.stop();
});

beforeEach(async () => {
  await client.query("DELETE FROM workflows");
  await client.query("DELETE FROM steps");
  await client.query("DELETE FROM naps");
});

describe("insert", () => {
  it("inserts a workflow", async () => {
    await persistence.insert("workflow-1", "handler-1", "input-1");

    const result = await client.query(
      "SELECT * FROM workflows WHERE id='workflow-1'"
    );

    expect(result.rows[0]).toEqual({
      id: "workflow-1",
      handler: "handler-1",
      input: '"input-1"',
      status: "idle",
      timeout_at: null,
      failures: null,
      last_error: null,
    });
  });

  it("is idempotent", async () => {
    const result1 = await persistence.insert(
      "workflow-1",
      "handler-1",
      "input-1"
    );

    const result2 = await persistence.insert(
      "workflow-1",
      "handler-1",
      "input-1"
    );

    expect(result1).toBeTruthy();
    expect(result2).toBeFalsy();
  });
});

describe("claim", () => {
  it("returns undefined if no workflow is claimed", async () => {
    const workflowId = await persistence.claim(new Date(), new Date());
    expect(workflowId).toBeUndefined();
  });

  it("claims idle workflows", async () => {
    await client.query(`
      INSERT INTO workflows (id, handler, input, status)
      VALUES ('workflow-1', 'handler-1', '"input-1"', 'idle')
    `);

    const now = new Date();
    const timeoutAt = new Date(now.getTime() + 1000);
    const workflowId = await persistence.claim(now, timeoutAt);
    expect(workflowId).toEqual("workflow-1");

    const result = await client.query(
      "SELECT * FROM workflows WHERE id='workflow-1'"
    );

    expect(result.rows[0]).toEqual({
      id: "workflow-1",
      handler: "handler-1",
      input: '"input-1"',
      status: "running",
      timeout_at: timeoutAt,
      failures: null,
      last_error: null,
    });
  });
});

describe("findOutput", () => {
  it("promise test", async () => {
    const p = new Promise((resolve, reject) => {
      reject(new Error("aborted"));
      console.log("PRINTED ANYWAY!!");
    });
    await expect(p).rejects.toThrow("aborted");
  });
});
