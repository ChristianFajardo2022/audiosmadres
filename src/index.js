import express from "express";

import cors from "cors";
import csvRoutes from "./routes/csvRoute.js";
import filterRoutes from "./routes/filterRoute.js";
import downLoadRoute from "./routes/downLoadRoute.js";
import submitFormRoute from "./routes/submitFormRoute.js";
import alcarritoRoute from "./routes/alcarritoRoute.js";
import getUserRoute from "./routes/getUserRoute.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Endpoint para descargar la base en .csv
app.use("/", csvRoutes);

// Endpoint para filtrar usuarios en el servidor
app.use("/", filterRoutes);

// Endpoint para descargar el audio desde el front
app.use("/", downLoadRoute);

// Endpoint para cargar datos y enviar a Firebase
app.use("/", submitFormRoute);

// Endpoint para recibir datos del JSON
app.use("/", alcarritoRoute);

// Endpoint para enviar datos en pagina de gracias
app.use("/", getUserRoute);

app.listen(port, () => {
  console.log(`Servidor ejecutandose sobre http://localhost:${port}`);
});
