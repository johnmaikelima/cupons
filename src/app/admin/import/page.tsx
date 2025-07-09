'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo do arquivo
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    // Validar tamanho (máximo 3GB)
    const MAX_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
    if (selectedFile.size > MAX_SIZE) {
      setError('O arquivo é muito grande. O tamanho máximo permitido é 3GB');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(0);

    try {
      setProgress(10); // Indica que o upload começou

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import/file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload do arquivo');
      }

      const data = await response.json();
      console.log('Upload concluído:', data);
      
      setProgress(100);
      router.refresh();
      router.push('/admin/comparacao-de-preco');
    } catch (error) {
      console.error('Erro no upload:', error);
      setError(error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo');
    } finally {
      setIsLoading(false);
      setFile(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-8">Importar Produtos</h1>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                Selecione o arquivo CSV
              </label>
              <input
                type="file"
                id="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50"
              />
            </div>

            {isLoading && (
              <div className="mt-4 space-y-2">
                <div className="h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-blue-600 rounded transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Processando... {progress}%
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 text-red-600 text-sm p-2 bg-red-50 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Instruções</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>O arquivo CSV deve conter os seguintes campos <span className="font-semibold text-blue-600">obrigatórios</span>:</li>
          <div className="bg-blue-50 p-4 rounded-md mb-6">
            <h3 className="font-bold mb-2">Campos obrigatórios do CSV:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>merchant_product_id</code> - Identificador único do produto na loja (ou será gerado automaticamente como merchant_name_ean)</li>
              <li><code>ean</code> - Código EAN do produto</li>
              <li><code>aw_deep_link</code> - Link de afiliado</li>
              <li><code>merchant_name</code> - Nome da loja</li>
              <li><code>search_price</code> - Preço do produto</li>
            </ul>
            <p className="mt-2">Campo opcional:</p>
            <ul className="list-disc pl-5">
              <li><code>in_stock</code> - Quantidade em estoque (padrão: 0)</li>
            </ul>
            <p className="mt-2 text-sm text-gray-600">
              Produtos novos (com merchant_product_id não existente) serão adicionados ao banco de dados.
              <br />
              Produtos existentes (com merchant_product_id já cadastrado) terão apenas o campo <strong>in_stock</strong> atualizado.
              <br />
              Produtos sem algum dos campos obrigatórios serão ignorados.
            </p>
          </div>
          <li>O arquivo deve estar no formato CSV com cabeçalho</li>
          <li>O processo pode demorar alguns minutos dependendo do tamanho do arquivo</li>
        </ul>
      </div>
    </div>
  );
}
