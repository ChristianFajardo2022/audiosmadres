import express from "express";
import { db } from "../config/firebaseAdminConfig.js";

const filterRoutes = express.Router();

filterRoutes.get("/filter-users", async (req, res) => {
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

export default filterRoutes;
