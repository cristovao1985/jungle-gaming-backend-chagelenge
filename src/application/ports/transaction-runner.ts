import type { TransactionContext } from "./transaction-context";

export interface TransactionRunner {
  run<T>(operation: (context: TransactionContext) => Promise<T>): Promise<T>;
}
