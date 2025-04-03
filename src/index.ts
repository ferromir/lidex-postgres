import pg from "pg";

// type Status = "idle" | "running" | "failed" | "finished" | "aborted";

// interface Workflow {
//   id: string;
//   handler: string;
//   input: unknown;
//   status: Status;
//   timeoutAt?: Date;
//   failures?: number;
//   lastError?: string;
// }

// interface Step {
//   id: string;
//   workflowId: string;
//   output: unknown;
// }

// interface Nap {
//   id: string;
//   workflowId: string;
//   wakeUpAt: Date;
// }

// type RunData = Pick<Workflow, "handler" | "input" | "failures">;

export async function makePostgresPersistence(connectionString: string) {
  const { Client } = pg;
  const client = new Client({ connectionString });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS lidexworkflows (
      id TEXT PRIMARY KEY,
      handler TEXT NOT NULL,
      input TEXT NOT NULL,
      "status" TEXT NOT NULL,
      timeoutAt TIMESTAMP WITH TIME ZONE,
      failures INTEGER,
      lastError TEXT
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS lidexworkflowsteps (
      id TEXT PRIMARY KEY,
      "output" TEXT NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS lidexworkflownaps (
      id TEXT PRIMARY KEY,
      wakeUpAt TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  return {};
}
