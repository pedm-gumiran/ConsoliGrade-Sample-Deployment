import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';

export const signUpUser = async (email, password) => {
  try {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    if (signUpError) {
      if (signUpError.message?.includes('already registered')) {
        toast.error('This email is already registered.');
      } else {
        toast.error(`Sign-up failed: ${signUpError.message}`);
      }
      return null;
    }

    const authUserId = authData.user?.id;

    if (!authUserId) {
      toast.error('Failed to retrieve user ID from Supabase.');
      return null;
    }

    return authUserId;
  } catch (error) {
    toast.error(`Unexpected signup error: ${error.message}`);
    return null;
  }
};
