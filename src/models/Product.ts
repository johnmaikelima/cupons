import mongoose from 'mongoose';

export interface IProduct {
  merchant_product_id: string; // Identificador único do produto na loja
  aw_deep_link: string;
  store_price: number;
  ean: string;
  merchant_name: string;
  in_stock?: number; // Novo campo para quantidade em estoque
  // Campos opcionais que podem ser preenchidos em outras importações
  merchant_image_url?: string;
  product_name?: string;
  merchant_category?: string;
  rating?: number;
  description?: string;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new mongoose.Schema({
  // Campos obrigatórios para importação
  merchant_product_id: { type: String, required: true }, // Identificador único do produto na loja
  aw_deep_link: { type: String, required: true },
  store_price: { type: Number, required: true },
  ean: { type: String, required: true },
  merchant_name: { type: String, required: true },
  in_stock: { type: Number, default: 0 }, // Novo campo para quantidade em estoque
  
  // Campos que eram obrigatórios no modelo original, agora com valores padrão
  merchant_image_url: { type: String, default: '/placeholder.png' },
  product_name: { type: String, default: '' },
  merchant_category: { type: String, default: 'Outros' },
  
  // Campos opcionais
  rating: { type: Number, default: 0 },
  description: { type: String, default: '' },
  currency: { type: String, default: 'BRL' },
}, {
  timestamps: true,
});

// Criar índices para melhorar a performance das buscas
productSchema.index({ product_name: 'text', merchant_category: 'text' });
productSchema.index({ merchant_category: 1 });
productSchema.index({ ean: 1 });
// Índice único para merchant_product_id para garantir que não haja duplicatas
productSchema.index({ merchant_product_id: 1 }, { unique: true });

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
