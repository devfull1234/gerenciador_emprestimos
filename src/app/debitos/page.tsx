
// components/DebitsPage.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, ChevronRight, Mail, ArrowUp, ArrowDown } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  collection, 
  query, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  getFirestore 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './styles.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// types.ts
export interface Parcela {
  numero: string;
  valor: string;
  data: string;
  status: 'Paga' | 'Pendente';
}

export interface Emprestimo {
  id: string;
  cliente: string;
  valorComJuros: string;
  parcelas_pagas: string;
  total_parcelas: string;
  forma_pagamento: string;
  data_pagamento: string;
  data_criacao: string;
  parcelas: Parcela[];
}

export interface Cliente {
  id: string;
  nome: string;
  emprestimos: Emprestimo[];
  local_de_trabalho: string;
  nalistanegra?: boolean;
  contato: string;
  cpf: string;
  email: string;
  endereco: string;
  parceiro: string;
  referencias: string;
}

interface EditableClientForm {
  nome: string;
  local_de_trabalho: string;
  contato: string;
  cpf: string;
  email: string;
  endereco: string;
  parceiro: string;
  referencias: string;
 }

interface EditableParcelaForm extends Omit<Parcela, 'status'> {
  status: 'Paga' | 'Pendente';
}

const DebitsPage: React.FC = () => {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [locaisDeTrabalho, setLocaisDeTrabalho] = useState<string[]>([]);
  const [showLocalModal, setShowLocalModal] = useState<boolean>(false);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [editingParcela, setEditingParcela] = useState<EditableParcelaForm | null>(null);
  const [showParcelaModal, setShowParcelaModal] = useState(false);
  const [isNewParcela, setIsNewParcela] = useState(false);
  const [selectedEmprestimoId, setSelectedEmprestimoId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<EditableClientForm | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  // Effects
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmpresaId(user.uid);
        fetchClients(user.uid);
      } else {
        console.warn("User not authenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchLocaisDeTrabalho = async (empresaId: string) => {
    const locaisRef = collection(db, `empresas/${empresaId}/locaisdetrabalho`);
    const locaisSnapshot = await getDocs(locaisRef);
    const locais = locaisSnapshot.docs.map(doc => doc.data().nome as string);
    setLocaisDeTrabalho(locais);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmpresaId(user.uid);
        fetchClients(user.uid);
        fetchLocaisDeTrabalho(user.uid);
      } else {
        console.warn("User not authenticated");
      }
    });
  
    return () => unsubscribe();
  }, []);
  

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client =>
        client.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  // Helper functions
  const parseDateString = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const formatCurrency = (value: string): string => {
    return `R$ ${value}`;
  };

  // Data fetching
  const fetchClients = async (empresaId: string): Promise<void> => {
    try {
      const clientsRef = collection(db, `empresas/${empresaId}/clientes`);
      const emprestimosRef = collection(db, `empresas/${empresaId}/emprestimos`);
      const listanegraRef = collection(db, `empresas/${empresaId}/lista_negra`);

      const [clientsSnapshot, listanegraSnapshot, emprestimosSnapshot] = await Promise.all([
        getDocs(clientsRef),
        getDocs(listanegraRef),
        getDocs(emprestimosRef)
      ]);

      const clientsData: { [key: string]: Cliente } = {};
      const listanegraData: { [key: string]: boolean } = {};
      
      clientsSnapshot.forEach((doc) => {
        clientsData[doc.id] = { 
          id: doc.id, 
          ...doc.data() as Omit<Cliente, 'id' | 'emprestimos'>, 
          emprestimos: [] 
        };
      });

      listanegraSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.ativo) {
          listanegraData[data.clienteId] = true;
        }
      });

      emprestimosSnapshot.forEach((doc) => {
        const emprestimo = doc.data() as Omit<Emprestimo, 'id'>;
        if (clientsData[emprestimo.cliente]) {
          clientsData[emprestimo.cliente].emprestimos.push({
            id: doc.id,
            ...emprestimo
          });
          clientsData[emprestimo.cliente].nalistanegra = listanegraData[emprestimo.cliente] || false;
        }
      });

      const sortedClients = Object.values(clientsData)
        .filter(client => client.emprestimos.length > 0)
        .sort((a, b) => {
          const dateA = new Date(a.emprestimos[0]?.data_criacao || 0);
          const dateB = new Date(b.emprestimos[0]?.data_criacao || 0);
          return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });

      setClients(sortedClients);
      setFilteredClients(sortedClients);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleEditParcela = (emprestimo: Emprestimo, parcela: Parcela) => {
    setSelectedEmprestimoId(emprestimo.id);
    setEditingParcela(parcela);
    setIsNewParcela(false);
    setShowParcelaModal(true);
  };
  
  const handleAddParcela = (emprestimo: Emprestimo) => {
    const nextParcelaNum = (emprestimo.parcelas.length + 1).toString();
    setSelectedEmprestimoId(emprestimo.id);
    setEditingParcela({
      numero: nextParcelaNum,
      valor: "0",
      data: new Date().toLocaleDateString(),
      status: 'Pendente'
    });
    setIsNewParcela(true);
    setShowParcelaModal(true);
  };
  
  const handleDeleteParcela = async (emprestimo: Emprestimo, parcelaIndex: number) => {
    if (!empresaId || !emprestimo?.id) return;
  
    try {
      const updatedParcelas = emprestimo.parcelas.filter((_, index) => index !== parcelaIndex);
      const parcelasPagas = updatedParcelas.filter(p => p.status === 'Paga').length;
      const newTotal = calculateTotal(updatedParcelas);
  
      await updateDoc(doc(db, `empresas/${empresaId}/emprestimos/${emprestimo.id}`), {
        parcelas: updatedParcelas,
        parcelas_pagas: parcelasPagas.toString(),
        total_parcelas: updatedParcelas.length.toString(),
        valorComJuros: newTotal
      });
      
      const updatedClients = clients.map(client => {
        if (client.id === selectedClient?.id) {
          const updatedEmprestimos = client.emprestimos.map(emp => {
            if (emp.id === emprestimo.id) {
              return {
                ...emp,
                parcelas: updatedParcelas,
                parcelas_pagas: parcelasPagas.toString(),
                total_parcelas: updatedParcelas.length.toString(),
                valorComJuros: newTotal
              };
            }
            return emp;
          });
          return { ...client, emprestimos: updatedEmprestimos };
        }
        return client;
      });
  
      setClients(updatedClients);
      setSelectedClient(updatedClients.find(c => c.id === selectedClient?.id) || null);
    } catch (error) {
      console.error('Error deleting installment:', error);
    }
  };
  
  const calculateTotal = (parcelas: Parcela[]): string => {
    return parcelas.reduce((sum, parcela) => sum + Number(parcela.valor), 0).toString();
  };

  const handleSaveParcela = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !selectedEmprestimoId || !editingParcela || !selectedClient) return;
  
    try {
      const emprestimo = selectedClient.emprestimos.find(e => e.id === selectedEmprestimoId);
      if (!emprestimo) return;
  
      let updatedParcelas: Parcela[];
      if (isNewParcela) {
        updatedParcelas = [...emprestimo.parcelas, editingParcela];
      } else {
        updatedParcelas = emprestimo.parcelas.map(p => 
          p.numero === editingParcela.numero ? editingParcela : p
        );
      }
  
      const parcelasPagas = updatedParcelas.filter(p => p.status === 'Paga').length;
      const newTotal = calculateTotal(updatedParcelas);

      await updateDoc(doc(db, `empresas/${empresaId}/emprestimos/${selectedEmprestimoId}`), {
        parcelas: updatedParcelas,
        parcelas_pagas: parcelasPagas.toString(),
        total_parcelas: updatedParcelas.length.toString(),
        valorComJuros: newTotal
      });
  
      // Update local state
      const updatedClients = clients.map(client => {
        if (client.id === selectedClient.id) {
          const updatedEmprestimos = client.emprestimos.map(emp => {
            if (emp.id === selectedEmprestimoId) {
              return {
                ...emp,
                parcelas: updatedParcelas,
                parcelas_pagas: parcelasPagas.toString(),
                total_parcelas: updatedParcelas.length.toString(),
                valorComJuros: newTotal
              };
            }
            return emp;
          });
          return { ...client, emprestimos: updatedEmprestimos };
        }
        return client;
      });
  
      setClients(updatedClients);
      setSelectedClient(updatedClients.find(c => c.id === selectedClient.id) || null);
      setShowParcelaModal(false);
    } catch (error) {
      console.error('Error saving installment:', error);
    }
  };


  // Event handlers
  const handleUpdateParcelaStatus = async (
    emprestimo: Emprestimo,
    parcelaIndex: number,
    newStatus: 'Paga' | 'Pendente'
  ): Promise<void> => {
    if (!empresaId || !emprestimo?.id) {
      console.warn("Missing empresaId or emprestimoId");
      return;
    }
    
    try {
      const emprestimosRef = doc(db, `empresas/${empresaId}/emprestimos/${emprestimo.id}`);
      const empresaRef = doc(db, `empresas/${empresaId}`);

      const parcelaValor = Number(emprestimo.parcelas[parcelaIndex].valor);
      const updatedParcelas = [...emprestimo.parcelas];
      const oldStatus = updatedParcelas[parcelaIndex].status;

      updatedParcelas[parcelaIndex] = {
        ...updatedParcelas[parcelaIndex],
        status: newStatus
      };

      const empresaSnap = await getDoc(empresaRef);
      const empresaData = empresaSnap.data();
      let valorEmprestimoAtual = empresaData?.valor_emprestimo || 0;

      if (newStatus === 'Paga' && oldStatus !== 'Paga') {
        valorEmprestimoAtual += parcelaValor;
      } else if (newStatus === 'Pendente' && oldStatus === 'Paga') {
        valorEmprestimoAtual -= parcelaValor;
      }

      const parcelasPagas = updatedParcelas.filter(p => p.status === 'Paga').length;

      await Promise.all([
        updateDoc(emprestimosRef, {
          parcelas: updatedParcelas,
          parcelas_pagas: parcelasPagas.toString()
        }),
        updateDoc(empresaRef, {
          valor_emprestimo: valorEmprestimoAtual
        })
      ]);

      // Update local state
      const updatedClients = clients.map(client => {
        if (client.id === selectedClient?.id) {
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
      setSelectedClient(updatedClients.find(c => c.id === selectedClient?.id) || null);
    } catch (error) {
      console.error('Error updating installment:', error);
    }
  };


  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !selectedClient || !editingClient) return;
   
    try {
      await updateDoc(doc(db, `empresas/${empresaId}/clientes/${selectedClient.id}`), {
        nome: editingClient.nome,
        local_de_trabalho: editingClient.local_de_trabalho,
        contato: editingClient.contato,
        cpf: editingClient.cpf, 
        email: editingClient.email,
        endereco: editingClient.endereco,
        parceiro: editingClient.parceiro,
        referencias: editingClient.referencias
      });
   
      const updatedClients = clients.map(client => {
        if (client.id === selectedClient.id) {
          return {
            ...client,
            ...editingClient
          };
        }
        return client;
      });
   
      setClients(updatedClients);
      setFilteredClients(updatedClients);
      setSelectedClient({
        ...selectedClient,
        ...editingClient
      });
      setShowClientModal(false);
    } catch (error) {
      console.error('Error saving client:', error);
    }
   };

  const handleSendEmail = async (): Promise<void> => {
    // Implement email sending logic here
    setShowEmailModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sendEmail: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    // Lógica para enviar o email
};


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
          <button
  className="btn btn-outline btn-info gap-2"
  onClick={() => setShowLocalModal(true)}
>
  Filtrar por Local de Trabalho
</button>

        </div>
      </div>

      {showLocalModal && (
  <div className="modal modal-open" onClick={() => setShowLocalModal(false)}>
    <div className="modal-box max-w-4xl" onClick={(e) => e.stopPropagation()}>
      <h3 className="font-bold text-lg mb-4">Selecionar Local de Trabalho</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locaisDeTrabalho.map((local, index) => (
          <div
            key={index}
            className="card bg-base-100 shadow hover:shadow-lg transition-all duration-300 cursor-pointer p-4"
            onClick={() => {
              setSelectedLocal(local);
              setFilteredClients(clients.filter(client => client.local_de_trabalho === local));
              setShowLocalModal(false);
            }}
          >
            <h3 className="text-lg font-semibold">{local}</h3>
          </div>
        ))}
      </div>
      <div className="modal-action">
        <button className="btn" onClick={() => setShowLocalModal(false)}>Fechar</button>
      </div>
    </div>
  </div>
)}


      {/* Clients List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {filteredClients.map((client) => (
    <div
      key={client.id}
      className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
      onClick={() => {
        setSelectedClient(client);
        setShowModal(true);
      }}
    >
      <div className="card-body">
        <h3 className="card-title text-lg font-semibold">{client.nome}</h3>
        <p className="text-sm text-gray-500">
          Empréstimos: {client.emprestimos?.length || 0}
        </p>
      </div>
    </div>
  ))}
</div>

{showClientModal && editingClient && (
  <div className="modal modal-open">
    <div className="modal-box">
      <h3 className="font-bold text-lg mb-4">Editar Cliente</h3>
      <form onSubmit={handleSaveClient} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Nome</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.nome}
            onChange={(e) => setEditingClient({
              ...editingClient,
              nome: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">CPF</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.cpf}
            onChange={(e) => setEditingClient({
              ...editingClient,
              cpf: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            className="input input-bordered" 
            value={editingClient.email}
            onChange={(e) => setEditingClient({
              ...editingClient,
              email: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Contato</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.contato}
            onChange={(e) => setEditingClient({
              ...editingClient,
              contato: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Endereço</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.endereco}
            onChange={(e) => setEditingClient({
              ...editingClient,
              endereco: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Local de Trabalho</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.local_de_trabalho}
            onChange={(e) => setEditingClient({
              ...editingClient,
              local_de_trabalho: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Parceiro</span>
          </label>
          <input
            type="text" 
            className="input input-bordered"
            value={editingClient.parceiro}
            onChange={(e) => setEditingClient({
              ...editingClient,
              parceiro: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Referências</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.referencias}
            onChange={(e) => setEditingClient({
              ...editingClient,
              referencias: e.target.value
            })}
          />
        </div>

        <div className="modal-action">
          <button type="submit" className="btn btn-primary">Salvar</button>
          <button 
            type="button" 
            className="btn"
            onClick={() => setShowClientModal(false)}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
)}
      {/* Client Details Modal */}
      {showModal && selectedClient && (
  <div className="modal modal-open" onClick={() => setShowModal(false)}>
    <div className="modal-box max-w-4xl" onClick={(e) => e.stopPropagation()}>
    <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
  <div className="flex items-center gap-2">
    {selectedClient.nome}
    {selectedClient.nalistanegra && (
      <span className="badge badge-warning gap-1">
        <AlertTriangle size={16} />
        Lista Negra
      </span>
    )}
  </div>
  <button
    className="btn btn-sm btn-info"
    onClick={() => {
      setEditingClient({
        nome: selectedClient.nome,
        local_de_trabalho: selectedClient.local_de_trabalho,
        contato: selectedClient.contato,
        cpf: selectedClient.cpf,
        email: selectedClient.email,
        endereco: selectedClient.endereco,
        parceiro: selectedClient.parceiro,
        referencias: selectedClient.referencias
      });
      setShowClientModal(true);
    }}
  >
    Editar Cliente
  </button>
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
        <span className={`badge ${parcela.status === 'Paga' ? 'badge-success' : 'badge-warning'}`}>
          {parcela.status}
        </span>
      </td>
      <td>
        <div className="flex gap-2">
          <button
            className={`btn btn-xs ${parcela.status === 'Paga' ? 'btn-error' : 'btn-success'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleUpdateParcelaStatus(emprestimo, idx, parcela.status === 'Paga' ? 'Pendente' : 'Paga');
            }}
          >
            {parcela.status === 'Paga' ? 'Reverter' : 'Marcar Paga'}
          </button>
          <button
            className="btn btn-xs btn-info"
            onClick={(e) => {
              e.stopPropagation();
              handleEditParcela(emprestimo, parcela);
            }}
          >
            Editar
          </button>
          <button
            className="btn btn-xs btn-error"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteParcela(emprestimo, idx);
            }}
          >
            Excluir
          </button>
          
        </div>
      </td>
    </tr>
  ))}
</tbody>
                  </table>
                </div>

                <div className="mt-4 flex gap-2 justify-between">
  <button
    className="btn btn-primary gap-2"
    onClick={(e) => {
      e.stopPropagation();
      handleAddParcela(emprestimo);
    }}
  >
    Nova Parcela
  </button>
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

{showParcelaModal && editingParcela && (
  <div className="modal modal-open">
    <div className="modal-box">
      <h3 className="font-bold text-lg mb-4">
        {isNewParcela ? 'Nova Parcela' : 'Editar Parcela'}
      </h3>
      <form onSubmit={handleSaveParcela}>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Número</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingParcela.numero}
            onChange={(e) => setEditingParcela({
              ...editingParcela,
              numero: e.target.value
            })}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Valor</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingParcela.valor}
            onChange={(e) => setEditingParcela({
              ...editingParcela,
              valor: e.target.value
            })}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Data</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={editingParcela.data.split('/').reverse().join('-')}
            onChange={(e) => {
              const date = new Date(e.target.value);
              setEditingParcela({
                ...editingParcela,
                data: date.toLocaleDateString()
              });
            }}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Status</span>
          </label>
          <select
            className="select select-bordered"
            value={editingParcela.status}
            onChange={(e) => setEditingParcela({
              ...editingParcela,
              status: e.target.value as 'Paga' | 'Pendente'
            })}
          >
            <option value="Pendente">Pendente</option>
            <option value="Paga">Paga</option>
          </select>
        </div>
        <div className="modal-action">
          <button type="submit" className="btn btn-primary">Salvar</button>
          <button type="button" className="btn" onClick={() => setShowParcelaModal(false)}>Cancelar</button>
        </div>
      </form>
    </div>
  </div>
)}

{showClientModal && editingClient && (
  <div className="modal modal-open">
    <div className="modal-box">
      <h3 className="font-bold text-lg mb-4">Editar Cliente</h3>
      <form onSubmit={handleSaveClient} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Nome</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.nome}
            onChange={(e) => setEditingClient({
              ...editingClient,
              nome: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">CPF</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.cpf}
            onChange={(e) => setEditingClient({
              ...editingClient,
              cpf: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            className="input input-bordered" 
            value={editingClient.email}
            onChange={(e) => setEditingClient({
              ...editingClient,
              email: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Contato</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.contato}
            onChange={(e) => setEditingClient({
              ...editingClient,
              contato: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Endereço</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.endereco}
            onChange={(e) => setEditingClient({
              ...editingClient,
              endereco: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Local de Trabalho</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.local_de_trabalho}
            onChange={(e) => setEditingClient({
              ...editingClient,
              local_de_trabalho: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Parceiro</span>
          </label>
          <input
            type="text" 
            className="input input-bordered"
            value={editingClient.parceiro}
            onChange={(e) => setEditingClient({
              ...editingClient,
              parceiro: e.target.value
            })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Referências</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={editingClient.referencias}
            onChange={(e) => setEditingClient({
              ...editingClient,
              referencias: e.target.value
            })}
          />
        </div>

        <div className="modal-action">
          <button type="submit" className="btn btn-primary">Salvar</button>
          <button 
            type="button" 
            className="btn"
            onClick={() => setShowClientModal(false)}
          >
            Cancelar
          </button>
        </div>
      </form>
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
