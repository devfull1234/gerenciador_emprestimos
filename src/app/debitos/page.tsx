'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, ChevronUp, ChevronDown, Mail, AlertCircle, CheckCircle, XCircle, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, orderBy, getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './styles.css';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DebitsPage = () => {
  const [empresaId, setEmpresaId] = useState(null);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmpresaId(user.uid);
        fetchClients(user.uid);
      } else {
        console.warn("Usuário não autenticado");
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchClients = async (empresaId) => {
    try {
      const clientsRef = collection(db, `empresas/${empresaId}/clientes`);
      const emprestimosRef = collection(db, `empresas/${empresaId}/emprestimos`);
      const listanegraRef = collection(db, `empresas/${empresaId}/lista_negra`);

      const clientsSnapshot = await getDocs(clientsRef);
      const clientsData = {};
      clientsSnapshot.forEach((doc) => {
        clientsData[doc.id] = { id: doc.id, ...doc.data(), emprestimos: [] };
      });

      const listanegraSnapshot = await getDocs(listanegraRef);
      const listanegraData = {};
      listanegraSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.ativo) {
          listanegraData[data.clienteId] = true;
        }
      });

      const emprestimosSnapshot = await getDocs(emprestimosRef);
      emprestimosSnapshot.forEach((doc) => {
        const emprestimo = doc.data();
        if (clientsData[emprestimo.cliente]) {
          clientsData[emprestimo.cliente].emprestimos.push({
            id: doc.id,
            ...emprestimo,
            nalistanegra: listanegraData[emprestimo.cliente] || false
          });
        }
      });

      const clientsArray = Object.values(clientsData).filter(client => client.emprestimos.length > 0);
      setClients(clientsArray);
      setFilteredClients(clientsArray);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  const handleUpdateParcelaStatus = async (emprestimo, parcelaIndex, newStatus) => {
    if (!empresaId || !emprestimo?.id) {
      console.warn("empresaId ou emprestimoId ausente.");
      return;
    }
    try {
      const emprestimosRef = doc(db, `empresas/${empresaId}/emprestimos/${emprestimo.id}`);
      const empresaRef = doc(db, `empresas/${empresaId}`);
  
      // Converter o valor da parcela para Number
      const parcelaValor = Number(emprestimo.parcelas[parcelaIndex].valor);
      const updatedParcelas = [...emprestimo.parcelas];
      const oldStatus = updatedParcelas[parcelaIndex].status;
  
      // Atualizar o status da parcela
      updatedParcelas[parcelaIndex] = {
        ...updatedParcelas[parcelaIndex],
        status: newStatus
      };
  
      // Obter valor_emprestimo atual e ajustar conforme o novo status
      const empresaSnap = await getDoc(empresaRef);
      let valorEmprestimoAtual = empresaSnap.data().valor_emprestimo || 0;
  
      if (newStatus === 'Paga' && oldStatus !== 'Paga') {
        valorEmprestimoAtual += parcelaValor;
      } else if (newStatus === 'Pendente' && oldStatus === 'Paga') {
        valorEmprestimoAtual -= parcelaValor;
      }
  
      const parcelasPagas = updatedParcelas.filter(p => p.status === 'Paga').length;
  
      // Atualizar os documentos no Firestore
      await updateDoc(emprestimosRef, {
        parcelas: updatedParcelas,
        parcelas_pagas: parcelasPagas.toString()
      });
      await updateDoc(empresaRef, {
        valor_emprestimo: valorEmprestimoAtual
      });
  
      // Atualizar o estado do cliente selecionado
      const updatedClients = clients.map(client => {
        if (client.id === selectedClient.id) {
          const updatedEmprestimos = client.emprestimos.map(emp => {
            if (emp.id === emprestimo.id) {
              return {
                ...emp,
                parcelas: updatedParcelas,
                parcelas_pagas: parcelasPagas.toString()
              };
            }
            return emp;
          });
          return { ...client, emprestimos: updatedEmprestimos };
        }
        return client;
      });
  
      setClients(updatedClients);
      setSelectedClient(updatedClients.find(c => c.id === selectedClient.id));
  
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
    }
  };
  
  const parseDateString = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-success"></span>
      </div>
    );
  }


  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      {/* Header and Filters */}
      <div className="mb-6 space-y-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Débitos Pendentes
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nome do cliente..."
              className="input input-bordered w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          </div>
          
          <button
            className="btn btn-outline btn-success gap-2"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
            {sortOrder === 'asc' ? 'Mais antigo' : 'Mais recente'}
          </button>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] cursor-pointer"
            onClick={() => {
              setSelectedClient(client);
              setShowModal(true);
            }}
          >
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="card-title text-xl">
                    {client.nome}
                    {client.nalistanegra && (
                      <div className="tooltip" data-tip="Cliente na lista negra">
                        <AlertTriangle className="text-warning ml-2" size={20} />
                      </div>
                    )}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm opacity-70">
                    Último empréstimo: {new Date(client.emprestimos[0]?.data_criacao).toLocaleDateString()}
                  </div>
                  <ChevronRight size={20} className="opacity-50" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Client Details Modal */}
      {showModal && selectedClient && (
  <div className="modal modal-open" onClick={() => setShowModal(false)}>
    <div className="modal-box max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              {selectedClient.nome}
              {selectedClient.nalistanegra && (
                <span className="badge badge-warning gap-1">
                  <AlertTriangle size={16} />
                  Lista Negra
                </span>
              )}
            </h3>
            
            {selectedClient.emprestimos.map((emprestimo, index) => (
              <div key={index} className="mb-6 p-4 bg-base-200 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm opacity-70">Valor Total</div>
                    <div className="font-semibold">R$ {emprestimo.valorComJuros}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-70">Parcelas Pagas</div>
                    <div className="font-semibold">{emprestimo.parcelas_pagas} de {emprestimo.total_parcelas}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-70">Forma de Pagamento</div>
                    <div className="font-semibold">{emprestimo.forma_pagamento}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-70">Data de Início</div>
                    <div className="font-semibold">{new Date(emprestimo.data_pagamento).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Parcela</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emprestimo.parcelas.map((parcela, idx) => (
                        <tr key={idx}>
                          <td>{parcela.numero}</td>
                          <td>R$ {parcela.valor}</td>
                          <td>{parseDateString(parcela.data).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${
                              parcela.status === 'Paga' ? 'badge-success' : 'badge-warning'
                            }`}>
                              {parcela.status}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                className={`btn btn-xs ${
                                  parcela.status === 'Paga' ? 'btn-error' : 'btn-success'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateParcelaStatus(
                                    emprestimo,
                                    idx,
                                    parcela.status === 'Paga' ? 'Pendente' : 'Paga'
                                  );
                                }}
                              >
                                {parcela.status === 'Paga' ? 'Reverter' : 'Marcar Paga'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex gap-2 justify-end">
                  <button
                    className="btn btn-info gap-2"
                    onClick={() => {
                      setShowEmailModal(true);
                      setEmailMessage(`Prezado(a) ${selectedClient.nome},\n\nEstamos entrando em contato referente ao seu empréstimo...`);
                    }}
                  >
                    <Mail size={20} />
                    Cobrar
                  </button>
                </div>
              </div>
            ))}

            <div className="modal-action">
              <button className="btn" onClick={() => setShowModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Enviar Cobrança</h3>
            <textarea
              className="textarea textarea-bordered w-full h-40"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
            />
            <div className="modal-action">
              <button className="btn btn-success gap-2" onClick={sendEmail}>
                <Mail size={20} />
                Enviar
              </button>
              <button className="btn" onClick={() => setShowEmailModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebitsPage;
