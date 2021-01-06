# Twinklier-API-Client

## API

## Samples
connect      - Connects to the specified IP/hostname, or the default (in cli-sample.ts) if none is specified
disconnect   - Abandons the current session
set-mode     - Sets the controller to the specified mode. Valid modes are "off", "movie", "realtime", and "demo".
help         - Lists supported commands.
send-demo    - Sends a pre-programmed demo sequence to the connected Twinkly controller.
enable-proxy - Enables usage of a proxy server (e.g. Fiddler), using the proxy configuration specified in cli-sample.ts (Host: 127.0.0.1 Port: 8888).
exit         - Exits this sample app

## Basics
- Lights are numbered started from the controller and incrementing outword. Most (all?) sets have two strands which begin at the controller. Index 0 is the first light on one strand. For a 600 light set, index 300 is the first on the second strand.

TODO: This
