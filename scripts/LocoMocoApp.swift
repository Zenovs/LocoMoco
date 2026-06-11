// Loco Moco — native macOS-Hülle um den lokalen Next.js-Server.
// Startet den Server still im Hintergrund (scripts/start.sh, ohne Browser) und
// zeigt das Dashboard in einem eigenen WKWebView-Fenster. Beim Beenden wird der
// Server gestoppt.  Build:  swiftc -O -framework Cocoa -framework WebKit ...
import Cocoa
import WebKit
import UniformTypeIdentifiers

let PORT = 4577
let HOME = FileManager.default.homeDirectoryForCurrentUser.path
let START_SH = "\(HOME)/.loco-moco/app/scripts/start.sh"
let LOG_FILE = "\(HOME)/.loco-moco/app.log"
let URL_STRING = "http://localhost:\(PORT)/"

// Animierte Start-Splash (girly), wird sofort im Fenster gezeigt, bis der
// lokale Server bereit ist — gleiche Optik wie die Lade-Animation im Dashboard.
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
  <h1 class="title">Loco Moco startet…</h1>
  <div class="track"><div class="fill"></div></div>
  <p class="wis" id="w"></p>
<script>
  var W=["Nicht jede Stunde muss verrechenbar sein — aber die meisten schon. 😇",
  "Erst der Kaffee, dann die Deadline. ☕✨","Ordnung ist das halbe Leben. Die andere Hälfte ist Glitzer. 💅",
  "Wer Zeit erfasst, hat sie nicht verloren — nur dokumentiert. 📊",
  "Multitasking ist, wenn man gleichzeitig nichts fertig macht. 🦄",
  "Done ist das neue Perfekt. 💖","Glitzer macht alles besser — sogar Excel. ✨",
  "Pausen sind keine verlorene Zeit, sondern Investitionen in Glanz. 🌸",
  "Kleine Schritte sind auch Schritte. Mit Absätzen sowieso. 👠"];
  var el=document.getElementById('w'),i=Math.floor(Date.now()/1000)%W.length;
  function show(){el.style.animation='none';el.offsetHeight;el.style.animation='fade .6s ease both';el.textContent=W[i];i=(i+1)%W.length;}
  show();setInterval(show,7000);
</script></body></html>
"""

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var overlay: NSView!
    var startedServer = false
    var didLoad = false
    var realLoadStarted = false

    func applicationDidFinishLaunching(_ note: Notification) {
        setupMenu()

        let frame = NSRect(x: 0, y: 0, width: 1180, height: 800)
        window = NSWindow(contentRect: frame,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Loco Moco"
        window.appearance = NSAppearance(named: .aqua) // App bewusst immer hell
        window.minSize = NSSize(width: 720, height: 560)
        window.setFrameAutosaveName("LocoMocoWindow")
        window.center()

        let container = NSView(frame: frame)
        container.autoresizingMask = [.width, .height]

        let cfg = WKWebViewConfiguration()
        let ucc = WKUserContentController()
        ucc.add(self, name: "locomoco") // JS-Brücke fürs Teilen/PDF
        cfg.userContentController = ucc
        webView = WKWebView(frame: frame, configuration: cfg)
        // Immer helle Darstellung erzwingen — sonst rendert WKWebView (und das
        // exportierte PDF) im Dark Mode auf dunklem Grund.
        webView.appearance = NSAppearance(named: .aqua)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        container.addSubview(webView)

        // Schlichtes rosa Overlay nur als Anti-Flash, bis die animierte Splash
        // (im WebView) gerendert ist — danach blendet es weg.
        overlay = NSView(frame: frame)
        overlay.wantsLayer = true
        overlay.layer?.backgroundColor = NSColor(calibratedRed: 1.0, green: 0.94, blue: 0.97, alpha: 1).cgColor
        overlay.autoresizingMask = [.width, .height]
        container.addSubview(overlay)

        window.contentView = container
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // Animierte Start-Splash sofort anzeigen
        webView.loadHTMLString(SPLASH_HTML, baseURL: nil)

        bootstrap()
    }

    func setupMenu() {
        let mainMenu = NSMenu()

        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Loco Moco verbergen",
                        action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Loco Moco beenden",
                        action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        // Ablage: PDF sichern / Teilen
        let fileItem = NSMenuItem()
        mainMenu.addItem(fileItem)
        let fileMenu = NSMenu(title: "Ablage")
        fileMenu.addItem(withTitle: "Als PDF sichern…", action: #selector(menuSavePDF), keyEquivalent: "p")
        fileMenu.addItem(withTitle: "Bericht teilen…", action: #selector(menuShare), keyEquivalent: "S")
        fileItem.submenu = fileMenu

        let editItem = NSMenuItem()
        mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "Bearbeiten")
        editMenu.addItem(withTitle: "Rückgängig", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Wiederholen", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Ausschneiden", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Kopieren", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Einfügen", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Alles auswählen", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu

        // Neu laden (Cmd+R)
        let viewItem = NSMenuItem()
        mainMenu.addItem(viewItem)
        let viewMenu = NSMenu(title: "Ansicht")
        viewMenu.addItem(withTitle: "Neu laden", action: #selector(reload), keyEquivalent: "r")
        viewItem.submenu = viewMenu

        NSApp.mainMenu = mainMenu
    }

    @objc func reload() { webView.reload() }

    // Menü -> über JS denselben Export-Pfad auslösen (JS kennt Name/Monat)
    @objc func menuSavePDF() {
        webView.evaluateJavaScript("window.__locoExport && window.__locoExport('pdf')")
    }
    @objc func menuShare() {
        webView.evaluateJavaScript("window.__locoExport && window.__locoExport('share')")
    }

    // MARK: WKScriptMessageHandler — JS-Brücke fürs Teilen/PDF
    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "locomoco",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }
        let filename = (body["filename"] as? String) ?? "Loco Moco Bericht.pdf"
        let subject = (body["subject"] as? String) ?? "Loco Moco Bericht"
        switch action {
        case "pdf": savePDF(filename: filename)
        case "share": sharePDF(filename: filename, subject: subject)
        default: break
        }
    }

    private func generatePDF(_ completion: @escaping (Data) -> Void) {
        let config = WKPDFConfiguration()
        webView.createPDF(configuration: config) { [weak self] result in
            switch result {
            case .success(let data): completion(data)
            case .failure(let err):
                self?.showAlert("PDF konnte nicht erstellt werden", err.localizedDescription)
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
                if resp == .OK, let url = panel.url {
                    try? data.write(to: url)
                }
            }
        }
    }

    private func sharePDF(filename: String, subject: String) {
        generatePDF { [weak self] data in
            guard let self = self else { return }
            let tmp = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)
            do { try data.write(to: tmp) }
            catch { self.showAlert("Teilen fehlgeschlagen", error.localizedDescription); return }
            let picker = NSSharingServicePicker(items: [tmp])
            let b = self.webView.bounds
            let anchor = NSRect(x: b.midX - 1, y: b.maxY - 70, width: 2, height: 2)
            picker.show(relativeTo: anchor, of: self.webView, preferredEdge: .minY)
        }
    }

    private func showAlert(_ title: String, _ msg: String) {
        let a = NSAlert()
        a.messageText = title
        a.informativeText = msg
        a.alertStyle = .warning
        a.runModal()
    }

    func bootstrap() {
        DispatchQueue.global(qos: .userInitiated).async {
            if !self.serverReachable() {
                self.launchServer()
            }
            // eng takten, um "bereit" früh zu erwischen (bis zu 5 Min Budget)
            var tries = 0
            while !self.serverReachable() && tries < 1200 {
                Thread.sleep(forTimeInterval: 0.25)
                tries += 1
            }
            DispatchQueue.main.async {
                self.realLoadStarted = true
                self.webView.load(URLRequest(url: URL(string: URL_STRING)!))
            }
        }
    }

    func serverReachable() -> Bool {
        let sem = DispatchSemaphore(value: 0)
        var ok = false
        var req = URLRequest(url: URL(string: URL_STRING)!)
        req.httpMethod = "HEAD"
        req.timeoutInterval = 2
        URLSession.shared.dataTask(with: req) { _, resp, _ in
            if let h = resp as? HTTPURLResponse, h.statusCode < 500 { ok = true }
            sem.signal()
        }.resume()
        _ = sem.wait(timeout: .now() + 3)
        return ok
    }

    func launchServer() {
        startedServer = true
        if !FileManager.default.fileExists(atPath: LOG_FILE) {
            FileManager.default.createFile(atPath: LOG_FILE, contents: nil)
        }
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/bin/bash")
        proc.arguments = [START_SH]
        var env = ProcessInfo.processInfo.environment
        env["LOCO_NO_BROWSER"] = "1"
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + (env["PATH"] ?? "/usr/bin:/bin")
        proc.environment = env
        if let fh = FileHandle(forWritingAtPath: LOG_FILE) {
            fh.seekToEndOfFile()
            proc.standardOutput = fh
            proc.standardError = fh
        }
        try? proc.run()
    }

    // MARK: WKNavigationDelegate
    func webView(_ wv: WKWebView, didFinish navigation: WKNavigation!) {
        // Anti-Flash-Overlay einmalig wegblenden, sobald die Splash steht
        if !overlay.isHidden {
            NSAnimationContext.runAnimationGroup({ ctx in
                ctx.duration = 0.4
                overlay.animator().alphaValue = 0
            }, completionHandler: { self.overlay.isHidden = true })
        }
        if wv.url?.host == "localhost" { didLoad = true }
    }

    func webView(_ wv: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        retryLoad()
    }
    func webView(_ wv: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        retryLoad()
    }
    func retryLoad() {
        // Nur die echte Dashboard-Seite erneut versuchen (nicht die Splash)
        guard realLoadStarted && !didLoad else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.webView.load(URLRequest(url: URL(string: URL_STRING)!))
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ note: Notification) {
        guard startedServer else { return }
        let killer = Process()
        killer.executableURL = URL(fileURLWithPath: "/bin/bash")
        killer.arguments = ["-c",
            "lsof -ti tcp:\(PORT) | xargs kill 2>/dev/null; pkill -f 'next start -p \(PORT)' 2>/dev/null; true"]
        try? killer.run()
        killer.waitUntilExit()
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
