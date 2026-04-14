import { Button } from "../components/ui/Button";
import { api } from "../lib/api";

export function LoginRoute() {
  return (
    <section className="stack">
      <div>
        <h1>Conectar Strava</h1>
        <p className="muted">Autorize leitura das atividades e upload dos arquivos ausentes.</p>
      </div>
      <div className="panel row">
        <Button onClick={() => (window.location.href = api.stravaLoginUrl("/dashboard"))}>Conectar com Strava</Button>
      </div>
    </section>
  );
}

