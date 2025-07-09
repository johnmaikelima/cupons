import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ComparisonProduct } from '@/models/ComparisonProduct';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get('store');
  const productId = searchParams.get('product');

  // Se os parâmetros essenciais não estiverem presentes, redireciona para a página inicial.
  if (!store || !productId) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  try {
    await dbConnect();

    const product = await ComparisonProduct.findById(productId).lean();

    if (!product) {
      // Se o produto não for encontrado, redireciona para a página inicial.
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    // Acessa os dados da loja específica dentro do objeto de preços do produto.
    const storeData = product.prices[store as keyof typeof product.prices];
    const redirectUrl = storeData?.url;

    if (redirectUrl) {
      // Se um URL de redirecionamento for encontrado, redireciona o usuário.
      // Futuramente, podemos adicionar um registro de clique aqui para análise.
      return NextResponse.redirect(new URL(redirectUrl));
    } else {
      // Se não houver URL para a loja, redireciona para a página do produto no nosso site.
      const productPageUrl = new URL(`/produtos/${product.slug || product._id}`, request.url);
      return NextResponse.redirect(productPageUrl);
    }

  } catch (error) {
    console.error('Erro no redirecionamento:', error);
    // Em caso de erro, redireciona para a página inicial como medida de segurança.
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }
}
