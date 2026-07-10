#import <Cocoa/Cocoa.h>
#import <signal.h>

@interface Codex56StatusDelegate : NSObject <NSApplicationDelegate>
@property(nonatomic, copy) NSString *nodePath;
@property(nonatomic, copy) NSString *codexfastPath;
@property(nonatomic, copy) NSString *stateDirectory;
@property(nonatomic, copy) NSString *logPath;
@property(nonatomic, copy) NSString *pidPath;
@property(nonatomic, copy) NSString *readyPath;
@property(nonatomic, copy) NSString *failurePath;
@property(nonatomic, strong) NSStatusItem *statusItem;
@property(nonatomic, strong) NSMenuItem *statusMenuItem;
@property(nonatomic, strong) NSTask *codexfastTask;
@property(nonatomic, strong) NSPipe *outputPipe;
@property(nonatomic, strong) NSFileHandle *logHandle;
@property(nonatomic, strong) NSMutableString *outputBuffer;
@property(nonatomic) BOOL ready;
@property(nonatomic) BOOL stopping;
@end

@implementation Codex56StatusDelegate

- (instancetype)initWithNodePath:(NSString *)nodePath
                    codexfastPath:(NSString *)codexfastPath
                   stateDirectory:(NSString *)stateDirectory {
    self = [super init];
    if (self) {
        _nodePath = [nodePath copy];
        _codexfastPath = [codexfastPath copy];
        _stateDirectory = [stateDirectory copy];
        _logPath = [stateDirectory stringByAppendingPathComponent:@"codexfast.log"];
        _pidPath = [stateDirectory stringByAppendingPathComponent:@"status-helper.pid"];
        _readyPath = [stateDirectory stringByAppendingPathComponent:@"ready"];
        _failurePath = [stateDirectory stringByAppendingPathComponent:@"failure"];
        _outputBuffer = [NSMutableString string];
    }
    return self;
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
    [self prepareState];
    [self configureMenuBar];
    [self launchCodexfast];
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    self.outputPipe.fileHandleForReading.readabilityHandler = nil;
    [self.logHandle closeFile];
    [[NSFileManager defaultManager] removeItemAtPath:self.pidPath error:nil];
    [[NSFileManager defaultManager] removeItemAtPath:self.readyPath error:nil];
}

- (void)prepareState {
    NSFileManager *manager = [NSFileManager defaultManager];
    [manager createDirectoryAtPath:self.stateDirectory
       withIntermediateDirectories:YES
                        attributes:nil
                             error:nil];
    [manager removeItemAtPath:self.readyPath error:nil];
    [manager removeItemAtPath:self.failurePath error:nil];
    [manager createFileAtPath:self.logPath contents:nil attributes:nil];
    self.logHandle = [NSFileHandle fileHandleForWritingAtPath:self.logPath];
    [self.logHandle truncateFileAtOffset:0];

    NSString *pid = [NSString stringWithFormat:@"%d\n", NSProcessInfo.processInfo.processIdentifier];
    [pid writeToFile:self.pidPath atomically:YES encoding:NSUTF8StringEncoding error:nil];
    [self appendText:@"AICodeMirror Codex 5.6 menu-bar helper started.\n"];
}

- (void)configureMenuBar {
    self.statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];
    self.statusItem.button.title = @"5.6";
    self.statusItem.button.toolTip = @"AICodeMirror Codex 5.6";

    NSMenu *menu = [[NSMenu alloc] init];
    self.statusMenuItem = [[NSMenuItem alloc] initWithTitle:@"状态：正在注入..."
                                                    action:nil
                                             keyEquivalent:@""];
    self.statusMenuItem.enabled = NO;
    [menu addItem:self.statusMenuItem];
    [menu addItem:[NSMenuItem separatorItem]];

    NSMenuItem *logItem = [[NSMenuItem alloc] initWithTitle:@"查看运行日志"
                                                     action:@selector(openLog:)
                                              keyEquivalent:@""];
    logItem.target = self;
    [menu addItem:logItem];

    NSMenuItem *stopItem = [[NSMenuItem alloc] initWithTitle:@"关闭注入并退出 Codex"
                                                      action:@selector(stopInjection:)
                                               keyEquivalent:@"q"];
    stopItem.target = self;
    [menu addItem:stopItem];
    self.statusItem.menu = menu;
}

- (void)launchCodexfast {
    NSTask *task = [[NSTask alloc] init];
    NSPipe *pipe = [NSPipe pipe];
    task.executableURL = [NSURL fileURLWithPath:self.nodePath];
    task.arguments = @[self.codexfastPath, @"launch"];
    task.currentDirectoryURL = [NSFileManager defaultManager].homeDirectoryForCurrentUser;
    task.standardOutput = pipe;
    task.standardError = pipe;
    task.environment = NSProcessInfo.processInfo.environment;

    __weak typeof(self) weakSelf = self;
    pipe.fileHandleForReading.readabilityHandler = ^(NSFileHandle *handle) {
        NSData *data = handle.availableData;
        if (data.length == 0) {
            return;
        }
        [weakSelf consumeOutput:data];
    };

    task.terminationHandler = ^(NSTask *terminatedTask) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [weakSelf handleTaskExit:terminatedTask.terminationStatus];
        });
    };

    self.codexfastTask = task;
    self.outputPipe = pipe;

    NSError *error = nil;
    if (![task launchAndReturnError:&error]) {
        [self reportFailure:[NSString stringWithFormat:@"无法启动 codexfast：%@", error.localizedDescription]];
        return;
    }
    [self appendText:[NSString stringWithFormat:@"codexfast process started with pid %d.\n", task.processIdentifier]];
}

- (void)consumeOutput:(NSData *)data {
    [self appendData:data];
    NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (!text) {
        return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        [self.outputBuffer appendString:text];
        if (self.outputBuffer.length > 32000) {
            [self.outputBuffer deleteCharactersInRange:NSMakeRange(0, self.outputBuffer.length - 32000)];
        }
        if (!self.ready && [self.outputBuffer containsString:@"Runtime launch completed."]) {
            [self markReady];
        }
    });
}

- (void)markReady {
    if (self.ready) {
        return;
    }
    self.ready = YES;
    self.statusMenuItem.title = @"状态：Codex 5.6 已注入";
    self.statusItem.button.title = @"5.6 ✓";
    self.statusItem.button.toolTip = @"Codex 5.6 已注入";
    [@"ready\n" writeToFile:self.readyPath atomically:YES encoding:NSUTF8StringEncoding error:nil];
    [self appendText:@"Codex 5.6 injection is ready.\n"];
}

- (void)reportFailure:(NSString *)message {
    self.statusMenuItem.title = @"状态：注入失败";
    self.statusItem.button.title = @"5.6 !";
    NSString *failure = [message stringByAppendingString:@"\n"];
    [failure writeToFile:self.failurePath atomically:YES encoding:NSUTF8StringEncoding error:nil];
    [self appendText:[NSString stringWithFormat:@"ERROR: %@\n", message]];
}

- (void)handleTaskExit:(int)status {
    if (self.stopping) {
        [self completeShutdown];
        return;
    }
    if (self.ready) {
        [self appendText:[NSString stringWithFormat:@"codexfast exited with status %d.\n", status]];
        [NSApp terminate:nil];
        return;
    }

    NSArray<NSString *> *lines = [self.outputBuffer componentsSeparatedByString:@"\n"];
    NSUInteger start = lines.count > 12 ? lines.count - 12 : 0;
    NSString *details = [[lines subarrayWithRange:NSMakeRange(start, lines.count - start)] componentsJoinedByString:@"\n"];
    if (details.length == 0) {
        details = [NSString stringWithFormat:@"codexfast 在注入完成前退出，状态码：%d", status];
    }
    [self reportFailure:details];
}

- (void)appendText:(NSString *)text {
    NSData *data = [text dataUsingEncoding:NSUTF8StringEncoding];
    [self appendData:data];
}

- (void)appendData:(NSData *)data {
    @synchronized (self) {
        [self.logHandle seekToEndOfFile];
        [self.logHandle writeData:data];
    }
}

- (void)openLog:(id)sender {
    [[NSWorkspace sharedWorkspace] openURL:[NSURL fileURLWithPath:self.logPath]];
}

- (void)stopInjection:(id)sender {
    if (self.stopping) {
        return;
    }
    self.stopping = YES;
    self.statusMenuItem.title = @"状态：正在关闭...";
    [self appendText:@"Stopping injection and Codex.\n"];
    [self.codexfastTask terminate];
    [self terminateCodexApplications:NO];

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        if (self.codexfastTask.running) {
            kill(self.codexfastTask.processIdentifier, SIGKILL);
        }
        [self terminateCodexApplications:YES];
        [self completeShutdown];
    });
}

- (void)terminateCodexApplications:(BOOL)force {
    for (NSRunningApplication *application in NSWorkspace.sharedWorkspace.runningApplications) {
        NSString *identifier = application.bundleIdentifier ?: @"";
        NSString *name = application.localizedName ?: @"";
        BOOL isCodex = [identifier isEqualToString:@"com.openai.codex"] ||
            [name isEqualToString:@"ChatGPT"] ||
            [name isEqualToString:@"Codex"];
        if (!isCodex) {
            continue;
        }
        if (force) {
            [application forceTerminate];
        } else {
            [application terminate];
        }
    }
}

- (void)completeShutdown {
    [[NSFileManager defaultManager] removeItemAtPath:self.readyPath error:nil];
    [[NSFileManager defaultManager] removeItemAtPath:self.pidPath error:nil];
    [NSApp terminate:nil];
}

@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 4) {
            fprintf(stderr, "Usage: Codex56Status <node> <codexfast> <state-directory>\n");
            return 64;
        }

        NSApplication *application = [NSApplication sharedApplication];
        Codex56StatusDelegate *delegate = [[Codex56StatusDelegate alloc]
            initWithNodePath:[NSString stringWithUTF8String:argv[1]]
            codexfastPath:[NSString stringWithUTF8String:argv[2]]
            stateDirectory:[NSString stringWithUTF8String:argv[3]]];
        application.delegate = delegate;
        [application run];
    }
    return 0;
}
