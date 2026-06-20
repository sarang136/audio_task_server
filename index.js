const express = require("express");
const dotenv = require("dotenv").config();
const audio = require("./models/audios.js");
const { default: mongoose } = require("mongoose");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

console.log(process.env.PORT);

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("COnnected");
  } catch (error) {
    console.log("Error", error);
  }
};

app.use(express.json());
app.use(cors());

app.get("/stream/:id", async (req, res) => {
  console.log("Here");

  const audioDoc = await audio.findById(req.params.id);
  const audioUrl = audioDoc.link; // remote URL

  const range = req.headers.range || "bytes=0-";

  // forward range request to actual audio source
  const audioResponse = await fetch(audioUrl, {
    headers: { Range: range },
  });

  const contentRange = audioResponse.headers.get("content-range");
  const contentLength = audioResponse.headers.get("content-length");
  const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";

  res.writeHead(206, {
    "Content-Range": contentRange,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": contentType,
  });

  audioResponse.body.pipe(res);
});

app.get("/get", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const audios = await audio.find();

  for (const doc of audios) {
    res.write(`data: ${JSON.stringify(doc)}\n\n`); // send one doc at a time
    await new Promise((resolve) => setTimeout(resolve, 100)); // small delay
  }

  res.end();
});

app.get("/stream/:id", async (req, res) => {
  try {
    const audioDoc = await audio.findById(req.params.id);
    if (!audioDoc) return res.status(404).json({ error: "Not found" });

    const { Readable } = require("stream");

    const audioResponse = await fetch(audioDoc.link, {
      headers: { Range: req.headers.range || "bytes=0-" },
    });

    res.writeHead(206, {
      "Content-Range": audioResponse.headers.get("content-range"),
      "Accept-Ranges": "bytes", // ← this shows play button
      "Content-Length": audioResponse.headers.get("content-length"),
      "Content-Type": "audio/mpeg",
      "Access-Control-Allow-Origin": "*", // ← this fixes CORS
    });

    Readable.fromWeb(audioResponse.body).pipe(res);
  } catch (error) {
    console.log("Stream error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/post/audio", async (req, res) => {
  const { link } = req.body;
  await audio.create({
    link,
  });
  return res.status(200).json({
    mess: "CReated",
  });
});

connect()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log("Server running");
    });
  })
  .catch((err) => console.log(err));
