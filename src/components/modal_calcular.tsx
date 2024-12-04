import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Calculator } from 'lucide-react';

const ParcelasModal = ({ 
  isOpen, 
  onClose, 
  parcelas, 
  onParcelaChange, 
  onRecalcular 
}) => {
  const [recalculoSucesso, setRecalculoSucesso] = useState(false);

  if (!isOpen) return null;

  const handleRecalcular = () => {
    onRecalcular();
    setRecalculoSucesso(true);
    setTimeout(() => setRecalculoSucesso(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Detalhes das Parcelas</h3>
        
        <div className="space-y-4">
          {parcelas && parcelas.map((parcela, index) => (
            <div key={parcela.numero} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="flex items-center gap-2 min-w-[120px]">
                <CreditCard className="w-5 h-5" />
                Parcela {parcela.numero}
              </span>
              
              <div className="flex-1 flex gap-4">
                <input
                  type="number"
                  className="input input-bordered w-32"
                  value={parcela.valor}
                  onChange={(e) => onParcelaChange(index, "valor", e.target.value)}
                />
                
                <input
                  type="date"
                  className="input input-bordered w-40"
                  value={parcela.data.split('/').reverse().join('-')}
                  onChange={(e) => onParcelaChange(index, "data", e.target.value)}
                />
                
                <span className="flex items-center gap-2">
                  {parcela.status === "Paga" ? 
                    <CheckCircle2 className="w-5 h-5 text-green-600" /> : 
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  }
                  {parcela.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end gap-4">
          <button 
            onClick={handleRecalcular}
            className={`btn ${recalculoSucesso ? 'btn-success' : 'btn-primary'} gap-2`}
          >
            <Calculator className="w-5 h-5" />
            {recalculoSucesso ? 'Recalculado!' : 'Recalcular'}
          </button>
          
          <button 
            className="btn btn-ghost"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParcelasModal;