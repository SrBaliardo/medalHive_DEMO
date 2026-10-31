import { useEffect, useState } from "react";
import { MedalHive } from "./medalhive/MedalHive";
import { startSimulation } from "./medalhive/api";
import { STORAGE_KEY } from "./medalhive/demo/config";

export function WebDemo() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => startSimulation((error) => setError(error.message)), []);
  function reset() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.location.replace(
        window.location.pathname + window.location.search + "#/",
      );
      window.location.reload();
    } catch {
      setError("O navegador bloqueou a limpeza do armazenamento desta aba.");
    }
  }
  return (
    <div className="web-demo">
      <aside className="demo-toolbar" aria-label="Informações da demonstração">
        <span>
          <strong>MedalHive · DEMO WEB</strong> Sem cobranças reais. Dados
          fictícios, isolados nesta aba.
        </span>
        <button
          type="button"
          onClick={() => setConfirmReset((value) => !value)}
          aria-expanded={confirmReset}
          aria-controls="reset-demo"
        >
          {confirmReset ? "Cancelar" : "Recomeçar demo"}
        </button>
      </aside>
      {confirmReset && (
        <div className="demo-reset" id="reset-demo">
          <p>Repor catálogo, estoque e histórico iniciais somente nesta aba?</p>
          <button type="button" onClick={reset}>
            Sim, recomeçar esta demo
          </button>
          <button type="button" onClick={() => setConfirmReset(false)}>
            Manter meus testes
          </button>
        </div>
      )}
      {error && (
        <p className="demo-error" role="alert">
          {error}
        </p>
      )}
      <MedalHive />
    </div>
  );
}
