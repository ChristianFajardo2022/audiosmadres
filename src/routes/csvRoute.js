import express from "express";
import { db } from "../config/firebaseAdminConfig.js";
import { createObjectCsvStringifier } from "csv-writer";

const csvRoutes = express.Router();

csvRoutes.get("/export-users-csv", async (req, res) => {
  try {
    const snapshot = await db.collection("usuarios").get();
    const users = snapshot.docs.map((doc) => {
      const userData = doc.data();
      // Convertir la fecha de Firestore a una cadena legible
      if (userData.createdAt && userData.createdAt.toDate) {
        userData.createdAt = userData.createdAt.toDate().toLocaleString(); // O utiliza cualquier otro método de formateo de fecha
      }
      return userData;
    });

    // Crear el archivo CSV manualmente
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "firstname", title: "Firstname" },
        { id: "email", title: "Email" },
        { id: "customer_id", title: "Customer ID" },
        { id: "order_id", title: "Order ID" },
        { id: "trx_status", title: "Transaction Status" },
        { id: "audioRef", title: "Audio Reference" },
        { id: "createdAt", title: "Created At" }, // Agregar el campo de fecha
      ],
    });
    const csv =
      csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(users);

    // Configurar los headers para descargar el archivo
    res.header("Content-Type", "text/csv");
    res.attachment("usuarios.csv");
    res.send(csv);
  } catch (error) {
    console.error("Error exporting users to CSV:", error);
    res.status(500).send({ error: "Failed to export data" });
  }
});

export default csvRoutes;
