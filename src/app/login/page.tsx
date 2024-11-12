'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { motion } from 'framer-motion';
import { FiMail, FiLock } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Animações para os elementos da página
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  // Função de login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login realizado com sucesso!');
      router.push('/dashboard'); // Redireciona para a página de dashboard
    } catch (error: any) {
      toast.error(`Erro ao fazer login: ${error.message}`, {
        style: { color: '#fff' }, // Cor do texto do erro
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função de recuperação de senha
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Por favor, insira seu email', {
        style: { color: '#fff' },
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      toast.error(`Erro ao enviar email: ${error.message}`, {
        style: { color: '#fff' },
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full bg-slate-800 rounded-xl shadow-xl p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <h2 className="text-3xl font-bold text-center text-green-700 mb-8">
            Bem-vindo de volta!
          </h2>
        </motion.div>

        <form onSubmit={handleLogin}>
          <motion.div variants={itemVariants} className="form-control mb-4">
            <label className="label">
              <span className="label-text text-green-700">Email</span>
            </label>
            <div className="input-group">
              <span className="bg-green-100">
                <FiMail className="text-green-700" />
              </span>
              <input
                type="email"
                placeholder="Insira seu Email"
                className="input input-bordered w-full focus:border-green-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="form-control mb-6">
            <label className="label">
              <span className="label-text text-green-700">Senha</span>
            </label>
            <div className="input-group">
              <span className="bg-green-100">
                <FiLock className="text-green-700" />
              </span>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                className="input input-bordered w-full focus:border-green-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              className={`btn btn-block bg-green-600 hover:bg-green-700 text-white ${
                isLoading ? 'loading' : ''
              }`}
              disabled={isLoading}
              style={{
                fontSize: '16px', // Ajuste de tamanho da animação de carregamento
                padding: '10px', // Ajuste do preenchimento do botão
              }}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                'Entrar'
              )}
            </button>
          </motion.div>
        </form>

        <motion.div variants={itemVariants} className="mt-4 text-center">
          <button
            onClick={handleForgotPassword}
            className="text-sm text-green-600 hover:text-green-700 hover:underline"
          >
            Esqueceu sua senha?
          </button>
        </motion.div>
      </motion.div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default LoginPage;
