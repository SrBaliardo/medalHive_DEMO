import { createDatabase } from "./database.js";
import { Store } from "./store.js";
import { STORAGE_KEY } from "./config.js";

function encode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export function createDemoSession(SQL, storage, options = {}) {
  let saved;
  try {
    saved = storage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      "O armazenamento desta aba está bloqueado. Habilite-o para experimentar a demonstração.",
    );
  }
  let database;
  let store;
  try {
    const bytes = saved
      ? Uint8Array.from(atob(saved), (char) => char.charCodeAt(0))
      : undefined;
    database = createDatabase(SQL, bytes);
    store = new Store("SQLite no navegador · dados fictícios desta aba", {
      ...options,
      database,
    });
    store.seedDemo();
  } catch {
    database?.close();
    throw new Error(
      "Não foi possível abrir os dados desta demonstração. Use Recomeçar demo para iniciar uma nova sessão.",
    );
  }
  let savedRevision = -1;
  const flush = () => {
    if (savedRevision === database.revision) return;
    try {
      storage.setItem(STORAGE_KEY, encode(database.export()));
    } catch {
      throw new Error(
        "Não foi possível salvar os dados desta aba. O espaço pode estar cheio; use Recomeçar demo para limpar apenas esta demonstração.",
      );
    }
    savedRevision = database.revision;
  };
  try {
    flush();
  } catch (error) {
    store.close();
    throw error;
  }
  return {
    call(method, payload, token) {
      store.advance();
      const data = store.call(method, payload, token);
      flush();
      return data;
    },
    advance() {
      store.advance();
      flush();
    },
    close() {
      flush();
      store.close();
    },
  };
}
