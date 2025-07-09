import { NextResponse } from 'next/server';
import { parse } from 'csv-parse';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { Product } from '@/models/Product';
import multer from 'multer';
import { promisify } from 'util';
import { createReadStream } from 'fs';

// Configura o Multer
const upload = multer({ dest: '/tmp/uploads/' });
const uploadMiddleware = promisify(upload.single('file'));

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  try {
    // Processa o upload do arquivo
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Lê o conteúdo do arquivo
    const buffer = await file.arrayBuffer();
    const csvContent = Buffer.from(buffer).toString('utf-8');

    // Conecta ao MongoDB
    await connectDB();

    // Variáveis para controle
    let totalProcessados = 0;
    let totalSalvos = 0;
    const BATCH_SIZE = 500;
    let batch: any[] = [];

    // Processa o CSV usando o parser
    const records = await new Promise((resolve, reject) => {
      const results: any[] = [];
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        skip_records_with_error: true
      })
      .on('data', (data) => results.push(data))
      .on('error', reject)
      .on('end', () => {
        console.log(`CSV parseado com sucesso. Total de registros: ${results.length}`);
        console.log('Exemplo de registro:', results.length > 0 ? JSON.stringify(results[0]) : 'Nenhum registro');
        resolve(results);
      });
    });

    // Processa cada linha do CSV
    for (const record of records as any[]) {
      // Prepara o documento com todos os campos necessários
      const doc: any = {
        // Identificador único do produto na loja
        merchant_product_id: record.merchant_product_id?.trim() || `${record.merchant_name?.trim()}_${record.ean?.trim()}`,
        // Campos obrigatórios solicitados
        aw_deep_link: record.aw_deep_link?.trim() || '',
        store_price: parseFloat((record.search_price || record.store_price || '0').toString().replace(',', '.')),
        ean: record.ean?.trim(),
        merchant_name: record.merchant_name?.trim() || '',
        // Campo adicional de estoque
        in_stock: record.in_stock ? parseInt(record.in_stock.toString()) : 0,
        // Campos obrigatórios para o modelo
        merchant_image_url: '/placeholder.png',
        product_name: record.product_name?.trim() || record.merchant_name?.trim() || 'Produto',
        merchant_category: 'Outros'
      };

      // Valida o documento - todos os campos são obrigatórios
      if (doc.merchant_product_id && doc.aw_deep_link && doc.store_price && doc.ean && doc.merchant_name) {
        
        // Log para debug
        if (totalProcessados < 5) {
          console.log('Documento válido:', JSON.stringify(doc));
        }
        
        // Os campos obrigatórios já foram adicionados acima
        
        batch.push(doc);
        totalProcessados++;
      } else {
        if (totalProcessados < 5) {
          console.log('Documento inválido:', JSON.stringify(doc), 
            'Campos: EAN=', !!doc.ean, 
            'Link=', !!doc.aw_deep_link, 
            'Loja=', !!doc.merchant_name, 
            'Preço=', !isNaN(doc.store_price) && doc.store_price > 0);
        }
      }

      // Processa o lote quando atingir o tamanho máximo
      if (batch.length >= BATCH_SIZE) {
        const result = await processaBatch(batch);
        totalSalvos += result;
        console.log(`Processados ${totalProcessados} produtos, salvos ${totalSalvos}`);
        batch = [];
      }
    }

    // Processa o último lote
    if (batch.length > 0) {
      const result = await processaBatch(batch);
      totalSalvos += result;
      console.log(`Processados ${totalProcessados} produtos, salvos ${totalSalvos}`);
    }

    return NextResponse.json({
      message: 'Produtos importados com sucesso',
      totalProcessados,
      totalSalvos
    });

  } catch (error) {
    console.error('Erro ao importar produtos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao importar produtos' },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar um lote de produtos
async function processaBatch(batch: any[]) {
  if (!batch.length) return 0;

  try {
    // Usar create para inserir documentos um a um para garantir que o mongoose valide corretamente
    let salvos = 0;
    
    try {
      // Log detalhado do primeiro item do lote para debug
      if (batch.length > 0) {
        console.log('Exemplo de item a ser salvo/atualizado:', JSON.stringify(batch[0]));
      }
      
      // Acessa a coleção diretamente para operações em lote
      const db = mongoose.connection.db;
      const collection = db.collection('products');
      
      // Prepara operações de upsert para cada item do lote
      const operations = batch.map(doc => {
        return {
          updateOne: {
            filter: { merchant_product_id: doc.merchant_product_id },
            // Para produtos existentes, atualiza apenas o estoque
            // Para novos produtos, insere todos os campos
            update: {
              $setOnInsert: {
                aw_deep_link: doc.aw_deep_link,
                store_price: doc.store_price,
                ean: doc.ean,
                merchant_name: doc.merchant_name,
                merchant_image_url: doc.merchant_image_url,
                product_name: doc.product_name,
                merchant_category: doc.merchant_category,
                rating: doc.rating || 0,
                description: doc.description || '',
                currency: doc.currency || 'BRL',
              },
              // Sempre atualiza o estoque
              $set: {
                in_stock: doc.in_stock
              }
            },
            upsert: true
          }
        };
      });
      
      // Executa as operações em lote
      const result = await collection.bulkWrite(operations, { ordered: false });
      
      // Calcula quantos foram inseridos e quantos foram atualizados
      const inseridos = result.upsertedCount || 0;
      const atualizados = result.modifiedCount || 0;
      salvos = inseridos + atualizados;
      
      console.log(`Lote processado: ${inseridos} produtos novos inseridos, ${atualizados} produtos atualizados (estoque)`); 
    } catch (batchError) {
      console.error('Erro ao processar lote:', batchError.message);
      console.error('Stack trace:', batchError.stack);
    }
    
    return salvos;
  } catch (error) {
    console.error('Erro ao processar lote:', error);
    return 0; // Retorna 0 em vez de propagar o erro para continuar o processamento
  }
}
