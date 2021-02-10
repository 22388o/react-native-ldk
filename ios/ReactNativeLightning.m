#import "ReactNativeLightning.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

//MARK: LND functions
@interface RCT_EXTERN_MODULE(ReactNativeLightning, NSObject)

RCT_EXTERN_METHOD(
                  walletExists: (NSString *)network
                  resolve: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  currentState: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  logFileContent: (NSString *)network
                  limit: (NSInteger)limit
                  resolve: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  start: (NSString *)configContent
                  network: (NSString *)network
                  resolve: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  genSeed: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  createWallet: (NSString *)password
                  seed: (NSArray *)seed
                  resolve: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  unlockWallet: (NSString *)password
                  resolve: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  sendCommand: (NSString *)method
                  body: (NSString *)seed
                  resolve: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  sendStreamCommand: (NSString *)method
                  streamId: (NSString *)streamId
                  body: (NSString *)body
                  )
@end

//MARK: Events
@interface RCT_EXTERN_MODULE(LightningEventEmitter, RCTEventEmitter)

RCT_EXTERN_METHOD(supportedEvents)

@end
