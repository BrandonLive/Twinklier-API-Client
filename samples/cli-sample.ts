// Twinklier API client basic CLI sample app
// This sample app demonstrates the basics of using twinklier-api-client

import * as Twinklier from "../twinklier-api-client";
import * as readline from "readline"
import axios from "axios"

// Defaults which can be changed via the command line
let appConfig = {
    // IP address or hostname to connect to
    // You can retrieve this from the Twinkly app for each connected device
    host: "192.168.1.160",
    ledCount: 600,
    proxyConfig: { host: "127.0.0.1", port: 8888 },
    useProxy: false
};

const commandMap = {
    "connect": {
        handler: connect,
        helpText: `Connects to the specified IP/hostname, or the default (${appConfig.host}) if none is specified`,
    },
    "disconnect": {
        handler: disconnect,
        helpText: `Abandons the current session`,
    },
    "set-mode": {
        handler: setMode,
        helpText: `Sets the controller to the specified mode. Valid modes are "off", "movie", "realtime", and "demo".`,
    },
    "help": {
        handler: displayHelp,
        helpText: "Lists supported commands.",
    },
    "send-demo": {
        handler: sendDemo,
        helpText: "Sends a pre-programmed demo sequence to the connected Twinkly controller.",
    },
    "enable-proxy": {
        handler: enableProxy,
        helpText: `Enables usage of a proxy server (e.g. Fiddler), using the proxy configuration specified in cli-sample.ts (Host: ${appConfig.proxyConfig.host} Port: ${appConfig.proxyConfig.port}).`,
    },
    "exit": {
        handler: exit,
        helpText: "Exits this sample app",
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'TWINKLIER> '
});

rl.prompt();

rl.on("line", async (line : string) => {
    let commandName = line.split(" ")[0];
    let command = commandMap[commandName];
    let commandHandler = command && command.handler;
    let commandResult = null;
    if (commandHandler) {
        let parameters = [ null ];
        if (line.length > (commandName.length + 1)) {
            parameters = line.substr(commandName.length + 1).split(" ");
        }

        // Support only single parameters for now
        commandResult = commandHandler(parameters[0]);
    }
    else {
        console.log("Unknown command");
    }

    if (commandResult && commandResult.then) {
        await commandResult;
    }

    rl.prompt();
}).on("close", () => {
    process.exit(0);
});

function exit() {
    process.exit(0);
}

let session: Twinklier.TwinklySession = null;
if (appConfig.useProxy) {
    enableProxy();
}

function connect(host) {
    if (!host) {
        host = appConfig.host;
    }
    console.log(`Connecting to Twinkly device at ${host}`)
    return Twinklier.TwinklySession.connectToHost(host).then(async s => {
        console.log("Connected!");
        session = s;
    }).catch(error => {
        debugger;
        console.log(`An error occured. Message: ${error || error.message} `);
    });
}

function disconnect() {
    if (!ensureSession()) {
        return false;
    }

    session = null;
}

// For testing/debugging with a local proxy such as Fiddler
function enableProxy() {
    axios.defaults.proxy = appConfig.proxyConfig;
}

function ensureSession() {
    let hasSession = !!session;
    if (!hasSession) {
        console.log("This command requires an active session. Use the \"connect\" command to begin one.");
    }
    return hasSession;
}

function setMode(mode : string) {
    if (!ensureSession()) {
        return false;
    }

    mode = mode.toLowerCase();
    let validModes = Object.keys(Twinklier.DeviceMode);
    let selectedMode = validModes.find(m => m.toLowerCase() == mode);
    if (selectedMode === undefined) {
        console.log("Unsupport mode.");
        return false;
    }

    session.setModeAsync(Twinklier.DeviceMode[selectedMode]);
}

function displayHelp() {
    Object.keys(commandMap).forEach(commandKey => {
        console.log(`${commandKey.padEnd(12, " ")} - ${commandMap[commandKey].helpText}`);
    });
}

async function sendDemo() {
    if (!ensureSession()) {
        return false;
    }

    console.log("Setting mode to off...");
    session.setModeAsync(Twinklier.DeviceMode.Off);

    console.log("Creating new movie");
    let movie = new Twinklier.Movie(appConfig.ledCount, 500);
    let redFrame = new Twinklier.MovieFrame(appConfig.ledCount);
    redFrame.fill({ r: 255, g: 0, b: 0 });

    redFrame.pixels[0].r = 0;
    redFrame.pixels[0].b = 255;

    let secondStrandStart = appConfig.ledCount / 2;

    redFrame.pixels[secondStrandStart].r = 0;
    redFrame.pixels[secondStrandStart].b = 255;

    movie.frames.push(redFrame);

    let greenFrame = new Twinklier.MovieFrame(appConfig.ledCount);
    greenFrame.fill({ r: 0, g: 255, b: 0 });
    movie.frames.push(greenFrame);

    console.log("Uploading movie ...");
    await session.uploadMovie(movie);

    console.log("Setting mode to movie...");
    await session.setModeAsync(Twinklier.DeviceMode.Movie);
    console.log("Exiting");
}


