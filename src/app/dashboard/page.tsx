'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import {
    Users,
    CreditCard,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Calendar,
    Activity
} from 'lucide-react';
import './styles.css';

interface Cliente {
    id: string;
    nome: string;
    cpf: string;
}

interface Emprestimo {
    id: string;
    cliente: string;
    valor: number;
    parcelas_pagas: number;
    total_parcelas: number;
    data_pagamento: string;
}

interface ListaNegra {
    id: string;
    cliente: string;
    ativo: boolean;
    data: string;
}

export default function Dashboard() {
    const { authState } = useAuth();
    const { user, loading: authLoading } = authState;
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
    const [listaNegra, setListaNegra] = useState<ListaNegra[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // Fetch Clientes
                const clientesRef = collection(firestore, `empresas/${user.uid}/clientes`);
                const clientesSnapshot = await getDocs(clientesRef);
                const clientesData = clientesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Cliente[];
                setClientes(clientesData);

                // Fetch Empréstimos
                const emprestimosRef = collection(firestore, `empresas/${user.uid}/emprestimos`);
                const emprestimosSnapshot = await getDocs(emprestimosRef);
                const emprestimosData = emprestimosSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Emprestimo[];
                setEmprestimos(emprestimosData);

                // Fetch Lista Negra
                const listaNegraRef = collection(firestore, `empresas/${user.uid}/lista_negra`);
                const listaNegraSnapshot = await getDocs(listaNegraRef);
                const listaNegraData = listaNegraSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ListaNegra[];
                setListaNegra(listaNegraData);

            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchData();
        }
    }, [user, authLoading]);

    const totalEmprestado = emprestimos.reduce((acc, emp) => acc + parseFloat(emp.valor.replace(',', '.')), 0);
    const totalClientes = clientes.length;
    const clientesListaNegra = listaNegra.filter(item => item.ativo).length;
    const parcelasAtrasadas = emprestimos.filter(
        emp => new Date(emp.data_pagamento) < new Date()
    ).length;

    const dadosGraficoEmprestimos = emprestimos.map(emp => ({
        cliente: clientes.find(c => c.id === emp.cliente)?.nome || 'Cliente não encontrado',
        valor: emp.valor,
        progresso: (emp.parcelas_pagas / emp.total_parcelas) * 100
    }));

    return (
        <div className="min-h-screen bg-base-200 text-base-content">
            {loading || authLoading ? (
                <div className="flex items-center justify-center min-h-screen">
                    <span className="loading loading-spinner loading-lg text-success"></span>
                </div>
            ) : (
                <div className="p-4 space-y-6">
                    {/* Cards informativos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 margin-left:250px;padding:20px;width:90%">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="stats shadow bg-base-100 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="stat">
                                <div className="stat-figure text-success">
                                    <DollarSign className="w-8 h-8" />
                                </div>
                                <div className="stat-title">Total Emprestado</div>
                                <div className="stat-value text-success">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(totalEmprestado)}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="stats shadow bg-base-100 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="stat">
                                <div className="stat-figure text-success">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div className="stat-title">Total Clientes</div>
                                <div className="stat-value">{totalClientes}</div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="stats shadow bg-base-100 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="stat">
                                <div className="stat-figure text-error">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <div className="stat-title">Lista Negra</div>
                                <div className="stat-value text-error">{clientesListaNegra}</div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="stats shadow bg-base-100 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="stat">
                                <div className="stat-figure text-warning">
                                    <Calendar className="w-8 h-8" />
                                </div>
                                <div className="stat-title">Parcelas Atrasadas</div>
                                <div className="stat-value text-warning">{parcelasAtrasadas}</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="card bg-base-100 shadow-xl"
                        >
                            <div className="card-body">
                                <h2 className="card-title text-success">
                                    <TrendingUp className="w-6 h-6" />
                                    Empréstimos por Cliente
                                </h2>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dadosGraficoEmprestimos}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="cliente" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="valor" fill="#10B981" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="card bg-base-100 shadow-xl"
                        >
                            <div className="card-body">
                                <h2 className="card-title text-success">
                                    <Activity className="w-6 h-6" />
                                    Progresso dos Pagamentos
                                </h2>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dadosGraficoEmprestimos}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="cliente" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="progresso"
                                                stroke="#10B981"
                                                strokeWidth={2}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Tabela de Últimos Empréstimos */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="card bg-base-100 shadow-xl"
                    >
                        <div className="card-body">
                            <h2 className="card-title text-success">
                                <CreditCard className="w-6 h-6" />
                                Últimos Empréstimos
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Valor</th>
                                            <th>Progresso</th>
                                            <th>Data de Pagamento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emprestimos.slice(0, 5).map((emp) => (
                                            <tr key={emp.id}>
                                                <td>{clientes.find(c => c.id === emp.cliente)?.nome}</td>
                                                <td>
                                                    {new Intl.NumberFormat('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL'
                                                    }).format(emp.valor)}
                                                </td>
                                                <td>
                                                    <progress
                                                        className="progress progress-success w-56"
                                                        value={emp.total_parcelas ? (emp.parcelas_pagas / emp.total_parcelas) * 100 : 0}
                                                        max="100"
                                                    ></progress>
                                                </td>

                                                <td>{new Date(emp.data_pagamento).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}