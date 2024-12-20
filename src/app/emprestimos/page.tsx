// app/emprestimos/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    query,
    where
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
    AlertTriangle,
    Calculator,
    Calendar,
    CreditCard,
    DollarSign,
    FileText,
    Percent,
    UserCheck,
    CheckCircle2,
    AlertCircle,
    Building,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';
import ParcelasModal from '../../components/modal_calcular'
import ConfirmationModal from '../../components/modal_confirmar'

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

interface Cliente {
    clienteId: string;
    nome: string;
    cpf: string;
    nalistaNegra?: boolean;
    local_de_trabalho?: string;
}

interface Workplace {
    id: string;
    nome: string;
}

interface EmprestimoForm {
    valor: string;
    porcentagem: string;
    total_parcelas: string;
    forma_pagamento: string;
    tipo_pagamento: string;
    data_pagamento: string;
    negociacao: string;
    parcelas_pagas: string;
    valorComJuros: string;
}

export default function EmprestimosPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [valorDisponivel, setValorDisponivel] = useState<number>(0);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [formData, setFormData] = useState<EmprestimoForm>({
        valor: '',
        porcentagem: '0',
        total_parcelas: '',
        forma_pagamento: '',
        tipo_pagamento: '',
        data_pagamento: '',
        negociacao: '',
        parcelas_pagas: '0',
        valorComJuros: ''
    });
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
    const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');
    const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
    const [showParcelasModal, setShowParcelasModal] = useState(false);
    const [parcelasEditaveis, setParcelasEditaveis] = useState<any[]>([]); // Defini o tipo como any[] para evitar erros
    const [calculationType, setCalculationType] = useState('total'); // 'total' or 'parcela'
    const [valorParcela, setValorParcela] = useState('');
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                fetchValorDisponivel(user.uid);
                fetchWorkplaces(user.uid);
                fetchClientes(user.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchWorkplaces = async (uid: string) => {
        try {
            const workplacesRef = collection(db, `empresas/${uid}/locaisdetrabalho`);
            const workplacesSnap = await getDocs(workplacesRef);
            const workplacesData = workplacesSnap.docs.map(doc => ({
                id: doc.id,
                nome: doc.data().nome
            }));
            setWorkplaces(workplacesData);
        } catch (error) {
            console.error('Erro ao buscar locais de trabalho:', error);
        }
    };

    useEffect(() => {
        if (selectedWorkplace) {
            const filtered = clientes.filter(cliente => {
                return cliente.local_de_trabalho === selectedWorkplace;
            });
            setFilteredClientes(filtered);
        } else {
            setFilteredClientes(clientes);
        }
    }, [selectedWorkplace, clientes]);


    const fetchValorDisponivel = async (uid: string) => {
        try {
            const empresaDoc = await getDoc(doc(db, `empresas/${uid}`));
            if (empresaDoc.exists()) {
                setValorDisponivel(empresaDoc.data().valor_emprestimo || 0);
            }
        } catch (error) {
            console.error('Erro ao buscar valor disponível:', error);
        }
    };

    const fetchClientes = async (uid: string) => {
        try {
            // Carregar todos os clientes de uma vez
            const clientesRef = collection(db, `empresas/${uid}/clientes`);
            const clientesSnap = await getDocs(clientesRef);
            const clientesData: Cliente[] = clientesSnap.docs.map((doc) => {
                const cliente = doc.data() as Cliente;
                cliente.clienteId = doc.id;
                return cliente;
            });

            // Carregar todos os documentos da lista negra de uma só vez
            const listaNegraRef = collection(db, `empresas/${uid}/lista_negra`);
            const listaNegraSnap = await getDocs(
                query(listaNegraRef, where('ativo', '==', true))
            );

            // Extrair os IDs dos clientes na lista negra em um conjunto (Set)
            const listaNegraIds = new Set<string>();
            listaNegraSnap.forEach((doc) => {
                const data = doc.data();
                if (data.clienteId) {
                    listaNegraIds.add(data.clienteId); // Adiciona clienteId dos documentos ativos
                }
            });

            // Atualizar `nalistaNegra` em cada cliente com base na presença na lista negra
            const clientesComListaNegra = clientesData.map((cliente) => {
                cliente.nalistaNegra = listaNegraIds.has(cliente.clienteId); // Verifica se clienteId está na lista negra
                return cliente;
            });

            // Atualizar o estado com os clientes e suas flags de lista negra
            setClientes(clientesComListaNegra);
        } catch (error) {
            console.error('Erro ao buscar clientes e lista negra:', error);
        }
    };


    const calcularJuros = () => {
        const valorBase = parseFloat(formData.valor);
        const porcentagem = parseFloat(formData.porcentagem);

        console.log("Valor base:", valorBase);
        console.log("Porcentagem:", porcentagem);

        if (!isNaN(valorBase) && !isNaN(porcentagem)) {
            const valorComJuros = valorBase * (1 + (porcentagem / 100));
            console.log("Valor com Juros:", valorComJuros);

            setFormData(prev => ({
                ...prev,
                valorComJuros: valorComJuros.toFixed(2)
            }));
        } else {
            console.error("Erro no cálculo dos juros: Valor ou porcentagem inválidos");
        }
    };

    const calcularPorParcela = () => {
        const valorParcelaNum = parseFloat(valorParcela);
        const totalParcelas = parseInt(formData.total_parcelas);

        if (!isNaN(valorParcelaNum) && !isNaN(totalParcelas)) {
            const valorTotal = valorParcelaNum * totalParcelas;
            const valorBase = valorTotal / (1 + (parseFloat(formData.porcentagem) / 100));

            setFormData(prev => ({
                ...prev,
                valor: valorBase.toFixed(2),
                valorComJuros: valorTotal.toFixed(2)
            }));
        }
    };

    const calcularParcelas = () => {
        if (parcelasEditaveis.length > 0) {
            return parcelasEditaveis;
        }

        const totalParcelas = parseInt(formData.total_parcelas);
        const valorComJuros = parseFloat(formData.valorComJuros);
        const dataPagamentoInicial = parseDate(formData.data_pagamento);

        if (isNaN(totalParcelas) || isNaN(valorComJuros) || !dataPagamentoInicial) {
            return [];
        }

        const valorParcela = valorComJuros / totalParcelas;
        const parcelas = [];

        for (let i = 0; i < totalParcelas; i++) {
            const dataParcela = new Date(dataPagamentoInicial);
            dataParcela.setMonth(dataParcela.getMonth() + i);

            parcelas.push({
                numero: i + 1,
                valor: valorParcela.toFixed(2),
                data: formatDate(dataParcela),
                status: i < parseInt(formData.parcelas_pagas) ? "Paga" : "Pendente"
            });
        }

        return parcelas;
    };

    const handleParcelaChange = (index: number, field: string, value: string) => {
        const novasParcelas = [...parcelasEditaveis];
        if (field === "data") {
            const parsedDate = parseDate(value);
            if (parsedDate) {
                novasParcelas[index][field] = formatDate(parsedDate);
            }
        } else {
            novasParcelas[index][field] = value;
        }
        setParcelasEditaveis(novasParcelas);
    };

    // Função auxiliar para parsear a data no formato YYYY-MM-DD como data local
    const parseDate = (dateString: string): Date | null => {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day);
    };

    // Função auxiliar para formatar a data no formato DD/MM/YYYY
    const formatDate = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Updated recalcularTotal
    const recalcularTotal = () => {
        const novoTotal = parcelasEditaveis.reduce((acc, parcela) =>
            acc + parseFloat(parcela.valor), 0);

        const porcentagem = parseFloat(formData.porcentagem);
        const valorBase = novoTotal / (1 + (porcentagem / 100));

        setFormData(prev => ({
            ...prev,
            valor: valorBase.toFixed(2),
            valorComJuros: novoTotal.toFixed(2)
        }));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmationModal(true);
    };

    const handleConfirmEmprestimo = async () => {
        if (!userId || !selectedCliente) {
            console.warn('Usuário ou cliente não selecionado.');
            return;
        }

        setLoading(true);
        try {
            const valorBase = parseFloat(formData.valor);

            if (valorBase > valorDisponivel) {
                throw new Error('Valor indisponível para empréstimo');
            }

            const parcelasParaSalvar = parcelasEditaveis.length > 0 ?
                parcelasEditaveis : calcularParcelas();

            const novoValorDisponivel = valorDisponivel - valorBase;
            const emprestimosID = `EMP${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

            await setDoc(
                doc(db, `empresas/${userId}/emprestimos/${emprestimosID}`),
                {
                    ...formData,
                    valor: valorBase,
                    valorComJuros: parseFloat(formData.valorComJuros),
                    taxa_juros: formData.porcentagem,
                    cliente: selectedCliente.clienteId,
                    data_criacao: new Date().toISOString(),
                    parcelas: parcelasParaSalvar,
                }
            );

            await updateDoc(doc(db, `empresas/${userId}`), {
                valor_emprestimo: novoValorDisponivel,
            });

            setValorDisponivel(novoValorDisponivel);
            setShowConfirmationModal(false);
            setShowSuccessModal(true);
            setParcelasEditaveis([]);
            setFormData({
                valor: '',
                porcentagem: '0',
                total_parcelas: '',
                forma_pagamento: '',
                tipo_pagamento: '',
                data_pagamento: '',
                negociacao: '',
                parcelas_pagas: '0',
                valorComJuros: ''

            });
            setValorParcela('');
            setSelectedCliente(null);
        } catch (error: any) { // Adicionei o tipo any para acessar error.message
            console.error('Erro ao criar empréstimo:', error);
            if (error.message === 'Valor indisponível para empréstimo') {
                setShowErrorModal(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerParcelas = () => {
        const parcelas = calcularParcelas();
        setParcelasEditaveis(parcelas);
        setShowParcelasModal(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 dark:from-gray-900 dark:to-green-900 p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
            >
                <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <div className="card-body">
                        <h2 className="card-title text-3xl font-bold text-center mb-8 text-green-600 dark:text-green-400 flex items-center gap-2">
                            <CreditCard className="w-8 h-8" />
                            Novo Empréstimo
                        </h2>

                        <div className="alert alert-info mb-6">
                            <DollarSign className="w-6 h-6" />
                            <span>Valor disponível para empréstimos: R$ {valorDisponivel.toLocaleString('pt-BR')}</span>
                        </div>



                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            Local de Trabalho
                                        </span>
                                    </label>
                                    <select
                                        className="select select-success w-full"
                                        onChange={(e) => setSelectedWorkplace(e.target.value)}
                                        value={selectedWorkplace}
                                    >
                                        <option value="">Todos os locais</option>
                                        {workplaces.map((workplace) => (
                                            <option key={workplace.id} value={workplace.nome}>
                                                {workplace.nome}
                                            </option>
                                        ))}
                                    </select>
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <UserCheck className="w-4 h-4" />
                                            Cliente
                                        </span>
                                    </label>
                                    <select
                                        className="select select-success w-full"
                                        onChange={(e) => {
                                            const cliente = filteredClientes.find(c => c.clienteId === e.target.value);
                                            setSelectedCliente(cliente || null);
                                        }}
                                        value={selectedCliente?.clienteId || ''}
                                        required
                                    >
                                        <option value="">Selecione um cliente</option>
                                        {filteredClientes.map((cliente) => (
                                            <option key={cliente.clienteId} value={cliente.clienteId}>
                                                {cliente.nome} {cliente.nalistaNegra && '⚠️'}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedCliente?.nalistaNegra && (
                                        <div className="mt-2 text-warning flex items-center gap-2 text-sm">
                                            <AlertTriangle className="w-4 h-4" />
                                            Cliente consta na lista de restrições
                                        </div>
                                    )}
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.01 }} className="form-control col-span-2">
                                    <label className="label">
                                        <span className="label-text">Tipo de Cálculo</span>
                                    </label>
                                    <select
                                        className="select select-success"
                                        value={calculationType}
                                        onChange={(e) => setCalculationType(e.target.value)}
                                    >
                                        <option value="total">Calcular por valor total</option>
                                        <option value="parcela">Calcular por valor da parcela</option>
                                    </select>
                                </motion.div>

                                {calculationType === 'total' ? (
                                    <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                        <label className="label">
                                            <span className="label-text flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Valor Total
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-success"
                                            value={formData.valor === '' ? '' : new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(parseFloat(formData.valor))}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/[^\d]/g, '');
                                                if (rawValue === '') {
                                                    setFormData(prev => ({ ...prev, valor: '' }));
                                                    return;
                                                }
                                                const numericValue = parseFloat(rawValue) / 100;
                                                setFormData(prev => ({ ...prev, valor: numericValue.toString() }));
                                            }}
                                            required={calculationType === 'total'}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                        <label className="label">
                                            <span className="label-text flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Valor por Parcela
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-success"
                                            value={valorParcela === '' ? '' : new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(parseFloat(valorParcela))}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/[^\d]/g, '');
                                                if (rawValue === '') {
                                                    setValorParcela('');
                                                    return;
                                                }
                                                const numericValue = parseFloat(rawValue) / 100;
                                                setValorParcela(numericValue.toString());
                                            }}
                                            required={calculationType === 'parcela'}
                                        />
                                    </motion.div>
                                )}



                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    className="form-control"
                                >
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Percent className="w-4 h-4" />
                                            Porcentagem de Juros
                                        </span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="input input-success flex-1"
                                            value={formData.porcentagem}
                                            onChange={(e) => setFormData(prev => ({ ...prev, porcentagem: e.target.value }))}
                                            required
                                        />
                                        <span className="text-lg">%</span> {/* Adiciona o símbolo % ao lado */}

                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={calculationType === 'total' ? calcularJuros : calcularPorParcela}
                                        >
                                            <Calculator className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>

                                {formData.valorComJuros && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="form-control"
                                    >
                                        <label className="label">
                                            <span className="label-text">Valor com Juros</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-success"
                                            value={`R$ ${formData.valorComJuros}`}
                                            disabled
                                        />
                                    </motion.div>
                                )}

                                {/* Demais campos do formulário... */}
                                <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                    <label className="label">
                                        <span className="label-text">Total de Parcelas</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-success"
                                        value={formData.total_parcelas}
                                        onChange={(e) => setFormData(prev => ({ ...prev, total_parcelas: e.target.value }))}
                                        required
                                    />
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                    <label className="label">
                                        <span className="label-text">Forma de Pagamento</span>
                                    </label>
                                    <select
                                        className="select select-success"
                                        value={formData.forma_pagamento}
                                        onChange={(e) => setFormData(prev => ({ ...prev, forma_pagamento: e.target.value }))}
                                        required
                                    >
                                        <option value="">Selecione</option>
                                        <option value="boleto">Boleto</option>
                                        <option value="pix">PIX</option>
                                        <option value="dinheiro">Dinheiro</option>
                                    </select>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                    <label className="label">
                                        <span className="label-text">Negociação</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-success"
                                        value={formData.negociacao}
                                        onChange={(e) => setFormData(prev => ({ ...prev, negociacao: e.target.value }))}
                                    />
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.01 }} className="form-control">
                                    <label className="label">
                                        <span className="label-text">Data de Pagamento</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-success"
                                        value={formData.data_pagamento}
                                        onChange={(e) => setFormData(prev => ({ ...prev, data_pagamento: e.target.value }))}
                                        required
                                    />
                                </motion.div>

                            </div>

                            {/* Replace the existing card-actions div with this */}
                            <motion.div
                                className="card-actions justify-end mt-6 gap-4"
                                whileHover={{ scale: 1.02 }}
                            >
                                <button
                                    type="button"
                                    className="btn btn-info text-white gap-2"
                                    onClick={handleVerParcelas}
                                    disabled={!formData.valorComJuros || !formData.total_parcelas || !formData.data_pagamento}
                                >
                                    <Calendar className="w-5 h-5" />
                                    Ver Parcelas
                                </button>

                                <button
                                    type="submit"
                                    className={`btn btn-success text-white gap-2 ${loading ? 'loading' : ''}`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        'Processando...'
                                    ) : (
                                        <>
                                            <FileText className="w-5 h-5" />
                                            Criar Empréstimo
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </form>
                    </div>
                    {calcularParcelas().map(parcela => (
                        <div
                            key={parcela.numero}
                            className={`flex justify-between p-2 border-b ${parcela.status === 'Paga' ? 'bg-green-100 text-green-700' : ' text-green-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Parcela {parcela.numero}
                            </span>
                            <span>R$ {parcela.valor}</span>
                            <span>{parcela.data}</span>
                            <span className="flex items-center gap-2">
                                {parcela.status === "Paga" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
                                {parcela.status}
                            </span>
                        </div>
                    ))}



                    {/* Add the ParcelasModal component */}
                    <ParcelasModal
                        isOpen={showParcelasModal}
                        onClose={() => setShowParcelasModal(false)}
                        parcelas={parcelasEditaveis}
                        onParcelaChange={handleParcelaChange}
                        onRecalcular={recalcularTotal}
                    />

                </div>

            </motion.div>

            <ConfirmationModal
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                onConfirm={handleConfirmEmprestimo}
                formData={formData}
                selectedCliente={selectedCliente}
                parcelasEditaveis={parcelasEditaveis}
            />

            {/* Modal de Sucesso */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowSuccessModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Empréstimo Criado com Sucesso!</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    O empréstimo foi registrado e o valor foi atualizado no sistema.
                                </p>
                                <button
                                    className="btn btn-success text-white"
                                    onClick={() => setShowSuccessModal(false)}
                                >
                                    Fechar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showErrorModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowErrorModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Valor Indisponível</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    O valor disponível para empréstimos é de R$ {valorDisponivel.toLocaleString('pt-BR')}.
                                </p>
                                <button
                                    className="btn btn-error text-white"
                                    onClick={() => setShowErrorModal(false)}
                                >
                                    Entendi
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
