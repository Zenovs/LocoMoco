import AppKit
import Foundation

let size: CGFloat = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil,
                           pixelsWide: Int(size), pixelsHigh: Int(size),
                           bitsPerSample: 8, samplesPerPixel: 4,
                           hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB,
                           bytesPerRow: 0, bitsPerPixel: 0)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext

// transparenter Hintergrund
ctx.clear(CGRect(x: 0, y: 0, width: size, height: size))

// Squircle-Fläche mit Rand (wie macOS-Icons leicht eingerückt)
let inset: CGFloat = 90
let rect = CGRect(x: inset, y: inset, width: size - 2*inset, height: size - 2*inset)
let radius: CGFloat = (size - 2*inset) * 0.2237   // Apple-Squircle-Annäherung
let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)

// Weicher Schlagschatten unter dem Squircle
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -14),
              blur: 36,
              color: NSColor(calibratedRed: 0.85, green: 0.30, blue: 0.60, alpha: 0.45).cgColor)
NSColor.white.setFill()
path.fill()
ctx.restoreGState()

// Rosa Diagonal-Verlauf als Füllung
ctx.saveGState()
path.setClip()
let gradient = NSGradient(colors: [
    NSColor(calibratedRed: 1.00, green: 0.80, blue: 0.92, alpha: 1.0), // zartrosa oben
    NSColor(calibratedRed: 1.00, green: 0.55, blue: 0.80, alpha: 1.0), // rosa
    NSColor(calibratedRed: 0.93, green: 0.40, blue: 0.78, alpha: 1.0)  // magenta unten
])!
gradient.draw(in: rect, angle: -70)

// dezenter Glanz oben (Highlight)
let glow = NSGradient(colors: [
    NSColor(calibratedWhite: 1.0, alpha: 0.40),
    NSColor(calibratedWhite: 1.0, alpha: 0.0)
])!
glow.draw(in: CGRect(x: rect.minX, y: rect.midY, width: rect.width, height: rect.height/2), angle: -90)
ctx.restoreGState()

// Hilfsfunktion zum Zeichnen von Emoji/Text
func drawEmoji(_ s: String, fontSize: CGFloat, center: CGPoint, alpha: CGFloat = 1.0) {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: fontSize),
        .paragraphStyle: style
    ]
    let str = NSAttributedString(string: s, attributes: attrs)
    let bounds = str.size()
    let origin = CGPoint(x: center.x - bounds.width/2, y: center.y - bounds.height/2)
    if alpha < 1.0 {
        NSGraphicsContext.current!.cgContext.setAlpha(alpha)
    }
    str.draw(at: origin)
    if alpha < 1.0 {
        NSGraphicsContext.current!.cgContext.setAlpha(1.0)
    }
}

// Hauptmotiv: Spiegelei (Loco-Moco-Vibe), leicht angehoben
drawEmoji("🍳", fontSize: 470, center: CGPoint(x: size/2, y: size/2 + 30))

// Girly-Akzente: Sparkles & Herzchen
drawEmoji("✨", fontSize: 150, center: CGPoint(x: size*0.74, y: size*0.74))
drawEmoji("✨", fontSize: 110, center: CGPoint(x: size*0.26, y: size*0.30), alpha: 0.95)
drawEmoji("💖", fontSize: 120, center: CGPoint(x: size*0.27, y: size*0.73))
drawEmoji("🩷", fontSize: 100, center: CGPoint(x: size*0.75, y: size*0.28), alpha: 0.95)

NSGraphicsContext.restoreGraphicsState()

let outPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "/tmp/locomoco_1024.png"
let pngData = rep.representation(using: .png, properties: [:])!
try! pngData.write(to: URL(fileURLWithPath: outPath))
print("geschrieben: \(outPath)")
