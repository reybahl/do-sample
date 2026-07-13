import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

export type Database = PostgresJsDatabase<typeof schema>

/** Create a Drizzle client from a connection string (Hyperdrive or local DATABASE_URL). */
export function createDb(connectionString: string): Database {
  const client = postgres(connectionString, {
    // Workers / Hyperdrive: keep the pool small per isolate
    max: 5,
    fetch_types: false,
  })
  return drizzle(client, { schema })
}
