import express from "express";
import { parse } from "json2csv";
import { db } from "../config/firebaseAdminConfig.js";

const router = express.Router();

router.get("/export-users-csv", async (req, res) => {
  try {
    const snapshot = await db.collection("usuarios").get();
    const users = snapshot.docs.map((doc) => doc.data());

    // Especifica los campos que quieres incluir en el CSV
    const fields = [
      "firstname",
      "email",
      "customer_id",
      "order_id",
      "trx_status",
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

export default router;
