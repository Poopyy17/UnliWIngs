export const getStatusColorHex = (status) => {
  const colors = {
    pending: '#EAB308',
    preparing: '#3B82F6',
    completed: '#22C55E',
    paid: '#15803D',
  };
  return colors[status] || '#6B7280';
};
