import express from "express";
import { bucket } from "../config/firebaseAdminConfig.js";

const downLoadRoute = express.Router();

downLoadRoute.get("/download-audio", async (req, res) => {
  const { ref } = req.query;

  if (!ref) {
    return res
      .status(400)
      .json({ success: false, message: "No audio reference provided" });
  }

  try {
    const file = bucket.file(ref);
    const [exists] = await file.exists();

    if (!exists) {
      return res
        .status(404)
        .json({ success: false, message: "Audio file not found" });
    }

    res.setHeader("Content-Type", "audio/mp3");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(ref.split("/").pop())}"`
    );

    const stream = file.createReadStream();

    stream.on("error", (error) => {
      console.error("Error on audio file stream:", error);
      res
        .status(500)
        .json({ success: false, message: "Error streaming the audio file" });
    });

    stream.pipe(res);
  } catch (error) {
    console.error("Error downloading audio file:", error);
    res
      .status(500)
      .json({ success: false, message: "Error processing your request" });
  }
});

export default downLoadRoute;
