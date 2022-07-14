//
//  LdkLogger.swift
//  react-native-ldk
//
//  Created by Jason van den Berg on 2022/05/10.
//

import Foundation
import LDKFramework

class LdkLogger: Logger {
    var activeLevels: [UInt32: Bool] = [:]
    
    override func free() {
        //TODO find out what this is for
    }
  
    override func log(record: Record) {
        let level = record.get_level().rawValue
        
        //Only when the JS code has set the log level to active
        if activeLevels[level] == true {
            LdkEventEmitter.shared.send(withEvent: .ldk_log, body: record.get_args())
            Logfile.log.write(record.get_args())
        }
        
    }
    
    func setLevel(level: UInt32, active: Bool) {
        self.activeLevels[level] = active
        LdkEventEmitter.shared.send(withEvent: .native_log, body: "Log level \(level) set to \(active)")
    }
}

class Logfile: TextOutputStream {
    lazy var logfile: URL = {
        //Each session has it's own log file
        let f = DateFormatter()
        f.dateFormat = "d-M-y-HH-mm-ss"

        let log = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("ldk-\(f.string(from: Date())).txt")
        print("Log path: \(log.path)")

        return log
    }()
    
    func write(_ str: String) {
        let line = "\(str)\n"
        
        if let handle = try? FileHandle(forWritingTo: logfile) {
            handle.seekToEndOfFile()
            handle.write(line.data(using: .utf8)!)
            handle.closeFile()
        } else {
            try? line.data(using: .utf8)?.write(to: logfile)
        }
    }
    static var log = Logfile()
    private init() {}
}
