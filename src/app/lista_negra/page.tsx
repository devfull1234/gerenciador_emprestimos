'use client'

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
    Search,
    Calendar,
    UserX,
    UserCheck,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface Parcela {
    status: string;
    data_vencimento: string;
}

interface Emprestimo {
    data_criacao: string;
    valor: string;
    status: string;
    parcelas: Parcela[];
    id: string;
}

interface Cliente {
    clienteId: string;
    nome: string;
    cpf: string;
    nalistaNegra: boolean;
    emprestimos?: Emprestimo[];
}

export default function InadimplentesPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                fetchClientes(user.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const verificaStatusEmprestimo = (parcelas) => {
        // Certifique-se de que existe uma lista de parcelas
        if (!parcelas || parcelas.length === 0) return "Sem parcelas";
    
        // Verifique se todas as parcelas estão pagas
        const todasPagas = parcelas.every(parcela => parcela.status === "Paga");
    
        // Se todas as parcelas estão pagas, retorne "Pago"; caso contrário, "Pendente"
        return todasPagas ? "Pago" : "Pendente";
    };

    const fetchClientes = async (uid: string) => {
        setLoading(true);
        try {
            const clientesRef = collection(db, `empresas/${uid}/clientes`);
            const clientesSnap = await getDocs(clientesRef);
            const clientesData: Cliente[] = [];

            for (const doc of clientesSnap.docs) {
                const cliente = doc.data() as Cliente;
                cliente.clienteId = doc.id;

                // Fetch empréstimos for each client
                const emprestimosRef = collection(db, `empresas/${uid}/emprestimos`);
                const emprestimosQuery = query(
                    emprestimosRef,
                    where('cliente', '==', doc.id),
                    orderBy('data_criacao', 'desc')
                );
                const emprestimosSnap = await getDocs(emprestimosQuery);
                
                const emprestimosPromises = emprestimosSnap.docs.map(async (empDoc) => {
                    const emprestimo = empDoc.data();
                    
                    // Fetch parcelas for each empréstimo
                    const parcelasRef = collection(db, `empresas/${uid}/emprestimos/${empDoc.id}/parcelas`);
                    const parcelasSnap = await getDocs(parcelasRef);
                    const parcelas = parcelasSnap.docs.map(parcelaDoc => ({
                        status: parcelaDoc.data().status,
                        data_vencimento: parcelaDoc.data().data_vencimento
                    }));

                    return {
                        id: empDoc.id,
                        data_criacao: emprestimo.data_criacao,
                        valor: emprestimo.valor,
                        parcelas: parcelas,
                        status: verificaStatusEmprestimo(parcelas)
                    };
                });

                cliente.emprestimos = await Promise.all(emprestimosPromises);
                clientesData.push(cliente);
            }

            // Fetch lista negra
            const listaNegraRef = collection(db, `empresas/${uid}/lista_negra`);
            const listaNegraSnap = await getDocs(query(listaNegraRef, where('ativo', '==', true)));
            const listaNegraIds = new Set(listaNegraSnap.docs.map(doc => doc.data().clienteId));

            const clientesComListaNegra = clientesData.map(cliente => ({
                ...cliente,
                nalistaNegra: listaNegraIds.has(cliente.clienteId)
            }));

            setClientes(clientesComListaNegra);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleListaNegra = async (cliente: Cliente) => {
        if (!userId) return;

        const listaNegraRef = doc(db, `empresas/${userId}/lista_negra/${cliente.clienteId}`);
        try {
            if (cliente.nalistaNegra) {
                await deleteDoc(listaNegraRef);
            } else {
                await setDoc(listaNegraRef, {
                    clienteId: cliente.clienteId,
                    ativo: true,
                    data: new Date().toISOString()
                });
            }
            await fetchClientes(userId);
        } catch (error) {
            console.error('Erro ao atualizar lista negra:', error);
        }
    };

    const isDateInRange = (date: string) => {
        if (!dateStart && !dateEnd) return true;
        const dateObj = new Date(date);
        const start = dateStart ? new Date(dateStart) : new Date(0);
        const end = dateEnd ? new Date(dateEnd) : new Date();
        return dateObj >= start && dateObj <= end;
    };

    const filteredClientes = clientes.filter(cliente => {
        const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            cliente.cpf.includes(searchTerm);
        
        if (!dateStart && !dateEnd) return matchesSearch;

        return matchesSearch && cliente.emprestimos?.some(emp => 
            isDateInRange(emp.data_criacao)
        );
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 dark:from-gray-900 dark:to-green-900 p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto"
            >
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-3xl font-bold text-center mb-8 text-red-600 dark:text-red-400">
                            Lista de Inadimplentes
                        </h2>

                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="form-control flex-1">
                                <div className="input-group">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou CPF..."
                                        className="input input-bordered w-full"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <button className="btn btn-square">
                                        <Search className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="form-control">
                                    <div className="input-group">
                                        <input
                                            type="date"
                                            className="input input-bordered"
                                            value={dateStart}
                                            onChange={(e) => setDateStart(e.target.value)}
                                            placeholder="Data inicial"
                                        />
                                    </div>
                                </div>
                                <div className="form-control">
                                    <div className="input-group">
                                        <input
                                            type="date"
                                            className="input input-bordered"
                                            value={dateEnd}
                                            onChange={(e) => setDateEnd(e.target.value)}
                                            placeholder="Data final"
                                        />
                                        <button className="btn btn-square">
                                            <Calendar className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <AnimatePresence>
                                {filteredClientes.map((cliente) => (
                                    <motion.div
                                        key={cliente.clienteId}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ scale: 1.02 }}
                                        className={`card ${cliente.nalistaNegra ? 'bg-red-50 dark:bg-red-950' : 'bg-white dark:bg-gray-800'} shadow-lg`}
                                    >
                                        <div className="card-body">
                                            <h3 className="card-title text-lg">
                                                {cliente.nome}
                                                {cliente.nalistaNegra && (
                                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                                )}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                CPF: {cliente.cpf}
                                            </p>
                                            
                                            <div className="flex justify-between mt-4">
                                                <button
                                                    className={`btn btn-sm ${selectedCliente?.clienteId === cliente.clienteId ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => setSelectedCliente(selectedCliente?.clienteId === cliente.clienteId ? null : cliente)}
                                                >
                                                    {selectedCliente?.clienteId === cliente.clienteId ? <ChevronUp /> : <ChevronDown />}
                                                    Detalhes
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${cliente.nalistaNegra ? 'btn-success' : 'btn-error'}`}
                                                    onClick={() => toggleListaNegra(cliente)}
                                                >
                                                    {cliente.nalistaNegra ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            <AnimatePresence>
    {selectedCliente?.clienteId === cliente.clienteId && (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 overflow-hidden"
        >
            <h4 className="font-semibold mb-2">Últimos Empréstimos</h4>
            {cliente.emprestimos?.map((emp) => (
                <div key={emp.id} className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center gap-2 mb-2 text-sm">
                        <CreditCard className="w-4 h-4" />
                        <span>R$ {emp.valor}</span>
                        <span>{new Date(emp.data_criacao).toLocaleDateString()}</span>
                    </div>
                </div>
            ))}
        </motion.div>
    )}
</AnimatePresence>

                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}