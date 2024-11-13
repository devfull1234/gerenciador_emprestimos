'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import useAtualizarParcelas from '../hooks/useAtualizarParcelas';
import { auth } from '../hooks/useAtualizarParcelas';

const ParcelasContext = createContext({});

export function ParcelasProvider({ children }) {
    const [empresaId, setEmpresaId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                const id = localStorage.getItem('empresaId');
                setEmpresaId(id);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Hook de atualização de parcelas
    useAtualizarParcelas(empresaId);

    const value = {
        empresaId,
        loading
    };

    return (
        <ParcelasContext.Provider value={value}>
            {children}
        </ParcelasContext.Provider>
    );
}

export const useParcelas = () => useContext(ParcelasContext);