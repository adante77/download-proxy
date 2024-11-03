"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegram_1 = require("telegram");
const sessions_1 = require("telegram/sessions");
const prompts_1 = require("@inquirer/prompts");
const express_1 = __importDefault(require("express"));
const stream_1 = __importDefault(require("stream"));
const big_integer_1 = __importDefault(require("big-integer")); // Import big-integer
const apiId = 23004816;
const apiHash = "aa866178e970576b92b2c67fc9b87d7f";
const session = "1BAAOMTQ5LjE1NC4xNjcuOTEAUCbC/kTT/V4d8uX+CAFTo2SlYnlw7La9ILzHgmqz7GIw/vrPwCGKKAsQbShY1np0wEI01e5kojZ0o3mvVsBV4witE/hkK2iM6ZfyohMwiA+D/1LPU8tn+b3Vp+kSsmYmFrUvcvgMk/WjOLk2s62cOqbQpodfHU6UskWmUYo2zV/yYeu/mTGFb+Y7T0taHkpPQLc31mVdMBwuod5/5UPU6iwXf2uaWZSj8xoK8qfpGURFnX5VUH5tuvCtB3V9yzSwHhgtwi+wTY88kql0UvQ5u/npcdJbFxSWQX/P5og+6GqSmJY1ALU0+39T/WvGqkUUkLY20SQc5TVDFR4Sq/ZcQIU=";
const stringSession = new sessions_1.StringSession(session); // fill this later with the value from session.save()
const client = new telegram_1.TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield client.start({
        phoneNumber: () => __awaiter(void 0, void 0, void 0, function* () { return yield (0, prompts_1.input)({ message: "Please enter your number: " }); }),
        password: () => __awaiter(void 0, void 0, void 0, function* () { return yield (0, prompts_1.input)({ message: "Please enter your password: " }); }),
        phoneCode: () => __awaiter(void 0, void 0, void 0, function* () { return yield (0, prompts_1.input)({ message: "Please enter the code you received: " }); }),
        onError: (err) => console.log(err),
    });
    console.log("You should now be connected.");
}))();
const app = (0, express_1.default)();
const port = 3000;
app.get("/", (req, res) => {
    download(req, res);
});
// app.use(express.json({ keepAlive: true })))
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
const download = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const mes = yield client.getMessages("me", {
        limit: 1,
    });
    const result = yield client.getMessages("me", {
        ids: mes[0].id,
    });
    const media = result[0].document;
    if (media) {
        const fileSize = Number(media.size);
        let start = 0;
        let end = fileSize - 1;
        // Check for Range header
        const range = req.headers.range;
        if (range) {
            const rangeMatch = /bytes=(\d+)-(\d*)/.exec(range);
            if (rangeMatch) {
                start = parseInt(rangeMatch[1], 10);
                if (rangeMatch[2]) {
                    end = parseInt(rangeMatch[2], 10);
                }
            }
            res.status(206); // Partial content status code for range requests
        }
        const chunkSize = end - start + 1;
        // Set headers for partial content
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Length", chunkSize.toString());
        res.setHeader("Content-Disposition", `attachment; filename=${(_a = result[0].file) === null || _a === void 0 ? void 0 : _a.name}`);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Connection", "keep-alive");
        // Stream the requested byte range from Telegram
        const passStream = stream_1.default.Readable.from(client.iterDownload({
            file: new telegram_1.Api.InputDocumentFileLocation({
                id: media.id,
                accessHash: media.accessHash,
                fileReference: media.fileReference,
                thumbSize: "0",
            }),
            offset: (0, big_integer_1.default)(start),
            limit: chunkSize,
            chunkSize: 2048,
            requestSize: 2048 * 1024, // Adjust the chunk size as necessary
        }));
        console.log(`Download requested at ${new Date().toISOString()}`);
        passStream.pipe(res);
    }
    else {
        res.status(404).send("File not found");
    }
});
