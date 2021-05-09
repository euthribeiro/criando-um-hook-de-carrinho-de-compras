import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get('/products/' + productId);

      const product = response.data;

      const productInCart = cart.filter(p => p.id === product.id);

      const responseStock = await api.get('/stock/' + productId);

      let newCart = [];

      if (productInCart.length === 0) {

        if (responseStock.data.amount < 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newProduct = {
          ...product,
          amount: 1,
        };

        newCart = [
          ...cart,
          newProduct
        ];
      } else {

        if (responseStock.data.amount < productInCart[0].amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newProduct = {
          ...productInCart[0],
          amount: productInCart[0].amount + 1
        }

        newCart = [
          ...cart.filter(p => p.id !== newProduct.id),
          newProduct
        ];
      }

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(p => p.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const responseStock = await api.get('stock/' + productId);

      if (responseStock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
