import express from "express";
import { bucket } from "../config/firebaseAdminConfig.js";
import { addDataToFirestore } from "../services/firestoreService.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const submitFormRoute = express.Router();

submitFormRoute.post(
  "/submit-form",
  upload.single("audio"),
  async (req, res) => {
    console.log("Received formData:", req.body.formData);
    console.log("Received file:", req.file);
    try {
      const formData = JSON.parse(req.body.formData);
      let audioRefPath = "";

      if (req.file) {
        const fileName = `audios/${new Date().getTime()}.mp3`;
        const audioRef = bucket.file(fileName);
        const stream = audioRef.createWriteStream({
          metadata: {
            contentType: "audio/mp3",
          },
        });

        stream.on("error", (error) => {
          console.error("Error uploading file to Storage:", error);
          res.status(500).send({
            success: false,
            message: "Error uploading file to Storage",
          });
        });

        stream.on("finish", async () => {
          audioRefPath = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          const timestampField = "createdAt"; // Nombre del campo de la marca de tiempo
          await addDataToFirestore(
            "usuarios",
            new Date().getTime().toString(),
            {
              ...formData,
              audioRef: audioRefPath,
              [timestampField]: new Date(), // Agregar campo de marca de tiempo con la fecha y hora actual
            }
          );
          res.status(201).send({
            success: true,
            message: "Data and audio uploaded successfully",
          });
        });

        stream.end(req.file.buffer);
      } else {
        res
          .status(400)
          .send({ success: false, message: "No audio file provided" });
      }
    } catch (error) {
      console.error("Error submitting form data:", error);
      res
        .status(500)
        .send({ success: false, message: "Error processing your request" });
    }
  }
);

export default submitFormRoute;
