import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from '../../../api/axios';

export default function useUsers() {
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //  Fetch users from backend
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users');
      if (response.data.success) {
        const usersData = response.data.users || [];
        const totalCount = response.data.totalCount || 0;
        setUsers(usersData);
        setTotalCount(totalCount);
        console.log('Users fetched:', usersData);
        setError(null);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err.message);
      setError(err);
      toast.error(`Error loading users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch users when hook loads
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const deleteUsers = async (userIds) => {
    try {
      const response = await axios.delete('/api/users/delete_users', {
        data: { userIds },
      });
      if (response.data.success) {
        setUsers((prev) =>
          prev.filter((user) => !userIds.includes(user.user_id)),
        );
        toast.success('Users deleted successfully');
      } else {
        throw new Error(response.data.message || 'Failed to delete users');
      }
    } catch (err) {
      console.error('Error deleting users:', err);
      toast.error('Failed to delete users');
      throw err;
    }
  };

  return {
    users,
    totalCount,
    loading,
    error,
    refetch: fetchUsers,
    deleteUsers,
  };
}
