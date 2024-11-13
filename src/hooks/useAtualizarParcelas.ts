import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDocs, updateDoc, collection } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
  
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

const checkAndUpdateParcelas = async (uid) => {
  const emprestimosRef = collection(db, `usuarios/${uid}/emprestimos`);
  const emprestimosSnapshot = await getDocs(emprestimosRef);
  const today = new Date();

  emprestimosSnapshot.forEach(async (emprestimoDoc) => {
    const emprestimoData = emprestimoDoc.data();

    // Para cada parcela no empréstimo
    emprestimoData.parcelas.forEach(async (parcela, index) => {
      const vencimento = new Date(parcela.data);

      if (parcela.status === 'Pendente' && vencimento < today) {
        // Atualizar o status para "Vencido"
        const parcelaPath = `${emprestimoDoc.ref.path}/parcelas/${index}`;
        const parcelaRef = doc(db, parcelaPath);

        try {
          await updateDoc(parcelaRef, {
            status: 'Vencido',
          });
          console.log(`Parcela ${index + 1} do empréstimo ${emprestimoDoc.id} atualizada para "Vencido".`);
        } catch (error) {
          console.error('Erro ao atualizar parcela:', error);
        }
      }
    });
  });
};

// Hook para verificar e atualizar parcelas vencidas
const useAtualizarParcelas = () => {
  const [uid, setUid] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUid(user.uid); // Definindo o uid do usuário autenticado
    }
  }, []);

  useEffect(() => {
    if (uid) {
      checkAndUpdateParcelas(uid); // Chama a função com o uid do usuário
    }
  }, [uid]);
};