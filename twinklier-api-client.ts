import * as crypto from "crypto";
import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { URLSearchParams } from "url";

export enum DeviceMode {
    Off = "off",
    Movie = "movie",
    Demo = "demo",
    RealTime = "rt"
}

export class TwinklySession {
    private readonly hostname: string;
    private readonly baseUrl: string;
    private authToken: string;
    private authExpiration: number;

    private constructor(hostname: string) {
        this.hostname = hostname;
        this.baseUrl = `http://${hostname}/xled/v1`;
        this.authToken = null;
        this.authExpiration = null;
    }

    private async connectAsync(): Promise<any> {
        let challenge = crypto.randomBytes(32).toString("base64");

        let response = null;
        try {
            response = await axios.post(`${this.baseUrl}/login`, { challenge });
        }
        catch (ex) {
            console.log(`Login to ${this.baseUrl} failed. Error message: ${ex || ex.message}`)
            throw ex;
        }

        if (!response.data || !response.data.authentication_token) {
            debugger;
            throw new Error("Login response did not included expected data.");
        }

        this.authToken = response.data.authentication_token;
        this.authExpiration = (new Date().getTime() + response.data.authentication_token_expires_in * 1000) - 10000;
               
        return this.postAsync("verify");
    }

    private requestAsync(method: Method, path: string, data?: any, type?: string) : Promise<AxiosResponse> {
        let config: AxiosRequestConfig = {
            url: `${this.baseUrl}/${path}`,
            method: method,
            data: data,
            headers: {
                "X-Auth-Token": this.authToken,
                "Content-Type": type || "application/json"
            }
        };
        return axios(config);
    }

    private postAsync(path: string, data?: any, type?: string): Promise<AxiosResponse> {
        return this.requestAsync("POST", path, data, type);
    }

    private fetchAsync(path: string): Promise<AxiosResponse> {
        return this.requestAsync("GET", path);
    }

    static connectToHost(hostname: string) : Promise<TwinklySession> {
        let session = new TwinklySession(hostname);
        return session.connectAsync().then(() => { return session; });
    }

    setModeAsync(mode: DeviceMode): Promise<any> {
        return this.postAsync("led/mode", { mode });
    }

    async uploadMovie(movie: Movie) {
        await this.setModeAsync(DeviceMode.Off);
        await this.postAsync("led/movie/full", movie.getMovieBuffer(), "application/octet-stream");
        return this.postAsync("led/movie/config", {
            leds_number: movie.ledCount,
            frames_number: movie.frames.length,
            frame_delay: movie.frameDelay
        });
    }
}

export interface MoviePixel {
    r: number;
    g: number;
    b: number;
}

export class MovieFrame {
    ledCount: number;
    private _pixels : Array<MoviePixel>;

    constructor(ledCount: number) {
        this.ledCount = ledCount;
        this._pixels = new Array<MoviePixel>(this.ledCount);
        this.fill({ r: 0, b: 0, g: 0 });
    }

    get pixels() : Array<MoviePixel> {
        return this._pixels;
    }

    fill(color: MoviePixel) {
        for (let i = 0; i < this._pixels.length; i++) {
            this._pixels[i] = { ...color };
        }
    }

    getUint8Buffer(): Uint8Array {
        let buffer = new Uint8Array(this.pixels.length * 3);
        for (let i = 0, bufferIndex = 0; i < this.pixels.length; i++) {
            const pixel = this.pixels[i];
            buffer[bufferIndex++] = pixel.r;
            buffer[bufferIndex++] = pixel.g;
            buffer[bufferIndex++] = pixel.b;
        }
        return buffer;
    }
}

export class Movie {
    frameDelay: number;
    ledCount: number;
    frames: Array<MovieFrame>;

    constructor(ledCount: number, frameDelay: number, frames?: Array<MovieFrame>) {
        this.ledCount = ledCount;
        this.frameDelay = frameDelay;
        this.frames = frames || new Array<MovieFrame>();
    }

    getMovieBuffer(): Uint8Array {
        const pixelsPerFrame = this.ledCount * 3;
        let buffer = new Uint8Array(pixelsPerFrame * this.frames.length);
        for (let i = 0; i < this.frames.length; i++) {
            buffer.set(this.frames[i].getUint8Buffer(), i * pixelsPerFrame);
        }
        return buffer;
    }
}