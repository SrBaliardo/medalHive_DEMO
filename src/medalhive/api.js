import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { createDemoSession } from "./demo/session.js";

let token;
let sessionPromise;
function getSession() {
  sessionPromise ||= initSqlJs({ locateFile: () => wasmUrl }).then((SQL) =>
    createDemoSession(SQL, window.sessionStorage, {
      online: () => navigator.onLine,
    }),
  );
  return sessionPromise;
}
export function setToken(value) {
  token = value;
}
export async function api(method, payload = {}) {
  const session = await getSession();
  return session.call(method, payload, token);
}
export function startSimulation(onError) {
  let disposed = false;
  let timer;
  getSession()
    .then((session) => {
      if (disposed) return;
      timer = window.setInterval(() => {
        try {
          session.advance();
        } catch (error) {
          window.clearInterval(timer);
          onError(error);
        }
      }, 100);
    })
    .catch((error) => {
      if (!disposed) onError(error);
    });
  return () => {
    disposed = true;
    window.clearInterval(timer);
  };
}
