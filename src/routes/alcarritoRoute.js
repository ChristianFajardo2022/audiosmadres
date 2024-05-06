import express from "express";
import { db } from "../config/firebaseAdminConfig.js";

const alcarritoRoute = express.Router();

alcarritoRoute.post("/alcarrito", async (req, res) => {
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

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    console.log(userData);

    // Verificar si trx_status es "approved" y stockUpdated es false
    if (trx_status === "approved" && !userData.stockUpdated) {
      // Actualizar el campo stockUpdated a true
      await usersRef.doc(userDoc.id).update({ stockUpdated: true });

      try {
        const stockDocRef = db.collection("stock").doc("stock_osos");
        const docSnap = await stockDocRef.get();

        if (docSnap.exists) {
          // Verificar si el DocumentSnapshot no es nulo
          const currentStock = docSnap.data().stock;
          await stockDocRef.update({
            stock: currentStock - 1,
          });
          console.log("Stock restado exitosamente.");
        } else {
          console.log("Documento no encontrado.");
        }
      } catch (error) {
        console.error("Error al restar el stock:", error);
      }
    }

    const updates = {
      trx_status: trx_status,
      order_id: order_id,
    };

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

export default alcarritoRoute;
