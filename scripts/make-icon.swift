// Erzeugt das Loco-Moco-App-Icon (Spiegelei auf rosa/lila Verlauf) als .icns.
// Aufruf:  swift scripts/make-icon.swift <ausgabe.icns>
// Wird von build-client.sh genutzt, falls scripts/assets/AppIcon.icns fehlt.
import AppKit
import Foundation

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "AppIcon.icns"

func png(_ size: Int) -> Data {
    let s = CGFloat(size)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
                              bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                              colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    // Abgerundetes Quadrat (macOS-Squircle-Optik) mit etwas Rand
    let inset = s * 0.085
    let rect = NSRect(x: inset, y: inset, width: s - 2 * inset, height: s - 2 * inset)
    let radius = (s - 2 * inset) * 0.225
    let clip = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    clip.addClip()

    // Verlauf rosa -> lila
    let grad = NSGradient(colors: [
        NSColor(srgbRed: 1.00, green: 0.56, blue: 0.82, alpha: 1),
        NSColor(srgbRed: 0.79, green: 0.65, blue: 1.00, alpha: 1)
    ])!
    grad.draw(in: rect, angle: -90)

    // sanfter Glanz oben
    let gloss = NSGradient(colors: [NSColor(white: 1, alpha: 0.28), NSColor(white: 1, alpha: 0)])!
    gloss.draw(in: NSRect(x: rect.minX, y: rect.midY, width: rect.width, height: rect.height / 2), angle: -90)

    // Spiegelei zentriert
    let emoji = "🍳" as NSString
    let fontSize = s * 0.52
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: fontSize)]
    let ts = emoji.size(withAttributes: attrs)
    emoji.draw(at: NSPoint(x: (s - ts.width) / 2, y: (s - ts.height) / 2 + s * 0.01), withAttributes: attrs)

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

let fm = FileManager.default
let work = NSTemporaryDirectory() + "LocoMoco.iconset"
try? fm.removeItem(atPath: work)
try! fm.createDirectory(atPath: work, withIntermediateDirectories: true)

// (Dateiname, Pixelgrösse)
let specs: [(String, Int)] = [
    ("icon_16x16.png", 16), ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32), ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128), ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256), ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512), ("icon_512x512@2x.png", 1024),
]
for (name, size) in specs {
    try! png(size).write(to: URL(fileURLWithPath: "\(work)/\(name)"))
}

// iconset -> icns
let p = Process()
p.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
p.arguments = ["-c", "icns", work, "-o", out]
try! p.run()
p.waitUntilExit()
try? fm.removeItem(atPath: work)
print("Icon: \(out)")
