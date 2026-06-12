// Loco Moco — dünner macOS-Client.
// Kein lokaler Server, kein Node/Build: nur ein WKWebView-Fenster auf den
// zentralen Server im LAN. Die Server-Adresse wird einmalig abgefragt und in
// ~/.loco-moco-client/server.txt gespeichert (vom Installer vorbelegbar).
// Build:  scripts/build-client.sh
import Cocoa
import WebKit
import UniformTypeIdentifiers

let HOME = FileManager.default.homeDirectoryForCurrentUser.path
let CFG_DIR = "\(HOME)/.loco-moco-client"
let SERVER_FILE = "\(CFG_DIR)/server.txt"

// Animierte Verbinde-Splash (gleiche Optik wie die Lade-Animation im Dashboard).
let SPLASH_HTML = """
<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light">
<style>
  html,body{margin:0;height:100%;overflow:hidden;font-family:-apple-system,'Quicksand',sans-serif}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:radial-gradient(900px 500px at 15% -10%,#ffe1f1 0,transparent 55%),
    radial-gradient(700px 600px at 95% 5%,rgba(231,222,255,.95) 0,transparent 50%),
    linear-gradient(160deg,#fff0f8 0%,#fde7ff 45%,#eef0ff 100%);color:#7a4d6e}
  .stage{position:relative;width:150px;height:150px;margin-bottom:26px}
  .ring{position:absolute;inset:0;border-radius:50%;filter:blur(8px);opacity:.6;
    background:conic-gradient(from 0deg,#ff8fd0,#c9a7ff,#a9d8ff,#ffd86b,#ff8fd0);
    animation:spin 3.2s linear infinite,breathe 2.4s ease-in-out infinite}
  .egg{position:absolute;inset:0;display:grid;place-items:center;font-size:74px;
    animation:bounce 1.5s cubic-bezier(.5,0,.5,1) infinite;filter:drop-shadow(0 8px 14px rgba(255,79,163,.4))}
  .orbit{position:absolute;inset:0;animation:spin 6s linear infinite}
  .orbit span{position:absolute;top:50%;left:50%;font-size:24px}
  .o1{transform:rotate(0deg) translateX(82px) rotate(0deg)}
  .o2{transform:rotate(120deg) translateX(82px) rotate(-120deg)}
  .o3{transform:rotate(240deg) translateX(82px) rotate(-240deg)}
  .title{font-family:'Fredoka',sans-serif;font-weight:700;font-size:1.6rem;margin:0 0 16px;
    background:linear-gradient(110deg,#ff8fd0,#c9a7ff,#a9d8ff,#ffd86b,#ff8fd0);background-size:220% 220%;
    -webkit-background-clip:text;background-clip:text;color:transparent;animation:shim 4s ease-in-out infinite}
  .track{width:230px;max-width:70vw;height:10px;border-radius:999px;background:rgba(255,143,208,.18);overflow:hidden;margin-bottom:22px}
  .fill{height:100%;width:42%;border-radius:999px;background:linear-gradient(90deg,#ff8fd0,#ff2e95,#c9a7ff);
    box-shadow:0 0 12px rgba(255,79,163,.6);animation:slide 1.5s ease-in-out infinite}
  .wis{max-width:440px;text-align:center;font-weight:600;font-size:1.02rem;min-height:48px;padding:0 16px;animation:fade .6s ease both}
  @keyframes bounce{0%,100%{transform:translateY(4px) scale(1)}50%{transform:translateY(-10px) scale(1.06)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes breathe{0%,100%{opacity:.45}50%{opacity:.8}}
  @keyframes shim{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  @keyframes slide{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}
  @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
</style></head><body>
  <div class="stage">
    <div class="ring"></div>
    <div class="orbit"><span class="o1">✨</span><span class="o2">💖</span><span class="o3">🩷</span></div>
    <div class="egg">🍳</div>
  </div>
  <h1 class="title">Loco Moco verbindet…</h1>
  <div class="track"><div class="fill"></div></div>
  <p class="wis" id="w"></p>
<script>
  var W=["Nicht jede Stunde muss verrechenbar sein — aber die meisten schon. 😇",
  "Erst der Kaffee, dann die Deadline. ☕✨","Ordnung ist das halbe Leben. Die andere Hälfte ist Glitzer. 💅",
  "Wer Zeit erfasst, hat sie nicht verloren — nur dokumentiert. 📊",
  "Multitasking ist, wenn man gleichzeitig nichts fertig macht. 🦄",
  "Done ist das neue Perfekt. 💖","Glitzer macht alles besser — sogar Excel. ✨"];
  var el=document.getElementById('w'),i=Math.floor(Date.now()/1000)%W.length;
  function show(){el.style.animation='none';el.offsetHeight;el.style.animation='fade .6s ease both';el.textContent=W[i];i=(i+1)%W.length;}
  show();setInterval(show,7000);
</script></body></html>
"""

func errorHTML(_ server: String) -> String {
    let safe = server.replacingOccurrences(of: "<", with: "&lt;")
    return """
    <!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light">
    <style>html,body{margin:0;height:100%;font-family:-apple-system,sans-serif;background:#fff0f8;color:#7a4d6e;
      display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}
      h1{font-size:1.4rem;margin:0 0 8px}p{font-weight:600;max-width:460px}code{background:#ffe1f1;padding:2px 8px;border-radius:8px}
      .hint{margin-top:18px;font-size:.95rem;opacity:.85}</style></head><body>
      <div style="font-size:54px">🔌</div>
      <h1>Server nicht erreichbar</h1>
      <p>Der Loco-Moco-Server unter <code>\(safe)</code> antwortet nicht. Ist der Server eingeschaltet und bist du im richtigen Netzwerk?</p>
      <p class="hint">Adresse ändern: Menü <b>Ablage → Server ändern…</b> · erneut versuchen: <b>⌘R</b></p>
    </body></html>
    """
}

// Shell-Skripte für die lokale KI (Ollama) — aus den Einstellungen ausgelöst.
let OLLAMA_INSTALL_SH = """
set -e
BREW="$(command -v brew || echo /opt/homebrew/bin/brew)"
command -v ollama >/dev/null 2>&1 || "$BREW" install ollama
OB="$(command -v ollama || echo /opt/homebrew/bin/ollama)"
"$BREW" services stop ollama >/dev/null 2>&1 || true
pkill -x ollama >/dev/null 2>&1 || true
sleep 1
PLIST="$HOME/Library/LaunchAgents/ch.wireon.locomoco.ollama.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>ch.wireon.locomoco.ollama</string>
  <key>ProgramArguments</key><array><string>$OB</string><string>serve</string></array>
  <key>EnvironmentVariables</key><dict><key>OLLAMA_ORIGINS</key><string>*</string></dict>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
</dict></plist>
PL
launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load -w "$PLIST" >/dev/null 2>&1 || true
sleep 2
OLLAMA_ORIGINS="*" "$OB" pull qwen2.5:7b
"""

let OLLAMA_UNINSTALL_SH = """
PLIST="$HOME/Library/LaunchAgents/ch.wireon.locomoco.ollama.plist"
launchctl unload "$PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST"
pkill -x ollama >/dev/null 2>&1 || true
BREW="$(command -v brew || echo /opt/homebrew/bin/brew)"
"$BREW" services stop ollama >/dev/null 2>&1 || true
"$BREW" uninstall ollama >/dev/null 2>&1 || true
rm -rf "$HOME/.ollama"
"""

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var overlay: NSView!
    var server = ""
    var loadedReal = false
    var didCheckUpdate = false
    var pendingUpdateApp: String? = nil   // entpackte neue .app, wird beim Beenden eingespielt
    var crashReloads = 0                  // Schutz gegen Endlos-Neuladen bei Inhalts-Prozess-Absturz

    func applicationDidFinishLaunching(_ note: Notification) {
        if moveToApplicationsIfNeeded() { return } // verschiebt & startet neu
        setupMenu()

        let frame = NSRect(x: 0, y: 0, width: 1180, height: 800)
        window = NSWindow(contentRect: frame,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Loco Moco"
        window.appearance = NSAppearance(named: .aqua)
        window.minSize = NSSize(width: 720, height: 560)
        window.setFrameAutosaveName("LocoMocoClientWindow")
        window.center()

        let container = NSView(frame: frame)
        container.autoresizingMask = [.width, .height]

        let cfg = WKWebViewConfiguration()
        let ucc = WKUserContentController()
        ucc.add(self, name: "locomoco")
        cfg.userContentController = ucc
        webView = WKWebView(frame: frame, configuration: cfg)
        webView.appearance = NSAppearance(named: .aqua)
        if #available(macOS 13.3, *) { webView.isInspectable = true } // Safari → Entwickler → Loco Moco
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        container.addSubview(webView)

        overlay = NSView(frame: frame)
        overlay.wantsLayer = true
        overlay.layer?.backgroundColor = NSColor(calibratedRed: 1.0, green: 0.94, blue: 0.97, alpha: 1).cgColor
        overlay.autoresizingMask = [.width, .height]
        container.addSubview(overlay)

        window.contentView = container
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        webView.loadHTMLString(SPLASH_HTML, baseURL: nil)

        // Server-Adresse: gespeichert? sonst beim ersten Start abfragen.
        if let saved = readServer(), !saved.isEmpty {
            server = saved
            connect()
        } else {
            DispatchQueue.main.async { self.changeServer(initial: true) }
        }
    }

    // MARK: Nach „Programme" verschieben (beim manuellen Download aus dem ZIP)
    // Läuft die App ausserhalb von /Applications, einmalig anbieten, sie dorthin
    // zu verschieben — danach von dort neu starten. Wer den curl-Installer nutzt,
    // ist schon in /Applications und sieht das nie.
    func moveToApplicationsIfNeeded() -> Bool {
        let path = Bundle.main.bundlePath
        if path.hasPrefix("/Applications/") { return false }
        // In einer schreibgeschützten DMG/temporären Stelle? Trotzdem anbieten.
        let alert = NSAlert()
        alert.messageText = "Loco Moco ins Programme-Verzeichnis verschieben?"
        alert.informativeText = "So liegt die App am richtigen Ort und kann später automatisch aktualisiert werden."
        alert.addButton(withTitle: "Verschieben")
        alert.addButton(withTitle: "Nicht jetzt")
        guard alert.runModal() == .alertFirstButtonReturn else { return false }

        let target = "/Applications/Loco Moco.app"
        let fm = FileManager.default
        do {
            try? fm.removeItem(atPath: target)
            try fm.copyItem(atPath: path, toPath: target)
        } catch {
            showAlert("Verschieben fehlgeschlagen", error.localizedDescription)
            return false
        }
        // Quarantäne entfernen, Original (wenn möglich) löschen, neue Instanz starten.
        let pid = ProcessInfo.processInfo.processIdentifier
        let script = """
        while kill -0 \(pid) 2>/dev/null; do sleep 0.2; done
        xattr -dr com.apple.quarantine "\(target)" 2>/dev/null || true
        rm -rf "\(path)" 2>/dev/null || true
        open "\(target)"
        """
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/bash")
        p.arguments = ["-c", script]
        try? p.run()
        NSApp.terminate(nil)
        return true
    }

    // Diagnose-Log nach ~/.loco-moco-client/client.log
    func logLine(_ s: String) {
        let line = "\(Date()) \(s)\n"
        let path = "\(CFG_DIR)/client.log"
        guard let data = line.data(using: .utf8) else { return }
        if let fh = FileHandle(forWritingAtPath: path) {
            fh.seekToEndOfFile(); fh.write(data); try? fh.close()
        } else {
            try? FileManager.default.createDirectory(atPath: CFG_DIR, withIntermediateDirectories: true)
            try? data.write(to: URL(fileURLWithPath: path))
        }
    }

    // MARK: Server-Adresse
    func readServer() -> String? {
        guard let s = try? String(contentsOfFile: SERVER_FILE, encoding: .utf8) else { return nil }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    func writeServer(_ url: String) {
        try? FileManager.default.createDirectory(atPath: CFG_DIR, withIntermediateDirectories: true)
        try? url.write(toFile: SERVER_FILE, atomically: true, encoding: .utf8)
    }
    func normalize(_ raw: String) -> String {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return s }
        if !s.hasPrefix("http://") && !s.hasPrefix("https://") { s = "http://" + s }
        while s.hasSuffix("/") { s.removeLast() }
        return s
    }

    @objc func changeServerMenu() { changeServer(initial: false) }
    func changeServer(initial: Bool) {
        let alert = NSAlert()
        alert.messageText = initial ? "Mit welchem Server verbinden?" : "Server-Adresse ändern"
        alert.informativeText = "Adresse des Loco-Moco-Servers im lokalen Netz, z. B. http://192.168.1.50:4577 (auf der Portal-Seite angezeigt)."
        alert.addButton(withTitle: "Verbinden")
        if !initial { alert.addButton(withTitle: "Abbrechen") }
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 320, height: 24))
        field.placeholderString = "http://192.168.1.50:4577"
        field.stringValue = server.isEmpty ? "http://" : server
        alert.accessoryView = field
        alert.window.initialFirstResponder = field

        let resp = alert.runModal()
        if !initial && resp != .alertFirstButtonReturn { return }
        let url = normalize(field.stringValue)
        if url.isEmpty || url == "http://" { if initial { NSApp.terminate(nil) }; return }
        server = url
        writeServer(url)
        connect()
    }

    func connect() {
        guard let url = URL(string: server) else { changeServer(initial: false); return }
        loadedReal = false
        webView.load(URLRequest(url: url))
    }

    // MARK: Stilles Auto-Update der Hülle
    // Liest <host>/downloads/version.json (Portal, Port 80). Ist dort eine höhere
    // Version veröffentlicht, wird das neue Paket im Hintergrund geladen und beim
    // Beenden lautlos eingespielt. Der Server entscheidet, wann es so weit ist.
    func currentVersion() -> Int {
        Int((Bundle.main.infoDictionary?["CFBundleVersion"] as? String) ?? "1") ?? 1
    }
    func portalHost() -> String? { URL(string: server)?.host }

    func checkForUpdate() {
        guard let host = portalHost(),
              let vurl = URL(string: "http://\(host)/downloads/version.json") else { return }
        var req = URLRequest(url: vurl); req.timeoutInterval = 5
        req.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            guard let self = self, let data = data,
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            let latest = (obj["version"] as? Int) ?? Int("\(obj["version"] ?? "")") ?? 0
            guard latest > self.currentVersion() else { return }
            let rel = (obj["url"] as? String) ?? "/downloads/Loco-Moco-Mac.zip"
            let zip = rel.hasPrefix("http") ? rel : "http://\(host)\(rel)"
            self.downloadUpdate(zip)
        }.resume()
    }

    func downloadUpdate(_ zipURL: String) {
        guard let u = URL(string: zipURL) else { return }
        URLSession.shared.downloadTask(with: u) { [weak self] tmp, _, _ in
            guard let self = self, let tmp = tmp else { return }
            let fm = FileManager.default
            let stage = "\(CFG_DIR)/update"
            try? fm.removeItem(atPath: stage)
            try? fm.createDirectory(atPath: stage, withIntermediateDirectories: true)
            let zipPath = "\(stage)/loco.zip"
            do { try fm.moveItem(at: tmp, to: URL(fileURLWithPath: zipPath)) } catch { return }
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/usr/bin/ditto")
            p.arguments = ["-x", "-k", zipPath, stage]
            try? p.run(); p.waitUntilExit()
            if let items = try? fm.contentsOfDirectory(atPath: stage) {
                for it in items where it.hasSuffix(".app") { self.pendingUpdateApp = "\(stage)/\(it)" }
            }
        }.resume()
    }

    // MARK: Menü
    func setupMenu() {
        let mainMenu = NSMenu()

        let appItem = NSMenuItem(); mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Loco Moco verbergen", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Loco Moco beenden", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let fileItem = NSMenuItem(); mainMenu.addItem(fileItem)
        let fileMenu = NSMenu(title: "Ablage")
        fileMenu.addItem(withTitle: "Als PDF sichern…", action: #selector(menuSavePDF), keyEquivalent: "p")
        fileMenu.addItem(withTitle: "Bericht teilen…", action: #selector(menuShare), keyEquivalent: "S")
        fileMenu.addItem(NSMenuItem.separator())
        fileMenu.addItem(withTitle: "Server ändern…", action: #selector(changeServerMenu), keyEquivalent: "")
        fileItem.submenu = fileMenu

        let editItem = NSMenuItem(); mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "Bearbeiten")
        editMenu.addItem(withTitle: "Rückgängig", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Wiederholen", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Ausschneiden", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Kopieren", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Einfügen", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Alles auswählen", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu

        let viewItem = NSMenuItem(); mainMenu.addItem(viewItem)
        let viewMenu = NSMenu(title: "Ansicht")
        viewMenu.addItem(withTitle: "Neu laden", action: #selector(reload), keyEquivalent: "r")
        viewItem.submenu = viewMenu

        NSApp.mainMenu = mainMenu
    }

    @objc func reload() { if server.isEmpty { changeServer(initial: false) } else { connect() } }
    @objc func menuSavePDF() { webView.evaluateJavaScript("window.__locoExport && window.__locoExport('pdf')") }
    @objc func menuShare() { webView.evaluateJavaScript("window.__locoExport && window.__locoExport('share')") }

    // MARK: JS-Brücke fürs Teilen/PDF
    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "locomoco",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }
        let filename = (body["filename"] as? String) ?? "Loco Moco Bericht.pdf"
        let subject = (body["subject"] as? String) ?? "Loco Moco Bericht"
        switch action {
        case "pdf": savePDF(filename: filename)
        case "share": sharePDF(filename: filename, subject: subject)
        case "installOllama": runOllamaScript(OLLAMA_INSTALL_SH, note: "Ollama wird installiert und das KI-Modell geladen (im Hintergrund, einige Minuten). Danach in den Einstellungen „prüfen“.")
        case "uninstallOllama": runOllamaScript(OLLAMA_UNINSTALL_SH, note: "Ollama und Modelle werden entfernt.")
        default: break
        }
    }

    // Shell für die KI-Einrichtung im Hintergrund ausführen.
    func runOllamaScript(_ script: String, note: String) {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/bash")
        p.arguments = ["-lc", script]
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + (env["PATH"] ?? "")
        p.environment = env
        do { try p.run() } catch { showAlert("Fehler", error.localizedDescription); return }
        showAlert("KI-Setup", note)
    }

    private func generatePDF(_ completion: @escaping (Data) -> Void) {
        webView.createPDF(configuration: WKPDFConfiguration()) { [weak self] result in
            switch result {
            case .success(let data): completion(data)
            case .failure(let err): self?.showAlert("PDF konnte nicht erstellt werden", err.localizedDescription)
            }
        }
    }
    private func savePDF(filename: String) {
        generatePDF { [weak self] data in
            guard let self = self else { return }
            let panel = NSSavePanel()
            panel.nameFieldStringValue = filename
            panel.allowedContentTypes = [UTType.pdf]
            panel.canCreateDirectories = true
            panel.beginSheetModal(for: self.window) { resp in
                if resp == .OK, let url = panel.url { try? data.write(to: url) }
            }
        }
    }
    private func sharePDF(filename: String, subject: String) {
        generatePDF { [weak self] data in
            guard let self = self else { return }
            let tmp = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)
            do { try data.write(to: tmp) } catch { self.showAlert("Teilen fehlgeschlagen", error.localizedDescription); return }
            let picker = NSSharingServicePicker(items: [tmp])
            let b = self.webView.bounds
            picker.show(relativeTo: NSRect(x: b.midX - 1, y: b.maxY - 70, width: 2, height: 2), of: self.webView, preferredEdge: .minY)
        }
    }
    private func showAlert(_ title: String, _ msg: String) {
        let a = NSAlert(); a.messageText = title; a.informativeText = msg; a.alertStyle = .warning; a.runModal()
    }

    // MARK: WKNavigationDelegate
    func webView(_ wv: WKWebView, didFinish navigation: WKNavigation!) {
        if !overlay.isHidden {
            NSAnimationContext.runAnimationGroup({ ctx in ctx.duration = 0.4; overlay.animator().alphaValue = 0 },
                                                 completionHandler: { self.overlay.isHidden = true })
        }
        logLine("didFinish url=\(wv.url?.absoluteString ?? "?")")
        if wv.url?.absoluteString.hasPrefix(server) == true {
            loadedReal = true
            crashReloads = 0 // erfolgreich geladen -> Zähler zurücksetzen
            if !didCheckUpdate { didCheckUpdate = true; checkForUpdate() }
        }
    }
    func webView(_ wv: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        logLine("didFail: code=\((error as NSError).code) \(error.localizedDescription)")
        showError()
    }
    func webView(_ wv: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        logLine("didFailProvisional: code=\((error as NSError).code) \(error.localizedDescription)")
        showError()
    }

    // Inhalts-Prozess (Renderer) wurde vom System beendet — meist Speicherdruck.
    // Statt der leeren „This page couldn't load"-Seite automatisch neu laden;
    // beim Neuladen ist der Cache warm, sodass es i. d. R. sofort klappt. Mit
    // Begrenzung gegen Endlos-Schleifen.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        logLine("contentProcessTerminated reload#\(crashReloads + 1)")
        crashReloads += 1
        if crashReloads <= 6 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.connect() }
        } else {
            webView.loadHTMLString(errorHTML(server), baseURL: nil)
        }
    }
    func showError() {
        guard !loadedReal else { return }
        webView.loadHTMLString(errorHTML(server), baseURL: nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }

    // Beim Beenden: falls ein Update bereitliegt, lautlos einspielen. Ein
    // losgelöstes bash wartet, bis dieser Prozess weg ist, und tauscht dann das
    // Bundle aus (neue Version beim nächsten Öffnen aktiv).
    func applicationWillTerminate(_ note: Notification) {
        guard let newApp = pendingUpdateApp else { return }
        let install = Bundle.main.bundlePath
        let pid = ProcessInfo.processInfo.processIdentifier
        let script = """
        while kill -0 \(pid) 2>/dev/null; do sleep 0.3; done
        rm -rf "\(install)"
        /usr/bin/ditto "\(newApp)" "\(install)"
        xattr -dr com.apple.quarantine "\(install)" 2>/dev/null || true
        rm -rf "\(CFG_DIR)/update"
        """
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/bash")
        p.arguments = ["-c", script]
        try? p.run()
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
