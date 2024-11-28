'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DollarSign, Shield, Clock, Users, Mail, Phone, X } from 'lucide-react';
import { useState } from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ContactModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4">Fale Conosco</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Phone className="text-success w-6 h-6" />
            <span className="text-lg">(99) 98431-8480</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="text-success w-6 h-6" />
            <span className="text-lg">devfull1234@gmail.com</span>
          </div>
          <p className="text-base-content/80 mt-4">
            Nossa equipe está disponível para ajudar você a começar!
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  const iconAnimation = {
    hover: {
      scale: 1.2,
      rotate: 360,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
    >
      <div className="card-body text-center">
        <motion.div 
          className="text-success mb-4 mx-auto"
          whileHover="hover"
          variants={iconAnimation}
        >
          {icon}
        </motion.div>
        <h3 className="card-title text-2xl mb-3 justify-center">{title}</h3>
        <p className="text-lg">{description}</p>
      </div>
    </motion.div>
  );
};

export default function HomePage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base-200">
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-20"
        >
          <motion.h1 
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="text-6xl font-bold mb-6 text-success"
          >
            Revolucione sua Gestão de Empréstimos
          </motion.h1>
          <motion.p 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl mb-12"
          >
            Simplifique seus processos, aumente sua eficiência e tome decisões mais inteligentes
          </motion.p>
          <div className="flex justify-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/login')}
              className="btn btn-success btn-lg text-lg px-8"
            >
              Comece Agora
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsModalOpen(true)}
              className="btn btn-outline btn-success btn-lg text-lg px-8"
            >
              Entre em Contato
            </motion.button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<DollarSign className="w-16 h-16" />}
            title="Controle Total"
            description="Gerencie todos os seus empréstimos em um único lugar, com relatórios detalhados e análises em tempo real"
          />
          <FeatureCard
            icon={<Shield className="w-16 h-16" />}
            title="Máxima Segurança"
            description="Sistema protegido com tecnologia de ponta, garantindo a confidencialidade dos seus dados"
          />
          <FeatureCard
            icon={<Clock className="w-16 h-16" />}
            title="Economia de Tempo"
            description="Automatize processos e reduza o tempo gasto com tarefas administrativas em até 70%"
          />
          <FeatureCard
            icon={<Users className="w-16 h-16" />}
            title="Gestão Inteligente"
            description="Acompanhe o histórico completo dos clientes e tome decisões baseadas em dados"
          />
        </div>
      </div>
    </div>
  );
}