import { supabase } from './supabaseClient';

export interface EmailPayload {
  to: string;
  employeeName: string;
  requestId: number | string;
  status: string;
  comments?: string;
  subject?: string;
}

export const sendStatusEmail = async (payload: EmailPayload) => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: payload,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw error;
  }

  return data;
};