import { createContext, useContext, useReducer } from 'react';

const OrderContext = createContext();

const orderReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_ITEMS':
      return {
        ...state,
        orders: {
          ...state.orders,
          [action.tableNumber]: action.items,
        },
      };

    case 'ADD_ITEMS':
      const existingOrders = state.orders[action.tableNumber] || [];
      const mergedItems = action.items.reduce((acc, newItem) => {
        const existingItem = acc.find((item) => item.name === newItem.name);
        if (existingItem) {
          return acc.map((item) =>
            item.name === newItem.name
              ? { ...item, quantity: item.quantity + newItem.quantity }
              : item
          );
        }
        return [...acc, newItem];
      }, existingOrders);

      return {
        ...state,
        orders: {
          ...state.orders,
          [action.tableNumber]: mergedItems,
        },
      };

    case 'CLEAR_ORDERS':
      return {
        ...state,
        orders: {
          ...state.orders,
          [action.tableNumber]: [],
        },
      };

    case 'CLEAR_TABLE':
      const { [action.tableNumber]: removedTable, ...remainingOrders } =
        state.orders;
      return {
        ...state,
        orders: remainingOrders,
      };

    default:
      return state;
  }
};

export const OrderProvider = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, { orders: {} });

  return (
    <OrderContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => useContext(OrderContext);
