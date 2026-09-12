/** Executa uma query e devolve um fallback em vez de derrubar a pagina se o
 * banco ainda nao estiver provisionado/alcancavel (ex.: setup local em andamento). */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[safeQuery]", err);
    return fallback;
  }
}
