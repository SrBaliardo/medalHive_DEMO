import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import initSqlJs from "sql.js";
import { createDatabase } from "../src/medalhive/demo/database.js";
import { Store } from "../src/medalhive/demo/store.js";
import { createDemoSession } from "../src/medalhive/demo/session.js";
import { DEMO_ACCESS, STORAGE_KEY } from "../src/medalhive/demo/config.js";

const require = createRequire(import.meta.url);
const SQL = await initSqlJs({
  locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm"),
});

function fixture(t, options = {}) {
  let time = 10000;
  let connected = true;
  const database = createDatabase(SQL);
  const store = new Store("demo", {
    database,
    clock: () => time,
    random: options.random || (() => 0.1),
    online: () => connected,
  });
  store.seedDemo();
  store.updateSettings({
    paymentScenario: "random",
    syncScenario: "random",
    actuatorMs: 850,
    intervalMs: 450,
  });
  const { token } = store.login(DEMO_ACCESS);
  t.after(() => store.close());
  return {
    store,
    database,
    token,
    clock: () => time,
    tick(ms = 1000) {
      time += ms;
      store.advance();
    },
    offline() {
      connected = false;
    },
  };
}
const order = (items = [{ id: "teambee", quantity: 2 }]) => ({
  requestId: crypto.randomUUID(),
  paymentType: "PIX",
  items,
});
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("catálogo e estoque fictícios prontos; acesso público sem credenciais reais", (t) => {
  const { store } = fixture(t);
  assert.equal(store.info().setupRequired, false);
  assert.deepEqual(
    store.products().map((product) => product.stock),
    [20, 20, 20, 20],
  );
  assert.ok(!store.meta("admin").includes(DEMO_ACCESS.password));
  assert.throws(
    () => store.login({ username: "real", password: "personal" }),
    /público/,
  );
  assert.throws(() => store.call("adjustStock", {}), /Sessão/);
  assert.throws(() => store.call("setup", {}), /desconhecida/);
  assert.throws(
    () => store.call("exec", { sql: "DROP TABLE sales" }),
    /desconhecida/,
  );
});

test("preços vêm do catálogo; reserva e idempotência impedem pedido duplicado", (t) => {
  const { store } = fixture(t);
  const input = order([{ id: "teambee", quantity: 2, price: 1 }]);
  const sale = store.createSale(input);
  assert.equal(sale.total_cents, 1100);
  assert.equal(store.products()[0].available, 18);
  assert.equal(store.products()[0].stock, 20);
  assert.equal(store.createSale(input).id, sale.id);
  assert.equal(store.get("SELECT COUNT(*) AS total FROM sales").total, 1);
  assert.throws(() => store.createSale(order()), /andamento/);
});

test("entradas inválidas não deixam registros parciais nem estoque inconsistente", (t) => {
  const { store, token } = fixture(t);
  for (const quantity of [0, -1, 1.5, "2", 101, 21])
    assert.throws(() => store.createSale(order([{ id: "teambee", quantity }])));
  assert.throws(
    () =>
      store.createSale(
        order([
          { id: "teambee", quantity: 1 },
          { id: "teambee", quantity: 1 },
        ]),
      ),
    /duplicado/,
  );
  assert.equal(store.get("SELECT COUNT(*) AS total FROM sales").total, 0);
  const sale = store.createSale(order());
  assert.throws(() =>
    store.call(
      "adjustStock",
      { gateId: "G001", stock: 1, reason: "Ajuste" },
      token,
    ),
  );
  store.cancelSale({ id: sale.id });
  assert.equal(store.products()[0].available, 20);
});

test("falha permite repetir e cancelar sem cobrança, dispensa ou baixa de estoque", (t) => {
  const { store, tick } = fixture(t, { random: () => 0.8 });
  const sale = store.createSale(order());
  tick(5000);
  assert.equal(store.sale(sale.id).status, "payment_failed");
  assert.equal(store.products()[0].stock, 20);
  store.retrySale({ id: sale.id });
  store.retrySale({ id: sale.id });
  assert.equal(
    store.get("SELECT COUNT(*) AS total FROM payment_attempts").total,
    2,
  );
  store.cancelSale({ id: sale.id });
  tick(10000);
  assert.equal(store.sale(sale.id).status, "cancelled");
  assert.equal(store.products()[0].stock, 20);
});

test("entrega sequencial baixa cada unidade uma vez e alimenta relatórios", (t) => {
  const { store, tick } = fixture(t);
  const sale = store.createSale(
    order([
      { id: "teambee", quantity: 2 },
      { id: "backdev", quantity: 1 },
    ]),
  );
  tick(5000);
  assert.equal(store.sale(sale.id).status, "paid");
  tick(2000);
  assert.equal(store.sale(sale.id).running.gate_id, "G001");
  for (let i = 0; i < 15; i++) {
    tick();
    assert.ok(
      store.get(
        "SELECT COUNT(*) AS total FROM dispenses WHERE status='running'",
      ).total <= 1,
    );
  }
  assert.equal(store.sale(sale.id).status, "completed");
  assert.equal(store.sale(sale.id).delivered, 3);
  assert.deepEqual(
    store.products().map((product) => product.stock),
    [18, 19, 20, 20],
  );
  tick(10000);
  assert.equal(store.products()[0].stock, 18);
  const report = store.report({
    view: "items",
    filters: { name: "Lucas" },
    sort: "subtotal_cents",
    direction: "asc",
  });
  assert.equal(report.total, 1);
  assert.equal(report.rows[0].unit_cents, 700);
  assert.equal(report.stats.total_cents, 1800);
  assert.equal(
    store.report({ view: "items", filters: { unit_cents: "5,50" } }).total,
    1,
  );
});

test("snapshot recarregado interrompe entrega e permite retomar sem duplicar unidades", (t) => {
  const f = fixture(t);
  const sale = f.store.createSale(order());
  f.tick(5000);
  f.tick(2000);
  f.tick();
  f.tick();
  assert.equal(f.store.sale(sale.id).delivered, 1);
  const snapshot = f.database.export();
  assert.equal(f.store.get("PRAGMA foreign_keys").foreign_keys, 1);
  const database = createDatabase(SQL, snapshot);
  const recovered = new Store("demo", { database, clock: f.clock });
  t.after(() => recovered.close());
  assert.equal(recovered.sale(sale.id).status, "interrupted");
  assert.equal(recovered.sale(sale.id).delivered, 1);
  recovered.resumeSale({ id: sale.id });
  recovered.advance();
  assert.equal(recovered.sale(sale.id).running.position, 1);
  assert.equal(recovered.products()[0].stock, 19);
});

test("sincronização simulada falha, reenvia e confirma sem duplicação ou envio real", (t) => {
  const { store, token, tick } = fixture(t);
  const settings = { ...store.settings(), syncScenario: "failure" };
  store.call("updateSettings", settings, token);
  store.sync();
  tick(3000);
  assert.equal(store.syncStatus().last.status, "failure");
  assert.equal(store.syncStatus().pending, 5);
  store.call("updateSettings", { ...settings, syncScenario: "success" }, token);
  store.sync();
  store.sync();
  tick(3000);
  assert.equal(store.syncStatus().pending, 0);
  store.sync();
  tick(3000);
  assert.equal(
    store.get("SELECT COUNT(*) AS total FROM simulated_receipts").total,
    5,
  );
  assert.equal(
    store.get(
      "SELECT COUNT(*) AS total FROM outbox WHERE synced_at IS NOT NULL",
    ).total,
    0,
  );
});

test("queda de rede mantém histórico e impede aprovação da tentativa em andamento", (t) => {
  const { store, tick, offline } = fixture(t);
  const sale = store.createSale(order());
  offline();
  tick(5000);
  assert.equal(store.sale(sale.id).status, "payment_failed");
  assert.equal(store.products()[0].stock, 20);
  assert.equal(store.report().total, 1);
  assert.throws(() => store.createSale(order()), /conexão/);
});

test("sessões isoladas persistem por aba e recarga não compartilha compras ou acesso", (t) => {
  const storageA = memoryStorage();
  const storageB = memoryStorage();
  let time = 10000;
  const a = createDemoSession(SQL, storageA, { clock: () => time });
  const b = createDemoSession(SQL, storageB, { clock: () => time });
  const sale = a.call("createSale", order());
  assert.equal(b.call("info").activeSale, null);
  const auth = a.call("login", DEMO_ACCESS);
  a.close();
  const recovered = createDemoSession(SQL, storageA, { clock: () => time });
  t.after(() => {
    recovered.close();
    b.close();
  });
  assert.equal(recovered.call("info").activeSale.id, sale.id);
  assert.throws(() => recovered.call("adminInfo", {}, auth.token), /Sessão/);
  time += 5000;
  recovered.advance();
  assert.equal(recovered.call("sale", { id: sale.id }).status, "paid");
  assert.equal(b.call("products")[0].available, 20);
});

test("persistência não grava a cada consulta e falhas de storage são explícitas", (t) => {
  const storage = memoryStorage();
  let writes = 0;
  const counted = {
    ...storage,
    setItem(key, value) {
      writes++;
      storage.setItem(key, value);
    },
  };
  const session = createDemoSession(SQL, counted);
  t.after(() => session.close());
  const before = writes;
  for (let i = 0; i < 20; i++) session.call("products");
  assert.equal(writes, before);
  const broken = memoryStorage();
  broken.setItem(STORAGE_KEY, "snapshot inválido");
  assert.throws(() => createDemoSession(SQL, broken), /Recomeçar/);
  assert.throws(
    () =>
      createDemoSession(SQL, {
        getItem() {
          throw new Error("blocked");
        },
      }),
    /bloqueado/,
  );
  assert.throws(
    () =>
      createDemoSession(SQL, {
        getItem() {
          return null;
        },
        setItem() {
          throw new Error("quota");
        },
      }),
    /salvar/,
  );
});
