const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    formData, 
    selectedCliente,
    parcelasEditaveis 
  }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl mx-4">
          <h3 className="text-xl font-semibold mb-4">Confirmar Empréstimo</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Cliente:</p>
                <p>{selectedCliente?.nome}</p>
              </div>
              <div>
                <p className="font-semibold">Valor Base:</p>
                <p>{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(parseFloat(formData.valor))}</p>
              </div>
              <div>
                <p className="font-semibold">Juros:</p>
                <p>{formData.porcentagem}%</p>
              </div>
              <div>
                <p className="font-semibold">Valor Total:</p>
                <p>{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(parseFloat(formData.valorComJuros))}</p>
              </div>
              <div>
                <p className="font-semibold">Parcelas:</p>
                <p>{formData.total_parcelas}x de {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(parseFloat(formData.valorComJuros) / parseInt(formData.total_parcelas))}</p>
              </div>
              <div>
                <p className="font-semibold">Forma de Pagamento:</p>
                <p>{formData.forma_pagamento}</p>
              </div>
            </div>
  
            <div className="mt-6">
              <p className="font-semibold mb-2">Parcelas:</p>
              <div className="max-h-48 overflow-y-auto">
                {parcelasEditaveis.map((parcela, index) => (
                  <div key={index} className="flex justify-between py-2 border-b">
                    <span>Parcela {parcela.numero}</span>
                    <span>{new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(parseFloat(parcela.valor))}</span>
                    <span>{parcela.data}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-4">
            <button 
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-success"
              onClick={onConfirm}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  export default ConfirmationModal;