import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';

export const signInUser = async (email, password) => {
  try {
    //  Sign in via Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError) {
      toast.error('Invalid email or password.');
      return null;
    }

    const authUser = authData.user;

    //  Fetch first name from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name')
      .eq('auth_user_id', authUser.id)
      .single(); // fetch single record

    if (userError) {
      toast.error('Failed to fetch user info.');
      return null;
    }

    return { ...authUser, first_name: userData.first_name };
  } catch (error) {
    toast.error(`Unexpected login error: ${error.message}`);
    return null;
  }
};
