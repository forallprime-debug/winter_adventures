import Foundation
import AVFoundation
@main struct Prepare {
 static func main() async throws {
 let entries = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath:"tracks.json"))) as! [[String:Any]]
 for entry in entries where entry["source"] != nil {
 let id=entry["id"] as! String, source=entry["source"] as! String, out=entry["audio"] as! String
 let asset=AVURLAsset(url:URL(fileURLWithPath:source))
 let output=URL(fileURLWithPath:out)
 if FileManager.default.fileExists(atPath:out){try FileManager.default.removeItem(at:output)}
 guard let session=AVAssetExportSession(asset:asset,presetName:AVAssetExportPresetAppleM4A) else {fatalError("Export unavailable")}
 session.outputURL=output;session.outputFileType = .m4a;session.shouldOptimizeForNetworkUse=true
 session.timeRange=CMTimeRange(start:.zero,duration:CMTime(seconds:90,preferredTimescale:44100))
 await session.export()
 guard session.status == .completed else {throw session.error!}
 let prepared=AVURLAsset(url:output),reader=try AVAssetReader(asset:prepared)
 let track=try await prepared.loadTracks(withMediaType:.audio).first!
 let pcm=AVAssetReaderTrackOutput(track:track,outputSettings:[AVFormatIDKey:kAudioFormatLinearPCM,AVSampleRateKey:44100,AVNumberOfChannelsKey:2,AVLinearPCMBitDepthKey:16,AVLinearPCMIsFloatKey:false,AVLinearPCMIsBigEndianKey:false,AVLinearPCMIsNonInterleaved:false])
 reader.add(pcm);reader.startReading();var bytes=Data()
 while let buffer=pcm.copyNextSampleBuffer(){if let block=CMSampleBufferGetDataBuffer(buffer){let count=CMBlockBufferGetDataLength(block);var chunk=Data(count:count);chunk.withUnsafeMutableBytes{_ = CMBlockBufferCopyDataBytes(block,atOffset:0,dataLength:count,destination:$0.baseAddress!)};bytes.append(chunk)}}
 guard reader.status == .completed else {throw reader.error!}
 try bytes.write(to:URL(fileURLWithPath:"/tmp/\(id)-pcm.raw"))
 print("\(id): \(bytes.count) PCM bytes, exported \(out)")
 }
 }
}
