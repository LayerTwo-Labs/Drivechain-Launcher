# File Descriptor Limit Manager

This module provides a way to increase file descriptor limits for the Drivechain Launcher application.

## Platform Support

- **macOS**: Uses a native addon to directly call `setrlimit()` syscall for reliable limit increase
- **Linux**: Uses `prlimit` command to increase limits for the current process
- **Windows**: No special handling needed

## Building the Native Module

The native module is only used on macOS. To build it:

1. Ensure you have node-gyp requirements installed:
   - Xcode Command Line Tools
   - Python

2. Navigate to this directory and run:

```bash
cd public/modules
npm install
```

This will automatically build the native module if possible. If building fails, the application will 
fall back to a shell-based approach which may not be as reliable.

## Using in Code

The module is automatically used by the application to increase file descriptor limits. 