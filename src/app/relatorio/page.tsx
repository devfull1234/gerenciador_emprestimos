'use client'

import React, { useState, useEffect } from 'react';
import { Download, Search, AlertTriangle, FileText, TrendingUp, Calendar, Users, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { initializeApp } from 'firebase/app';
import { collection, query, getDocs, getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './styles.css';

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

const COLORS = ['#F59E0B', '#EF4444', '#10B981'];
const MONTHS_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const RelatorioClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [emprestimos, setEmprestimos] = useState([]);
  const [stats, setStats] = useState({
    emprestimosAtivos: 0,
    parcelasPendentes: 0,
    parcelasVencidas: 0,
    parcelasPagas: 0,
    valorTotal: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carregar os dados aqui
        const response = await getData();
        setState(response);  // Atualização de estado somente após a montagem
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
  
    fetchData();
  }, []); // Certifique-se de que as dependências estejam corretas para evitar renderizações infinitas
  
  const fetchData = async (empresaId) => {
    try {
      const clientesRef = collection(db, `empresas/${empresaId}/clientes`);
      const emprestimosRef = collection(db, `empresas/${empresaId}/emprestimos`);
      
      const [clientesSnapshot, emprestimosSnapshot] = await Promise.all([
        getDocs(clientesRef),
        getDocs(emprestimosRef)
      ]);

      const clientesData = {};
      clientesSnapshot.forEach((doc) => {
        clientesData[doc.id] = { id: doc.id, ...doc.data(), emprestimos: [] };
      });

      const emprestimosData = [];
      emprestimosSnapshot.forEach((doc) => {
        const emprestimo = doc.data();
        emprestimosData.push({ id: doc.id, ...emprestimo });
        if (clientesData[emprestimo.cliente]) {
          clientesData[emprestimo.cliente].emprestimos.push({ id: doc.id, ...emprestimo });
        }
      });

      const clientesArray = Object.values(clientesData);
      setClientes(clientesArray);
      setEmprestimos(emprestimosData);
      calculateStats(emprestimosData);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user.uid);
      } else {
        console.warn("Usuário não autenticado");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const calculateStats = (emprestimosList) => {
    const stats = emprestimosList.reduce((acc, emp) => {
      const parcelas = emp.parcelas || [];
      const pendentes = parcelas.filter(p => p.status === 'Pendente').length;
      const vencidas = parcelas.filter(p => p.status === 'Vencida').length;
      const pagas = parcelas.filter(p => p.status === 'Paga').length;
      const valorTotal = parcelas.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);

      return {
        emprestimosAtivos: acc.emprestimosAtivos + 1,
        parcelasPendentes: acc.parcelasPendentes + pendentes,
        parcelasVencidas: acc.parcelasVencidas + vencidas,
        parcelasPagas: acc.parcelasPagas + pagas,
        valorTotal: acc.valorTotal + valorTotal
      };
    }, { emprestimosAtivos: 0, parcelasPendentes: 0, parcelasVencidas: 0,parcelasPagas: 0, valorTotal: 0 });

    setStats(stats);
  };

  const handleExportPDF = (clienteId = null) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para paisagem, 'mm' para unidades em milímetros, 'a4' para o tamanho da página
    
    if (clienteId) {
      // Exportação de dados de um cliente específico
      const cliente = clientes.find(c => c.id === clienteId);
      const clienteEmprestimos = emprestimos.filter(e => e.cliente === clienteId);
  
      doc.text(`Relatório do Cliente: ${cliente.nome}`, 20, 20);
      doc.text(`CPF: ${cliente.cpf}`, 20, 30);
      doc.text(`Email: ${cliente.email}`, 20, 40);
      doc.text(`Telefone: ${cliente.contato}`, 20, 50);
  
      const emprestimosData = clienteEmprestimos.map(emp => [
        emp.id,
        emp.valor,
        emp.taxa_juros,
        emp.parcelas.length,
        emp.parcelas.filter(p => p.status === 'Paga').length, // Parcelas pagas
        emp.parcelas.length ? emp.parcelas[0].data_vencimento : null, // Vencimento da primeira parcela
        emp.parcelas.length ? emp.parcelas[emp.parcelas.length - 1].data_vencimento : null, // Data de término
        emp.data_criacao
      ]);
  
      doc.autoTable({
        head: [['ID', 'Valor', 'Taxa Juros', 'Total Parcelas', 'Parcelas Pagas', 'Vencimento Primeira Parcela', 'Data Término', 'Data Criação']],
        body: emprestimosData,
        startY: 60
      });
  
    } else {
      // Exportação de dados gerais de todos os clientes e empréstimos
      doc.text('Relatório Geral de Clientes e Empréstimos', 20, 20);
  
      clientes.forEach((cliente, index) => {
        if (index > 0) {
          doc.addPage(); // Adiciona uma nova página para cada cliente
        }
  
        doc.text(`Cliente: ${cliente.nome} - CPF: ${cliente.cpf}`, 20, 30);
        doc.text(`Email: ${cliente.email}`, 20, 40);
        doc.text(`Telefone: ${cliente.contato}`, 20, 50);
  
        const clienteEmprestimos = emprestimos.filter(e => e.cliente === cliente.id);
        const emprestimosData = clienteEmprestimos.map(emp => [
          emp.id,
          emp.valor,
          emp.taxa_juros,
          emp.parcelas.length,
          emp.parcelas.filter(p => p.status === 'Paga').length,
          emp.parcelas.length ? emp.parcelas[0].data_vencimento : null,
          emp.parcelas.length ? emp.parcelas[emp.parcelas.length - 1].data_vencimento : null,
          emp.data_criacao
        ]);
  
        doc.autoTable({
          head: [['ID', 'Valor', 'Taxa Juros', 'Total Parcelas', 'Parcelas Pagas', 'Vencimento Primeira Parcela', 'Data Término', 'Data Criação']],
          body: emprestimosData,
          startY: 60
        });
      });
    }
  
    doc.save(clienteId ? `relatorio_cliente_${clienteId}.pdf` : 'relatorio_geral.pdf');
  };
  
  
  

  const handleExportExcel = (clienteId = null) => {
    console.log("Iniciando a exportação para Excel...");
    
    // Verifica se clienteId é um objeto e extrai o id correto
    if (clienteId && typeof clienteId === 'object') {
      console.warn('clienteId está sendo passado como objeto:', clienteId);
      clienteId = clienteId.id; // Extrai o id real
    }
  
    const workbook = XLSX.utils.book_new();
  
    if (clienteId) {
      // Dados de um cliente específico
      console.log(`Exportando dados para o cliente com ID: ${clienteId}`);
      const cliente = clientes.find(c => c.id === clienteId);
      console.log("Cliente encontrado:", cliente);
  
      if (!cliente) {
        console.error(`Cliente com ID ${clienteId} não encontrado.`);
        return;
      }
  
      const clienteEmprestimos = emprestimos.filter(e => e.cliente === clienteId);
      console.log(`Empréstimos do cliente ${cliente.nome}:`, clienteEmprestimos);
  
      const emprestimosData = clienteEmprestimos.map(emp => {
        // Encontrar a primeira e última parcela
        const primeiraParcela = emp.parcelas.length ? emp.parcelas[0].data : null;
        const ultimaParcela = emp.parcelas.length ? emp.parcelas[emp.parcelas.length - 1].data : null;
  
        return {
          Cliente: cliente.nome,
          Email: cliente.email,
          Telefone: cliente.contato,
          TaxaJuros: emp.taxa_juros,
          DataCriacao: emp.data_criacao,
          Valor: emp.valor,
          TotalParcelas: emp.parcelas.length,
          ParcelasPagas: emp.parcelas.filter(p => p.status === 'Paga').length,
          VencimentoPrimeiraParcela: primeiraParcela,
          DataTermino: ultimaParcela
        };
      });
  
      console.log("Dados do empréstimo formatados:", emprestimosData);
  
      const worksheet = XLSX.utils.json_to_sheet(emprestimosData);
      XLSX.utils.book_append_sheet(workbook, worksheet, cliente.nome);
    } else {
      // Dados gerais de todos os clientes e seus empréstimos
      console.log("Exportando dados de todos os clientes...");
  
      clientes.forEach(cliente => {
        console.log("Processando cliente:", cliente);
  
        // Certificando-se de que o cliente é válido
        if (!cliente) {
          console.warn("Cliente indefinido encontrado e será ignorado.");
          return;
        }
  
        const clienteEmprestimos = emprestimos.filter(e => e.cliente === cliente.id);
        console.log(`Empréstimos do cliente ${cliente.nome}:`, clienteEmprestimos);
  
        const emprestimosData = clienteEmprestimos.map(emp => {
          // Encontrar a primeira e última parcela
          const primeiraParcela = emp.parcelas.length ? emp.parcelas[0].data : null;
          const ultimaParcela = emp.parcelas.length ? emp.parcelas[emp.parcelas.length - 1].data : null;
  
          return {
            Cliente: cliente.nome,
            Email: cliente.email,
            Telefone: cliente.contato,
            TaxaJuros: emp.taxa_juros,
            DataCriacao: emp.data_criacao,
            Valor: emp.valor,
            TotalParcelas: emp.parcelas.length,
            ParcelasPagas: emp.parcelas.filter(p => p.status === 'Paga').length,
            VencimentoPrimeiraParcela: primeiraParcela,
            DataTermino: ultimaParcela
          };
        });
  
        console.log("Dados do empréstimo formatados:", emprestimosData);
  
        const worksheet = XLSX.utils.json_to_sheet(emprestimosData);
        XLSX.utils.book_append_sheet(workbook, worksheet, cliente.nome);
      });
    }
  
    // Nome do arquivo
    const fileName = clienteId ? `relatorio_cliente_${clienteId}.xlsx` : 'relatorio_geral.xlsx';
    console.log(`Salvando arquivo: ${fileName}`);
    XLSX.writeFile(workbook, fileName);
    console.log("Exportação concluída.");
  };
  
  
  
  


  useEffect(() => {
    fetchData('mock-user-id');
  }, []);

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpf.includes(searchTerm)
  );

  const getPieData = () => {
    return [
      { name: 'Pendente', value: stats.parcelasPendentes },
      { name: 'Vencida', value: stats.parcelasVencidas },
      { name: 'Pagas', value: stats.parcelasPagas }
    ];
  };
    const getDefaultLineData = () => {
    const currentMonth = new Date().getMonth();
    return Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return {
        month: MONTHS_ABBR[monthIndex],
        taxa: Math.round((stats.parcelasVencidas / (stats.emprestimosAtivos || 1)) * 100 * (1 + i * 0.1))
      };
    });
  };


  return (
    <div className="p-4 bg-base-100 min-h-screen">
      <div className="flex justify-end gap-4 mb-6">
        <button 
          onClick={handleExportExcel}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <FileText className="w-4 h-4" /> Excel
        </button>
        <button 
          onClick={() => handleExportPDF()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" /> PDF Geral
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Empréstimos Ativos', value: stats.emprestimosAtivos, icon: <Users className="w-4 h-4" />, color: 'text-blue-500' },
          { title: 'Parcelas Pendentes', value: stats.parcelasPendentes, icon: <AlertCircle className="w-4 h-4" />, color: 'text-yellow-500' },
          { title: 'Parcelas Vencidas', value: stats.parcelasVencidas, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500' },
          { title: 'Valor Total', value: `R$ ${stats.valorTotal.toFixed(2)}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={stat.color}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Distribuição de Parcelas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getPieData()}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                label
              >
                {getPieData().map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Taxa de Inadimplência</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getDefaultLineData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="taxa" name="Taxa de Inadimplência %" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Lista de Clientes</h3>
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="px-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-gray-200">
              {filteredClientes.map((cliente) => (
                <tr key={cliente.clienteID}>
                  <td className="px-6 py-4 whitespace-nowrap">{cliente.nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cliente.cpf}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cliente.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cliente.contato}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-4">
  <button 
    onClick={() => handleExportPDF(cliente.id)}
    className="px-3 py-2 bg-red-500 text-white rounded-lg flex items-center gap-2 hover:bg-red-600 transition-colors text-sm"
  >
    Exportar PDF
  </button>
  <button 
    onClick={() => handleExportExcel(cliente.id)}
    className="px-3 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors text-sm"
  >
    Exportar Excel
  </button>
</div>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RelatorioClientes;
