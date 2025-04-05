import pg from "pg";

type Status = "idle" | "running" | "failed" | "finished" | "aborted";

interface Workflow {
  id: string;
  handler: string;
  input: unknown;
  status: Status;
  timeoutAt?: Date;
  failures?: number;
  lastError?: string;
}

interface Step {
  id: string;
  workflowId: string;
  output: unknown;
}

interface Nap {
  id: string;
  workflowId: string;
  wakeUpAt: Date;
}

type RunData = Pick<Workflow, "handler" | "input" | "failures">;

export interface Persistence {
  insert(workflowId: string, handler: string, input: unknown): Promise<boolean>;
  claim(now: Date, timeoutAt: Date): Promise<string | undefined>;
  findOutput(workflowId: string, stepId: string): Promise<unknown>;
  terminate(): Promise<void>;
}

export async function makePostgresPersistence(
  connectionString: string
): Promise<Persistence> {
  const { Client } = pg;
  const client = new Client({ connectionString });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      handler TEXT NOT NULL,
      input TEXT NOT NULL,
      status TEXT NOT NULL,
      timeout_at TIMESTAMP WITH TIME ZONE,
      failures INTEGER,
      last_error TEXT
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      output TEXT NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS naps (
      id TEXT PRIMARY KEY,
      wake_up_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  async function insert(
    workflowId: string,
    handler: string,
    input: unknown
  ): Promise<boolean> {
    const inputJson = JSON.stringify(input);
    const result = await client.query(
      `
      INSERT INTO workflows (id, handler, input, status)
      VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING;
      `,
      [workflowId, handler, inputJson, "idle"]
    );

    return (result.rowCount || 0) > 0;
  }

  async function claim(
    now: Date,
    timeoutAt: Date
  ): Promise<string | undefined> {
    const result = await client.query(
      `
      UPDATE workflows SET
        "status" = 'running',
        timeout_at = $2
      WHERE id IN (
        SELECT id FROM workflows 
        WHERE
          "status" = 'idle' OR
          ("status" IN ('running', 'failed') AND timeout_at < $1)
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `,
      [now, timeoutAt]
    );

    if (result.rowCount && result.rowCount > 0 && result.rows[0].id) {
      return result.rows[0].id;
    }

    return undefined;
  }

  async function findOutput(
    workflowId: string,
    stepId: string
  ): Promise<unknown> {
    const id = `${workflowId}/${stepId}`;

    const result = await client.query("SELECT * FROM steps WHERE id = $1", [
      id,
    ]);

    if (result.rows[0]) {
      return JSON.parse(result.rows[0].output);
    }

    return undefined;
  }

  async function terminate() {
    await client.end();
  }

  return {
    insert,
    claim,
    findOutput,
    terminate,
  };
}
