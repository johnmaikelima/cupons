import mongoose from 'mongoose';
import slugify from 'slugify';
import { Store } from './Store';

export interface Coupon {
  id: string;
  title?: string;
  description: string;
  code?: string;
  type?: 'COUPON' | 'URL_CUPONADA';
  url: string;
  affiliateLink?: string;
  image?: string;
  store: string;
  expiresAt: Date;
  discount?: string;
  active?: boolean;
  provider?: string;
  externalId?: string;
  slug: string;
}

const couponSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String, required: true },
  code: { type: String },
  slug: { type: String, unique: true },
  type: {
    type: String,
    enum: ['COUPON', 'URL_CUPONADA'],
    default: 'COUPON'
  },
  url: { type: String, required: true },
  affiliateLink: { type: String, default: '' },
  image: { type: String },
  store: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  expiresAt: { 
    type: Date,
    required: false,
    default: null
  },
  discount: { type: String },
  provider: { 
    type: String, 
    enum: ['awin', 'lomadee', 'manual'],
    default: 'manual'
  },
  externalId: { type: String },
  active: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
couponSchema.index({ provider: 1 });
// Removido índice composto que estava causando problemas
couponSchema.index({ active: 1 });
couponSchema.index({ expiresAt: 1 });
couponSchema.index({ store: 1 });
couponSchema.index({ code: 1 });

// Gera slug único antes de salvar
couponSchema.pre('save', async function(next) {
  try {
    if (!this.slug) {
      // Gera o slug base
      let baseText = this.title || this.description;
      let baseSlug = slugify(baseText, { 
        lower: true,
        strict: true,
        trim: true,
        locale: 'pt'
      });

      // Adiciona um identificador único ao slug
      baseSlug = `${baseSlug}-${Date.now().toString(36)}`;
      this.slug = baseSlug;
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

// Deleta o modelo existente se ele existir
if (mongoose.models.Coupon) {
  delete mongoose.models.Coupon;
}

// Cria o modelo
export const Coupon = mongoose.model('Coupon', couponSchema);

// Função para remoção segura de índices
async function removeIndexSafely() {
  try {
    // Verifica se o índice existe antes de tentar removê-lo
    const indexes = await Coupon.collection.indexes();
    const indexExists = indexes.some(
      idx => idx.name === 'externalId_1_provider_1' || 
             JSON.stringify(idx.key) === JSON.stringify({ externalId: 1, provider: 1 })
    );
    
    if (indexExists) {
      await Coupon.collection.dropIndex('externalId_1_provider_1');
      console.log('Índice removido com sucesso');
    }
  } catch (error) {
    // Ignora erros de índice não existente
    if (error.codeName !== 'IndexNotFound') {
      console.warn('Não foi possível remover o índice:', error.message);
    }
  }
}

// Executa a remoção segura quando a conexão for estabelecida
if (mongoose.connection.readyState === 1) {
  // Já conectado
  removeIndexSafely().catch(err => 
    console.log('Não foi possível remover o índice ou ele não existe:', err.message)
  );
} else {
  // Aguarda a conexão ser estabelecida
  mongoose.connection.once('connected', () => {
    removeIndexSafely().catch(err => 
      console.log('Não foi possível remover o índice ou ele não existe:', err.message)
    );
  });
}
