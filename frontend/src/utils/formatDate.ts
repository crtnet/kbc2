// utils/formatDate.ts
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};