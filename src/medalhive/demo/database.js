// Adapta o SQLite em WebAssembly ao contrato usado pelas regras do desktop.
// Cada statement é liberado no mesmo método que o criou.
export function createDatabase(SQL, bytes) {
  const database = new SQL.Database(bytes);
  let revision = 0;
  const changed = (sql) => {
    if (/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE)\b/i.test(sql))
      revision++;
  };
  return {
    get revision() {
      return revision;
    },
    exec(sql) {
      database.run(sql);
      changed(sql);
    },
    prepare(sql) {
      const query = (params, one) => {
        const statement = database.prepare(sql);
        try {
          statement.bind(params);
          if (one)
            return statement.step() ? statement.getAsObject() : undefined;
          const rows = [];
          while (statement.step()) rows.push(statement.getAsObject());
          return rows;
        } finally {
          statement.free();
        }
      };
      return {
        get: (...params) => query(params, true),
        all: (...params) => query(params, false),
        run: (...params) => {
          database.run(sql, params);
          changed(sql);
          return { changes: database.getRowsModified() };
        },
      };
    },
    export() {
      const bytes = database.export();
      // sql.js pode reabrir o handle ao exportar; reaplicar invariantes da conexão.
      database.run("PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;");
      return bytes;
    },
    close() {
      database.close();
    },
  };
}
