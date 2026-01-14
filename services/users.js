import { supabase } from './supabase';

export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    console.log('Success! Users:', data);
    return data;
  } catch (error) {
    console.error('Connection failed:', error);
    return null;
  }
};