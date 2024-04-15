import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { parse } from 'json2csv'; // Asegúrate de importar 'parse'
import { db, bucket } from './config/firebaseAdminConfig.js'; // Asegurarse que 'db' y 'bucket' se importan correctamente
import { addDataToFirestore, getDataFromFirestore } from './services/firestoreService.js';

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Endpoint para descargar la base en .csv
app.get('/export-users-csv', async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios').get();
    const users = snapshot.docs.map(doc => doc.data());

    // Especifica los campos que quieres incluir en el CSV
    const fields = ['nombre', 'cedula', 'correoElectronico', 'numeroWhatsapp', 'audioRef'];
    const csv = parse(users, { fields });

    // Configura los headers para descargar el archivo
    res.header('Content-Type', 'text/csv');
    res.attachment('usuarios.csv');
    res.send(csv);
  } catch (error) {
    console.error("Error exporting users to CSV:", error);
    res.status(500).send({ error: 'Failed to export data' });
  }
});


// Endpoint para filtrar usuarios en el servidor
app.get('/filter-users', async (req, res) => {
  const { field, value } = req.query;

  // Verifica si los parámetros son válidos
  if (!field || !value) {
      return res.status(400).send({ success: false, message: "Invalid query parameters" });
  }

  try {
      const usersRef = db.collection('usuarios');
      const snapshot = await usersRef.where(field, '==', value).get();
      if (snapshot.empty) {
          return res.status(404).send({ success: false, message: 'No matching users found' });
      }

      let users = [];
      snapshot.forEach(doc => {
          users.push({ id: doc.id, ...doc.data() });
      });

      res.status(200).send({ success: true, users: users });
  } catch (error) {
      console.error("Error filtering users:", error);
      res.status(500).send({ success: false, message: 'Error processing your request' });
  }
});


//end point para descargar el audio desde el front

app.get('/download-audio', async (req, res) => {
  const { ref } = req.query;

  if (!ref) {
    return res.status(400).json({ success: false, message: "No audio reference provided" });
  }

  // Podrías agregar aquí una validación adicional para 'ref' si es necesario
  // Por ejemplo, verificar que 'ref' solo contenga caracteres permitidos o prefijos esperados

  try {
    const file = bucket.file(ref);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ success: false, message: 'Audio file not found' });
    }

    res.setHeader('Content-Type', 'audio/mp3');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(ref.split('/').pop())}"`);

    const stream = file.createReadStream();

    stream.on('error', (error) => {
      console.error("Error on audio file stream:", error);
      res.status(500).json({ success: false, message: 'Error streaming the audio file' });
    });

    stream.pipe(res);
  } catch (error) {
    console.error("Error downloading audio file:", error);
    res.status(500).json({ success: false, message: 'Error processing your request' });
  }
});

app.post('/submit-form', upload.single('audio'), async (req, res) => {
  console.log("Received formData:", req.body.formData);
  console.log("Received file:", req.file);
  try {
    const formData = JSON.parse(req.body.formData);
    let audioRefPath = '';

    if (req.file) {
      const fileName = `audios/${new Date().getTime()}.mp3`;
      const audioRef = bucket.file(fileName);
      const stream = audioRef.createWriteStream({
        metadata: {
          contentType: 'audio/mp3',
        }
      });

      stream.on('error', (error) => {
        console.error('Error uploading file to Storage:', error);
        res.status(500).send({ success: false, message: 'Error uploading file to Storage' });
      });

      stream.on('finish', async () => {
        // Asegura que el archivo ha sido cargado
        audioRefPath = `https://storage.googleapis.com/${bucket.name}/${fileName}`; // URL pública si el bucket está configurado para acceso público
        await addDataToFirestore('usuarios', new Date().getTime().toString(), {
          ...formData,
          audioRef: audioRefPath
        });
        res.status(201).send({ success: true, message: 'Data and audio uploaded successfully' });
      });

      stream.end(req.file.buffer);
    } else {
      res.status(400).send({ success: false, message: 'No audio file provided' });
    }
  } catch (error) {
    console.error('Error submitting form data:', error);
    res.status(500).send({ success: false, message: 'Error processing your request' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});