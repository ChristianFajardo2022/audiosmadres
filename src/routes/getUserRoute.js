import express from "express";
import { db } from "../config/firebaseAdminConfig.js";

const getUserRoute = express.Router();

getUserRoute.get("/get-user-data", async (req, res) => {
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

export default getUserRoute;
