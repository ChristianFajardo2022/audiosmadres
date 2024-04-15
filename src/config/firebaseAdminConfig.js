import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const serviceAccountPath = path.resolve(process.env.FIREBASE_CREDENTIALS_PATH);

// Asegúrate de que las variables de entorno necesarias estén definidas
if (!process.env.FIREBASE_CREDENTIALS_PATH || !process.env.FIREBASE_DATABASE_URL || !process.env.FIREBASE_STORAGE_BUCKET) {
    console.error('Missing required environment variables.');
    process.exit(1); // Termina la aplicación con un error
}

// Importación de las credenciales de Firebase como un módulo JSON
let serviceAccount;
try {
    serviceAccount = await import(`file://${serviceAccountPath}`, { assert: { type: 'json' }});
} catch (error) {
    console.error('Failed to load Firebase service account credentials:', error);
    process.exit(1);
}

// Inicializa Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount.default), // Aquí es posible que necesites acceder a .default dependiendo de cómo Node.js maneja la importación de JSON
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET  // Asegúrate de definir esta variable de entorno con tu Firebase Storage Bucket URL
});

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket(); // Crea una referencia al bucket de Firebase Storage

export { db, storage, bucket };  // Asegúrate de exportar también el bucket