import { MongoClient, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';


/**
 * Conexão global em cache.
 * Em um ambiente de desenvolvimento com `npm run dev`, este arquivo é recarregado a cada mudança,
 * o que limpa a variável `cached`. Portanto, armazenamos a conexão no objeto `global`
 * para que ela persista entre as recargas do Next.js.
 * Em produção, o cache funciona normalmente dentro da mesma instância de função serverless.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Por favor, defina a variável de ambiente MONGODB_URI dentro de .env.local'
  );
}

export async function connectDB() {
  // Se já temos uma conexão em cache, a reutilizamos.
  if (cached.conn) {
    return cached.conn;
  }

  // Se não há uma conexão, mas há uma promessa de conexão em andamento,
  // esperamos que ela termine para evitar criar uma nova conexão concorrente.
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Desativa o buffer do Mongoose, recomendado para serverless
      maxPoolSize: 5, // Ajuste conforme a necessidade
      minPoolSize: 1,
      connectTimeoutMS: 10000, // Timeout de 10 segundos para conectar
      socketTimeoutMS: 45000, // Timeout de 45 segundos para sockets
    };

    console.log('=> criando nova conexão com o banco de dados...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('=> conexão com o banco de dados estabelecida com sucesso!');
      return mongooseInstance;
    }).catch(error => {
      console.error('=> erro ao conectar com o banco de dados:', error);
      // Limpa a promessa em caso de erro para permitir uma nova tentativa
      cached.promise = null; 
      throw error;
    });
  }
  
  try {
    // Aguardamos a promessa de conexão (seja a que acabamos de criar ou uma já existente)
    // e armazenamos a conexão bem-sucedida no cache.
    cached.conn = await cached.promise;
  } catch (e) {
    // Se a conexão falhar, limpamos a promessa para permitir futuras tentativas.
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}



