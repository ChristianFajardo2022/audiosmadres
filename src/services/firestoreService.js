import { db } from '../config/firebaseAdminConfig.js';

export async function addDataToFirestore(collection, documentId, data) {
  if (!collection || !documentId || typeof data !== 'object') {
    throw new Error('Invalid input data for Firestore operation.');
  }
  try {
    const docRef = db.collection(collection).doc(documentId);
    await docRef.set(data);
    return docRef;
  } catch (error) {
    console.error("Error adding data to Firestore:", error);
    throw new Error('Failed to add data to Firestore.');
  }
}

export async function getDataFromFirestore(collection, documentId) {
  if (!collection || !documentId) {
    throw new Error('Invalid input data for Firestore operation.');
  }
  try {
    const docRef = db.collection(collection).doc(documentId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Document not found.');
    }
    return doc;
  } catch (error) {
    console.error("Error retrieving data from Firestore:", error);
    throw new Error('Failed to retrieve data from Firestore.');
  }
}