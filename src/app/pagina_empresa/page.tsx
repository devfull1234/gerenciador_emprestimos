// Empresa.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Building2, Target, Banknote, Save, Plus, Edit2, Trash2, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Lembrete {
    id: string;
    text: string;
    cor: string;
    createdAt: number;
}

interface EmpresaData {
    nome_empresa: string;
    meta: number;
    valor_emprestimo: number;
    lembretes: Lembrete[];
}

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const cores = [
    'bg-yellow-100',
    'bg-blue-100',
    'bg-green-100',
    'bg-pink-100',
    'bg-purple-100',
    'bg-orange-100'
];

const Empresa: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [empresaData, setEmpresaData] = useState<EmpresaData>({
        nome_empresa: '',
        meta: 0,
        valor_emprestimo: 0,
        lembretes: []
    });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | ''>('');
    const [novoLembrete, setNovoLembrete] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [lembreteEditado, setLembreteEditado] = useState<string>('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchEmpresaData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const docRef = doc(db, `empresas/${user.uid}`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as EmpresaData;
                    setEmpresaData({
                        ...data,
                        lembretes: data.lembretes || []
                    });
                }
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmpresaData();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await setDoc(doc(db, `empresas/${user.uid}`), empresaData);
            setSaveStatus("success");
            setShowModal(true);
        } catch (error) {
            setSaveStatus("error");
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    const addLembrete = () => {
        if (!novoLembrete.trim()) return;
        const newLembrete: Lembrete = {
            id: Date.now().toString(),
            text: novoLembrete,
            cor: cores[Math.floor(Math.random() * cores.length)],
            createdAt: Date.now()
        };
        setEmpresaData({
            ...empresaData,
            lembretes: [...empresaData.lembretes, newLembrete]
        });
        setNovoLembrete('');
    };

    const deleteLembrete = (id: string) => {
        setEmpresaData({
            ...empresaData,
            lembretes: empresaData.lembretes.filter(l => l.id !== id)
        });
    };

    const editLembrete = (id: string, newText: string) => {
        setEmpresaData((prevData) => ({
            ...prevData,
            lembretes: prevData.lembretes.map(l =>
                l.id === id ? { ...l, text: newText } : l
            )
        }));
    };


    const onDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(empresaData.lembretes);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setEmpresaData({
            ...empresaData,
            lembretes: items
        });
    };

    const progressPercentage = Math.min((empresaData.valor_emprestimo / empresaData.meta) * 100, 100);

    return (
        <div className="min-h-screen bg-base-200 p-6">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-base-100 shadow-xl"
                >
                    <div className="card-body">
                        <h1 className="card-title text-2xl font-bold mb-6 flex items-center gap-2">
                            <Building2 className="text-primary" />
                            Configurações da Empresa
                        </h1>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Building2 size={18} />
                                            Nome da Empresa
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nome da Empresa"
                                        className="input input-bordered"
                                        value={empresaData.nome_empresa}
                                        onChange={(e) => setEmpresaData({ ...empresaData, nome_empresa: e.target.value })}
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Target size={18} />
                                            Meta
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Meta"
                                        className="input input-bordered"
                                        value={empresaData.meta}
                                        onChange={(e) => setEmpresaData({ ...empresaData, meta: Number(e.target.value) })}
                                    />

                                    <div className="mt-4">
                                        <div className="flex justify-between mb-2">
                                            <span>Progresso:</span>
                                            <span>{progressPercentage.toFixed(1)}%</span>
                                        </div>
                                        <progress
                                            className="progress progress-primary w-full"
                                            value={progressPercentage}
                                            max="100"
                                        />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Banknote size={18} />
                                            Valor Empréstimo
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Valor disponível"
                                        className="input input-bordered"
                                        value={empresaData.valor_emprestimo}
                                        onChange={(e) => setEmpresaData({ ...empresaData, valor_emprestimo: Number(e.target.value) })}
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    className="btn btn-primary w-full"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="loading loading-spinner" />
                                    ) : (
                                        <><Save size={18} /> Salvar Dados</>
                                    )}
                                </button>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text flex items-center gap-2">
                                        <Bookmark size={18} />
                                        Mural de Lembretes
                                    </span>
                                </label>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Novo lembrete"
                                        className="input input-bordered flex-1"
                                        value={novoLembrete}
                                        onChange={(e) => setNovoLembrete(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addLembrete()}
                                    />
                                    <button onClick={addLembrete} className="btn btn-primary btn-square">
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="lembretes">
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="grid grid-cols-2 gap-4 h-[400px] overflow-y-auto p-4 bg-base-200 rounded-lg"
                                            >
                                                <AnimatePresence>
                                                    {empresaData.lembretes.map((lembrete, index) => (
                                                        <Draggable
                                                            key={lembrete.id}
                                                            draggableId={lembrete.id}
                                                            index={index}
                                                        >
                                                            {(provided) => (
                                                                <motion.div
                                                                    ref={provided.innerRef}
                                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                                    className={`card ${lembrete.cor} shadow-lg`}
                                                                >
                                                                    <div className="card-body p-4">
                                                                        {editingId === lembrete.id ? (
                                                                            <input
                                                                                type="text"
                                                                                className="input input-sm input-bordered w-full"
                                                                                value={lembrete.text}
                                                                                onChange={(e) => editLembrete(lembrete.id, e.target.value)}
                                                                                onBlur={() => setEditingId(null)}
                                                                                autoFocus
                                                                            />
                                                                        ) : (
                                                                            <p className="text-sm">{lembrete.text}</p>
                                                                        )}

                                                                        <div className="card-actions justify-end mt-2">
                                                                            <button
                                                                                onClick={() => setEditingId(lembrete.id)}
                                                                                className="btn btn-ghost btn-xs"
                                                                            >
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => deleteLembrete(lembrete.id)}
                                                                                className="btn btn-ghost btn-xs text-error"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                </AnimatePresence>
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {showModal && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">
                            {saveStatus === "success" ? "Sucesso!" : "Erro"}
                        </h3>
                        <p className="py-4">
                            {saveStatus === "success"
                                ? "Seus dados foram salvos com sucesso."
                                : "Ocorreu um erro ao salvar os dados."}
                        </p>
                        <div className="modal-action">
                            <button onClick={() => setShowModal(false)} className="btn">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Empresa;