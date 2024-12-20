// app/cadastro/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { AlertCircle, UserPlus, Building2, MapPin, Briefcase, Users, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function CadastroPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    endereco: '',
    local_de_trabalho: '',
    parceiro: '',
    referencias: '',
    email: '',      
    contato: '' 
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [locaisDeTrabalho, setLocaisDeTrabalho] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoLocal, setNovoLocal] = useState('');
  const abrirModal = () => setIsModalOpen(true);
  const fecharModal = () => {
    setIsModalOpen(false);
    setNovoLocal('');
  };
    
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLocaisDeTrabalho = async () => {
      if (!userId) return;
  
      const locaisRef = collection(db, `empresas/${userId}/locaisdetrabalho`);
      const locaisSnapshot = await getDocs(locaisRef);
  
      const locais = locaisSnapshot.docs.map(doc => doc.data().nome as string);
      setLocaisDeTrabalho(locais);
    };
  
    fetchLocaisDeTrabalho();
  }, [userId]);

  const salvarNovoLocal = async () => {
    if (!userId || !novoLocal.trim()) return;
  
    const locaisRef = collection(db, `empresas/${userId}/locaisdetrabalho`);
    await addDoc(locaisRef, { nome: novoLocal });
  
    setLocaisDeTrabalho(prev => [...prev, novoLocal]);
    fecharModal();
  };
  
  

  const generateClienteId = () => {
    return `CLI${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setMessage({ type: 'error', text: 'Usuário não autenticado!' });
      return;
    }

    setLoading(true);
    try {
      const clienteId = generateClienteId();
      const clienteRef = doc(db, `empresas/${userId}/clientes/${clienteId}`);
      
      await setDoc(clienteRef, {
        ...formData,
        createdAt: new Date().toISOString(),
        clienteId
      });

      setMessage({ type: 'success', text: 'Cliente cadastrado com sucesso!' });
      setFormData({
        nome: '',
        cpf: '',
        endereco: '',
        local_de_trabalho: '',
        parceiro: '',
        referencias: '',
        email: '',      
        contato: '' 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao cadastrar cliente. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove caracteres não numéricos
      .replace(/(\d{3})(\d)/, '$1.$2') // Adiciona o primeiro ponto
      .replace(/(\d{3})(\d)/, '$1.$2') // Adiciona o segundo ponto
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2'); // Adiciona o traço
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
  
    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, [name]: formatCPF(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 dark:from-gray-900 dark:to-green-900 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <div className="card-body">
            <h2 className="card-title text-3xl font-bold text-center mb-8 text-green-600 dark:text-green-400 flex items-center gap-2">
              <UserPlus className="w-8 h-8" />
              Cadastro de Cliente
            </h2>

            {message.text && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} mb-4`}
              >
                <AlertCircle className="w-6 h-6" />
                <span>{message.text}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Nome Completo
                    </span>
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="input input-bordered input-success w-full focus:ring-2 focus:ring-green-500"
                    required
                  />
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CPF
                    </span>
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className="input input-bordered input-success w-full focus:ring-2 focus:ring-green-500"
                    pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
                    placeholder="000.000.000-00"
                  />
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Endereço
                    </span>
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    className="input input-bordered input-success w-full focus:ring-2 focus:ring-green-500"
                    required
                  />
                </motion.div>

                <motion.div 
  whileHover={{ scale: 1.01 }}
  className="form-control"
>
  <label className="label">
    <span className="label-text flex items-center gap-2">
      <Briefcase className="w-4 h-4" />
      Local de Trabalho
    </span>
  </label>
  <select
    name="local_de_trabalho"
    value={formData.local_de_trabalho}
    onChange={(e) => {
      if (e.target.value === 'novo') {
        abrirModal();
      } else {
        handleInputChange(e);
      }
    }}
    className="select select-success w-full focus:ring-2 focus:ring-green-500"
  >
    <option value="">Selecione um local de trabalho</option>
    {locaisDeTrabalho.map((local, index) => (
      <option key={index} value={local}>{local}</option>
    ))}
    <option value="novo">+ Adicionar Novo Local</option>
  </select>
</motion.div>
{isModalOpen && (
  <div className="modal modal-open">
    <div className="modal-box">
      <h2 className="font-bold text-lg">Adicionar Novo Local de Trabalho</h2>
      <input
        type="text"
        placeholder="Digite o nome do local"
        value={novoLocal}
        onChange={(e) => setNovoLocal(e.target.value)}
        className="input input-bordered input-success w-full mt-4"
      />
      <div className="modal-action">
        <button 
          className="btn btn-success" 
          onClick={salvarNovoLocal}
        >
          Salvar
        </button>
        <button 
          className="btn" 
          onClick={fecharModal}
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}


                <motion.div 
  whileHover={{ scale: 1.01 }}
  className="form-control"
>
  <label className="label">
    <span className="label-text flex items-center gap-2">
      <FileText className="w-4 h-4" />
      Email
    </span>
  </label>
  <input
    type="email"
    name="email"
    value={formData.email}
    onChange={handleInputChange}
    className="input input-bordered input-success w-full focus:ring-2 focus:ring-green-500"
  />
</motion.div>

<motion.div 
  whileHover={{ scale: 1.01 }}
  className="form-control"
>
  <label className="label">
    <span className="label-text flex items-center gap-2">
      <FileText className="w-4 h-4" />
      Contato
    </span>
  </label>
  <input
    type="text"
    name="contato"
    value={formData.contato}
    onChange={handleInputChange}
    className="input input-bordered input-success w-full focus:ring-2 focus:ring-green-500"
    required
  />
</motion.div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Parceiro
                    </span>
                  </label>
                  <select
                    name="parceiro"
                    value={formData.parceiro}
                    onChange={handleInputChange}
                    className="select select-success w-full focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Parceiro</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="form-control md:col-span-2"
                >
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Referências
                    </span>
                  </label>
                  <textarea
                    name="referencias"
                    value={formData.referencias}
                    onChange={handleInputChange}
                    className="textarea textarea-success h-24 focus:ring-2 focus:ring-green-500"
                    placeholder="Digite as referências do cliente..."
                  />
                </motion.div>
              </div>

              <motion.div 
                className="card-actions justify-end mt-6"
                whileHover={{ scale: 1.02 }}
              >
                <button
                  type="submit"
                  className={`btn btn-success text-white gap-2 ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>Cadastrando...</>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Cadastrar Cliente
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}