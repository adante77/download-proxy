import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { input } from "@inquirer/prompts";
import express, { Request, Response } from "express";
import stream from "stream";
import bigInt from "big-integer"; // Import big-integer

const apiId = 23004816;
const apiHash = "aa866178e970576b92b2c67fc9b87d7f";
const session =
  "1BAAOMTQ5LjE1NC4xNjcuOTEAUCbC/kTT/V4d8uX+CAFTo2SlYnlw7La9ILzHgmqz7GIw/vrPwCGKKAsQbShY1np0wEI01e5kojZ0o3mvVsBV4witE/hkK2iM6ZfyohMwiA+D/1LPU8tn+b3Vp+kSsmYmFrUvcvgMk/WjOLk2s62cOqbQpodfHU6UskWmUYo2zV/yYeu/mTGFb+Y7T0taHkpPQLc31mVdMBwuod5/5UPU6iwXf2uaWZSj8xoK8qfpGURFnX5VUH5tuvCtB3V9yzSwHhgtwi+wTY88kql0UvQ5u/npcdJbFxSWQX/P5og+6GqSmJY1ALU0+39T/WvGqkUUkLY20SQc5TVDFR4Sq/ZcQIU=";
const stringSession = new StringSession(session); // fill this later with the value from session.save()

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});
(async () => {
  await client.start({
    phoneNumber: async () =>
      await input({ message: "Please enter your number: " }),
    password: async () =>
      await input({ message: "Please enter your password: " }),
    phoneCode: async () =>
      await input({ message: "Please enter the code you received: " }),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
})();

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  download(req, res);
});

// app.use(express.json({ keepAlive: true })))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const download = async (req: Request, res: Response) => {
  const mes = await client.getMessages("me", {
    limit: 1,
  });

  const result = await client.getMessages("me", {
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${result[0].file?.name}`
    );
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Connection", "keep-alive");

    // Stream the requested byte range from Telegram
    const passStream = stream.Readable.from(
      client.iterDownload({
        file: new Api.InputDocumentFileLocation({
          id: media.id,
          accessHash: media.accessHash,
          fileReference: media.fileReference,
          thumbSize: "0",
        }),
        offset: bigInt(start),
        limit: chunkSize,
        chunkSize: 2048,
        requestSize: 2048 * 1024, // Adjust the chunk size as necessary
      })
    );
    console.log(`Download requested at ${new Date().toISOString()}`);
    passStream.pipe(res);
  } else {
    res.status(404).send("File not found");
  }
};
