import mongoose from 'mongoose';

// Interface para os preços em diferentes lojas
interface StorePrice {
  price: number;
  url: string;
  lastUpdate: Date;
}

interface StorePrices {
  amazon?: StorePrice;
  kabum?: StorePrice;
  magalu?: StorePrice;
  terabyte?: StorePrice;
  pichau?: StorePrice;
}

// Schema para os preços em diferentes lojas
const StorePriceSchema = new mongoose.Schema({
  price: { type: Number, required: true },
  url: { type: String, required: true },
  lastUpdate: { type: Date, default: Date.now }
});

// Schema para todos os preços
const StorePricesSchema = new mongoose.Schema({
  amazon: StorePriceSchema,
  kabum: StorePriceSchema,
  magalu: StorePriceSchema,
  terabyte: StorePriceSchema,
  pichau: StorePriceSchema
});

// Schema principal do produto
const ComparisonProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  images: [String],
  description: { type: String },
  technicalSpecs: { type: Map, of: String }, // Características técnicas como chave-valor
  ean: { type: String, required: true, unique: true, index: true },
  category: { type: String, required: true },
  prices: { type: StorePricesSchema, default: {} }, // Objeto com preços por loja
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices para melhorar a performance das buscas
ComparisonProductSchema.index({ name: 'text', description: 'text' });
ComparisonProductSchema.index({ category: 1 });

// Campo virtual para o menor preço atual
ComparisonProductSchema.virtual('currentPrice').get(function() {
  if (!this.prices) return null;
  const validPrices = Object.values(this.prices)
    .filter(store => store && store.price && store.price > 0) // Considerar apenas preços maiores que zero
    .map(store => store.price);
  return validPrices.length > 0 ? Math.min(...validPrices) : null;
});

// Campo virtual para a loja com o menor preço
ComparisonProductSchema.virtual('bestStore').get(function() {
  if (!this.prices) return null;
  
  // Encontrar o menor preço válido
  const validPrices = Object.entries(this.prices)
    .filter(([_, store]) => store && store.price && store.price > 0)
    .map(([storeName, store]) => ({ storeName, price: store.price }));
  
  if (validPrices.length === 0) return null;
  
  // Encontrar a loja com o menor preço
  const minPrice = Math.min(...validPrices.map(item => item.price));
  const bestStore = validPrices.find(item => item.price === minPrice);
  
  return bestStore ? bestStore.storeName : null;
});

// Garantir que os virtuals sejam incluídos quando converter para JSON
ComparisonProductSchema.set('toJSON', { virtuals: true });
ComparisonProductSchema.set('toObject', { virtuals: true });

// Middleware para atualizar o updatedAt
ComparisonProductSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Interface do produto para TypeScript, estendendo o Document do Mongoose
export interface IComparisonProduct extends mongoose.Document {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  description?: string;
  technicalSpecs?: Map<string, string>;
  ean: string;
  category: string;
  prices: StorePrices; // Usa a interface StorePrices definida acima
  currentPrice?: number; // Campo virtual
  bestStore?: string; // Campo virtual
  createdAt?: Date;
  updatedAt?: Date;
}

// Criar ou recuperar o modelo, agora tipado com a interface
export const ComparisonProduct = mongoose.models.ComparisonProduct as mongoose.Model<IComparisonProduct> || 
  mongoose.model<IComparisonProduct>('ComparisonProduct', ComparisonProductSchema);

