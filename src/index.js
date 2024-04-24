import express from "express";
import multer from "multer";
import cors from "cors";
import { parse } from "json2csv";
import { db, bucket } from "./config/firebaseAdminConfig.js";
import {
  addDataToFirestore,
  getDataFromFirestore,
} from "./services/firestoreService.js";

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Endpoint para descargar la base en .csv
app.get("/export-users-csv", async (req, res) => {
  try {
    const snapshot = await db.collection("usuarios").get();
    const users = snapshot.docs.map((doc) => doc.data());

    // Especifica los campos que quieres incluir en el CSV
    const fields = [
      "nombre",
      "apellido",
      "tipodocumento",
      "numerodocumento",
      "email",
      "telefono",
      "nombredestino",
      "apellidodestino",
      "pais",
      "departamento",
      "ciudad",
      "direccion",
      "audioRef",
    ];
    const csv = parse(users, { fields });

    // Configura los headers para descargar el archivo
    res.header("Content-Type", "text/csv");
    res.attachment("usuarios.csv");
    res.send(csv);
  } catch (error) {
    console.error("Error exporting users to CSV:", error);
    res.status(500).send({ error: "Failed to export data" });
  }
});

// Endpoint para filtrar usuarios en el servidor
app.get("/filter-users", async (req, res) => {
  const { field, value } = req.query;

  if (!field || !value) {
    return res
      .status(400)
      .send({ success: false, message: "Invalid query parameters" });
  }

  try {
    const usersRef = db.collection("usuarios");
    const snapshot = await usersRef.where(field, "==", value).get();
    if (snapshot.empty) {
      return res
        .status(404)
        .send({ success: false, message: "No matching users found" });
    }

    let users = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).send({ success: true, users: users });
  } catch (error) {
    console.error("Error filtering users:", error);
    res
      .status(500)
      .send({ success: false, message: "Error processing your request" });
  }
});

// Endpoint para descargar el audio desde el front
app.get("/download-audio", async (req, res) => {
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

// Endpoint para cargar datos y enviar a Firebase
app.post("/submit-form", upload.single("audio"), async (req, res) => {
  console.log("Received formData:", req.body.formData);
  console.log("Received file:", req.file);
  try {
    const formData = JSON.parse(req.body.formData);
    let audioRefPath = "";

    if (req.file) {
      const fileName = `audios/${new Date().getTime()}.mp3`; // Cambio a formato .wav
      const audioRef = bucket.file(fileName);
      const stream = audioRef.createWriteStream({
        metadata: {
          contentType: "audio/mp3", // Cambio a audio/wav
        },
      });

      stream.on("error", (error) => {
        console.error("Error uploading file to Storage:", error);
        res
          .status(500)
          .send({ success: false, message: "Error uploading file to Storage" });
      });

      stream.on("finish", async () => {
        audioRefPath = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        await addDataToFirestore("usuarios", new Date().getTime().toString(), {
          ...formData,
          audioRef: audioRefPath,
        });
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
});

// Endpoint para recibir datos del JSON
app.post("/alcarrito", async (req, res) => {
  try {
    const { customer_id, trx_status, order_id } = req.body;

    // Validar si los datos requeridos están presentes
    if (!customer_id || !trx_status || !order_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customer_id, trx_status, order_id",
      });
    }

    // Buscar al usuario en la base de datos
    const usersRef = db.collection("usuarios");
    const snapshot = await usersRef
      .where("customer_id", "==", customer_id)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Suponemos que solo hay un usuario con ese customer_id
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Actualizar solo los campos proporcionados y mantener los demás intactos
    const updates = {
      trx_status: trx_status,
      order_id: order_id,
      // Agrega aquí más campos si son necesarios
    };

    await usersRef.doc(userDoc.id).update(updates);

    res.status(200).json({
      success: true,
      message: "Data updated successfully",
      data: updates,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({
      success: false,
      message: "Error processing your request",
    });
  }
});

// Endpoint para enviar datos en pagina de gracias
app.get("/get-user-data", async (req, res) => {
  const { customer_id } = req.query;

  if (!customer_id) {
    return res.status(400).json({
      success: false,
      message: "customer_id is required",
    });
  }

  try {
    const usersRef = db.collection("usuarios");
    const snapshot = await usersRef
      .where("customer_id", "==", customer_id)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let userData = [];
    snapshot.forEach((doc) => {
      userData.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      message: "Error processing your request",
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor ejecutandose sobre http://localhost:${port}`);
});
