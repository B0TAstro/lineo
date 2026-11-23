import AVFoundation
import ExpoModulesCore

public final class ClipFramesModule: Module {
  /// One reader at a time: the replay analyses one window of one clip.
  private var reader: FrameReader?

  public func definition() -> ModuleDefinition {
    Name("ClipFrames")

    AsyncFunction("open") {
      (path: String, startS: Double, endS: Double, maxSide: Double) async throws -> [String: Int] in
      self.reader = nil
      let reader = try await FrameReader(
        url: fileURL(path), startS: startS, endS: endS, maxSide: Int(maxSide))
      self.reader = reader
      return [
        "width": reader.width, "height": reader.height,
        "videoWidth": reader.videoWidth, "videoHeight": reader.videoHeight,
      ]
    }

    AsyncFunction("next") { () throws -> ArrayBuffer in
      // An empty buffer says "no more frames": simpler to pass than an optional.
      try self.reader?.next() ?? ArrayBuffer(size: 0)
    }

    Function("time") { () -> Double in
      self.reader?.time ?? 0
    }

    Function("close") {
      self.reader = nil
    }
  }
}

private func fileURL(_ path: String) -> URL {
  path.hasPrefix("file://")
    ? (URL(string: path) ?? URL(fileURLWithPath: String(path.dropFirst(7))))
    : URL(fileURLWithPath: path)
}

private struct NoVideoTrack: Error {}

/// Reads a time window of a clip in order, frame after frame, as small upright RGB images.
private final class FrameReader {
  let width: Int
  let height: Int
  let videoWidth: Int
  let videoHeight: Int
  private(set) var time = 0.0

  private let reader: AVAssetReader
  private let output: AVAssetReaderTrackOutput
  /// Clockwise rotation the player applies to show the video upright.
  private let rotation: Int
  /// One source pixel kept out of `step`, in each direction.
  private let step: Int

  init(url: URL, startS: Double, endS: Double, maxSide: Int) async throws {
    let asset = AVURLAsset(url: url)
    guard let track = try await asset.loadTracks(withMediaType: .video).first else {
      throw NoVideoTrack()
    }
    let (naturalSize, transform) = try await track.load(.naturalSize, .preferredTransform)
    let angle = Int((atan2(transform.b, transform.a) * 180 / .pi).rounded())
    let rotation = (angle % 360 + 360) % 360
    let rawWidth = Int(naturalSize.width)
    let rawHeight = Int(naturalSize.height)
    let step = max(1, Int((Double(max(rawWidth, rawHeight)) / Double(max(1, maxSide))).rounded()))
    let quarterTurn = rotation == 90 || rotation == 270

    self.rotation = rotation
    self.step = step
    width = (quarterTurn ? rawHeight : rawWidth) / step
    height = (quarterTurn ? rawWidth : rawHeight) / step
    videoWidth = quarterTurn ? rawHeight : rawWidth
    videoHeight = quarterTurn ? rawWidth : rawHeight

    reader = try AVAssetReader(asset: asset)
    reader.timeRange = CMTimeRange(
      start: CMTime(seconds: max(0, startS), preferredTimescale: 600),
      end: CMTime(seconds: endS, preferredTimescale: 600))
    output = AVAssetReaderTrackOutput(
      track: track,
      outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    output.alwaysCopiesSampleData = false
    reader.add(output)
    guard reader.startReading() else { throw reader.error ?? CocoaError(.fileReadUnknown) }
  }

  deinit {
    reader.cancelReading()
  }

  func next() throws -> ArrayBuffer? {
    while let sample = output.copyNextSampleBuffer() {
      guard let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
      time = CMSampleBufferGetPresentationTimeStamp(sample).seconds
      return toRgb(pixels)
    }
    if reader.status == .failed { throw reader.error ?? CocoaError(.fileReadUnknown) }
    return nil
  }

  /// Picks one pixel every `step`, turns it upright and drops alpha: BGRA in, packed RGB out.
  private func toRgb(_ pixels: CVPixelBuffer) -> ArrayBuffer {
    CVPixelBufferLockBaseAddress(pixels, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }

    let frame = ArrayBuffer(size: width * height * 3, initializeToZero: false)
    guard let base = CVPixelBufferGetBaseAddress(pixels) else { return frame }
    let source = base.assumingMemoryBound(to: UInt8.self)
    let rowBytes = CVPixelBufferGetBytesPerRow(pixels)
    let sourceWidth = CVPixelBufferGetWidth(pixels)
    let sourceHeight = CVPixelBufferGetHeight(pixels)
    let quarterTurn = rotation == 90 || rotation == 270
    let rawWidth = quarterTurn ? height : width
    let rawHeight = quarterTurn ? width : height

    frame.withUnsafeMutableBytes { bytes in
      let out = bytes.bindMemory(to: UInt8.self)
      var i = 0
      for y in 0..<height {
        for x in 0..<width {
          // Where this upright pixel sits in the stored (unrotated) image.
          var rx = x
          var ry = y
          switch rotation {
          case 90: rx = y; ry = rawHeight - 1 - x
          case 180: rx = rawWidth - 1 - x; ry = rawHeight - 1 - y
          case 270: rx = rawWidth - 1 - y; ry = x
          default: break
          }
          let sx = min(rx * step, sourceWidth - 1)
          let sy = min(ry * step, sourceHeight - 1)
          let p = sy * rowBytes + sx * 4
          out[i] = source[p + 2]
          out[i + 1] = source[p + 1]
          out[i + 2] = source[p]
          i += 3
        }
      }
    }
    return frame
  }
}
