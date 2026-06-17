export const dynamic = "force-static";

export default function NurAppPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div className="card" style={{ maxWidth: 460 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🔒</div>
        <h1 style={{ fontSize: 22, color: "var(--plum)", marginBottom: 8 }}>Nur über die App</h1>
        <p style={{ fontSize: 14, color: "var(--plum-soft)", fontWeight: 600, lineHeight: 1.6 }}>
          Loco Moco ist im Browser gesperrt. Bitte nutze die <b>installierte Loco-Moco-App</b>.
          Sie wird über die Startseite des Servers bereitgestellt.
        </p>
      </div>
    </div>
  );
}
