// Loco Moco — native macOS-Hülle um den lokalen Next.js-Server.
// Startet den Server still im Hintergrund (scripts/start.sh, ohne Browser) und
// zeigt das Dashboard in einem eigenen WKWebView-Fenster. Beim Beenden wird der
// Server gestoppt.  Build:  swiftc -O -framework Cocoa -framework WebKit ...
import Cocoa
import WebKit

let PORT = 4577
let HOME = FileManager.default.homeDirectoryForCurrentUser.path
let START_SH = "\(HOME)/.loco-moco/app/scripts/start.sh"
let LOG_FILE = "\(HOME)/.loco-moco/app.log"
let URL_STRING = "http://localhost:\(PORT)/"

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var overlay: NSView!
    var statusLabel: NSTextField!
    var startedServer = false
    var didLoad = false

    func applicationDidFinishLaunching(_ note: Notification) {
        setupMenu()

        let frame = NSRect(x: 0, y: 0, width: 1180, height: 800)
        window = NSWindow(contentRect: frame,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Loco Moco"
        window.minSize = NSSize(width: 720, height: 560)
        window.setFrameAutosaveName("LocoMocoWindow")
        window.center()

        let container = NSView(frame: frame)
        container.autoresizingMask = [.width, .height]

        webView = WKWebView(frame: frame, configuration: WKWebViewConfiguration())
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        container.addSubview(webView)

        // Rosa Lade-Overlay (girly), bis das Dashboard bereit ist
        overlay = NSView(frame: frame)
        overlay.wantsLayer = true
        overlay.layer?.backgroundColor = NSColor(calibratedRed: 1.0, green: 0.78, blue: 0.90, alpha: 1).cgColor
        overlay.autoresizingMask = [.width, .height]

        let egg = NSTextField(labelWithString: "🍳")
        egg.font = NSFont.systemFont(ofSize: 88)
        egg.alignment = .center
        egg.frame = NSRect(x: 0, y: frame.height/2 + 10, width: frame.width, height: 110)
        egg.autoresizingMask = [.width, .minYMargin, .maxYMargin]
        overlay.addSubview(egg)

        statusLabel = NSTextField(labelWithString: "Loco Moco startet…")
        statusLabel.font = NSFont.systemFont(ofSize: 20, weight: .semibold)
        statusLabel.textColor = NSColor(calibratedRed: 0.55, green: 0.10, blue: 0.35, alpha: 1)
        statusLabel.alignment = .center
        statusLabel.frame = NSRect(x: 0, y: frame.height/2 - 36, width: frame.width, height: 30)
        statusLabel.autoresizingMask = [.width, .minYMargin, .maxYMargin]
        overlay.addSubview(statusLabel)
        container.addSubview(overlay)

        window.contentView = container
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

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

    func bootstrap() {
        DispatchQueue.global(qos: .userInitiated).async {
            if !self.serverReachable() {
                self.launchServer()
            }
            // bis zu 5 Min warten (erster Start baut evtl. neu)
            var tries = 0
            while !self.serverReachable() && tries < 600 {
                Thread.sleep(forTimeInterval: 0.5)
                tries += 1
                if tries == 8 {
                    DispatchQueue.main.async { self.statusLabel.stringValue = "Server wird gestartet…" }
                }
            }
            DispatchQueue.main.async {
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
        didLoad = true
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.4
            overlay.animator().alphaValue = 0
        } completionHandler: {
            self.overlay.isHidden = true
        }
    }

    func webView(_ wv: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        retryLoad()
    }
    func webView(_ wv: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        retryLoad()
    }
    func retryLoad() {
        guard !didLoad else { return }
        statusLabel.stringValue = "Noch nicht bereit – neuer Versuch…"
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
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
