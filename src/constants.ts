import { Category } from './types';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'juguetes', label: 'Juguetes' },
  { value: 'bazar', label: 'Bazar' },
  { value: 'libreria', label: 'Librería' },
  { value: 'regaleria', label: 'Regalería' },
  { value: 'electronica', label: 'Electrónica' },
];

export const TOKEN_PACKAGES = [
  { amount: 15, price: 1000, description: "Ideal para pruebas rápidas" },
  { amount: 50, price: 3000, description: "Para vendedores activos", recommended: true },
  { amount: 100, price: 5000, description: "Máximo ahorro por token" }
];
