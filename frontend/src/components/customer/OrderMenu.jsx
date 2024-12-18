import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createOrder, updateOrder } from '@/services/api';
import { useOrder } from '../../../context/orderContext';
import { motion } from 'framer-motion';
import { MinusCircle, PlusCircle, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const MOCK_MENU = [
  {
    id: 'unliwings',
    name: 'Unliwings',
    price: 279,
    category: 'Unliwings',
    description: 'Unlimited wings with choice of flavors (Price per person)',
    isUnliwings: true,
    allowQuantity: true,
  },
  // Ala Carte
  {
    id: 'alacarte_3',
    name: '3pcs Chicken',
    price: 89,
    category: 'Ala Carte',
    description: '3pcs chicken (1 Flavor only)',
    maxFlavors: 1,
    pieces: 3,
  },
  {
    id: 'alacarte_6',
    name: '6pcs Chicken',
    price: 149,
    category: 'Ala Carte',
    description: '6pcs chicken (Max 2 Flavors)',
    maxFlavors: 2,
    pieces: 6,
  },
  {
    id: 'alacarte_12',
    name: '12pcs Chicken',
    price: 279,
    category: 'Ala Carte',
    description: '12pcs chicken (Max 3 Flavors)',
    maxFlavors: 3,
    pieces: 12,
  },
  {
    id: 'alacarte_24',
    name: '24pcs Chicken',
    price: 549,
    category: 'Ala Carte',
    description: '24pcs chicken (Max 4 Flavors)',
    maxFlavors: 4,
    pieces: 24,
  },
  {
    id: 'alacarte_36',
    name: '36pcs Chicken',
    price: 829,
    category: 'Ala Carte',
    description: '36pcs chicken (Max 6 Flavors)',
    maxFlavors: 6,
    pieces: 36,
  },
  {
    id: 'alacarte_48',
    name: '48pcs Chicken',
    price: 999,
    category: 'Ala Carte',
    description: '48pcs chicken (Max 8 Flavors)',
    maxFlavors: 8,
    pieces: 48,
  },
  // Rice Meals
  {
    id: 'ricemeal_3',
    name: '3pcs with Rice',
    price: 99,
    category: 'Rice Meals',
    description: '3pcs chicken with 1 rice (1 Flavor only)',
    maxFlavors: 1,
    rice: 1,
  },
  {
    id: 'ricemeal_6_1',
    name: '6pcs with 1 Rice',
    price: 159,
    category: 'Rice Meals',
    description: '6pcs chicken with 1 rice (1 Flavor only)',
    maxFlavors: 1,
    rice: 1,
  },
  {
    id: 'ricemeal_6_2',
    name: '6pcs with 2 Rice',
    price: 169,
    category: 'Rice Meals',
    description: '6pcs chicken with 2 rice (1 Flavor only)',
    maxFlavors: 1,
    rice: 2,
  },
  {
    id: 'ricemeal_12',
    name: '12pcs with 2 Rice',
    price: 299,
    category: 'Rice Meals',
    description: '12pcs chicken with 2 rice (1 Flavor only)',
    maxFlavors: 1,
    rice: 2,
  },
  {
    id: 'ricemeal_24',
    name: '24pcs with Rice',
    price: 589,
    category: 'Rice Meals',
    description: '24pcs chicken with 1 rice (1 Flavor only)',
    maxFlavors: 1,
    rice: 1,
  },
  {
    id: 'ricemeal_nuggets',
    name: 'Nuggets with Rice',
    price: 109,
    category: 'Rice Meals',
    description: 'Chicken nuggets with rice',
    maxFlavors: 0,
    rice: 1,
  },
  // Snacks
  {
    id: 'nuggets',
    name: 'Chicken Nuggets',
    price: 99,
    category: 'Snacks',
  },
  {
    id: 'kikiam',
    name: 'Kikiam',
    price: 69,
    category: 'Snacks',
  },
  {
    id: 'lumpia',
    name: 'Lumpiang Shanghai',
    price: 99,
    category: 'Snacks',
  },
  // Nachos
  {
    id: 'nachos_cheese',
    name: 'Cheesy Nachos',
    price: 79,
    category: 'Nachos',
  },
  {
    id: 'nachos_overload',
    name: 'Overload Nachos',
    price: 89,
    category: 'Nachos',
  },
  {
    id: 'nachos_fries',
    name: 'Overload Nachos Fries',
    price: 99,
    category: 'Nachos',
  },
  // Fries
  {
    id: 'fries_cheese',
    name: 'Cheese Fries',
    price: 59,
    category: 'Fries',
  },
  {
    id: 'fries_sourcream',
    name: 'Sour Cream Fries',
    price: 59,
    category: 'Fries',
  },
  {
    id: 'fries_bbq',
    name: 'BBQ Fries',
    price: 59,
    category: 'Fries',
  },
  // Refreshers
  {
    id: 'tea',
    name: 'House Blend Iced Tea',
    category: 'Refreshers',
    sizes: [
      { size: 'Medium', price: 49 },
      { size: 'Large', price: 59 },
      { size: '1 Liter', price: 79 },
    ],
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    category: 'Refreshers',
    sizes: [
      { size: 'Medium', price: 49 },
      { size: 'Large', price: 59 },
      { size: '1 Liter', price: 79 },
    ],
  },
  {
    id: 'lychee',
    name: 'Lychee',
    category: 'Refreshers',
    sizes: [
      { size: 'Medium', price: 49 },
      { size: 'Large', price: 59 },
      { size: '1 Liter', price: 79 },
    ],
  },
  {
    id: 'green_apple',
    name: 'Green Apple',
    category: 'Refreshers',
    sizes: [
      { size: 'Medium', price: 49 },
      { size: 'Large', price: 59 },
      { size: '1 Liter', price: 79 },
    ],
  },
  {
    id: 'blueberry',
    name: 'Blueberry',
    category: 'Refreshers',
    sizes: [
      { size: 'Medium', price: 49 },
      { size: 'Large', price: 59 },
      { size: '1 Liter', price: 79 },
    ],
  },
  {
    id: 'lemon',
    name: 'Lemon',
    category: 'Refreshers',
    sizes: [
      { size: 'Medium', price: 49 },
      { size: 'Large', price: 59 },
      { size: '1 Liter', price: 79 },
    ],
  },
  // Extras
  {
    id: 'rice',
    name: 'Rice',
    price: 15,
    category: 'Extras',
  },
  {
    id: 'dip_garlicmayo',
    name: 'Garlic Mayo Dip',
    price: 25,
    category: 'Extras',
  },
  {
    id: 'dip_chilicheese',
    name: 'Chili Cheese Dip',
    price: 25,
    category: 'Extras',
  },
  {
    id: 'dip_cheese',
    name: 'Cheese Dip',
    price: 25,
    category: 'Extras',
  },
  {
    id: 'dip_mayo',
    name: 'Plain Mayo',
    price: 15,
    category: 'Extras',
  },
  {
    id: 'dip_ketchup',
    name: 'Ketchup',
    price: 15,
    category: 'Extras',
  },
];

const REFRESHERS = [
  {
    id: 'tea',
    name: 'House Blend Iced Tea',
    sizes: [
      { size: 'Medium', price: 49 },
      { size: 'Large', price: 59 },
      { size: '1 Liter', price: 79 },
    ],
    category: 'Refreshers',
  },
  // Add other drinks with same structure
];

const WING_FLAVORS = [
  'Soy Garlic',
  'Spicy Buffalo',
  'Honey Butter',
  'Honey Mustard',
  'Garlic Parmesan',
  'Wings Express Signature',
  'Salted Egg',
  'Spicy Teriyaki',
  'Teriyaki',
  'Honey Garlic',
  'Lemon Glazed',
  'Sweet Chili',
  'Garlic Butter',
  'BBQ',
  'Spicy BBQ',
  'Cheesy Cheese',
  'Chili Cheese',
  'Salt and Pepper',
];

const OrderMenu = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useOrder();
  const [orderItems, setOrderItems] = useState([]);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [itemFlavors, setItemFlavors] = useState({});
  const [selectedSizes, setSelectedSizes] = useState({});
  const [selectedRefresher, setSelectedRefresher] = useState(null);
  const [unliwingsHistory, setUnliwingsHistory] = useState([]);
  const tableNumber = location.state?.tableNumber;

  const categories = [...new Set(MOCK_MENU.map((item) => item.category))];

  // Group menu items by category
  const menuByCategory = MOCK_MENU.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => {
      if (item.isUnliwings) {
        // Only charge for initial order
        return item.flavorHistory?.length > 0
          ? sum
          : sum + item.price * item.originalQuantity;
      }
      return sum + item.price * item.quantity;
    }, 0);
  };

  const hasActiveUnliwingsOrder = location.state?.currentItems?.some(
    (item) => item.isUnliwings && item.flavorOrderStatus === 'flavor_pending'
  );

  useEffect(() => {
    // Load existing order items from location state if available
    if (location.state?.currentItems) {
      const currentItems = location.state.currentItems;
      const unliwingsItem = currentItems.find((item) => item.isUnliwings);

      if (unliwingsItem) {
        // If this is a reorder, only keep the Unliwings item
        if (unliwingsItem.flavorHistory?.length > 0) {
          setOrderItems([
            {
              ...unliwingsItem,
              selectedFlavors: [], // Clear for new selection
              flavorOrderStatus: 'flavor_pending',
            },
          ]); // Only keep Unliwings
          setSelectedFlavors([]);
          setUnliwingsHistory(unliwingsItem.flavorHistory || []);
        } else {
          // First order - keep existing state
          setOrderItems(currentItems);
          setSelectedFlavors(unliwingsItem.selectedFlavors || []);
          setUnliwingsHistory([]);
        }
      } else {
        // No Unliwings - start fresh
        setOrderItems([]);
      }
    }
  }, [location.state]);
  const addToOrder = (newItem, selectedSize = null) => {
    // Handle Unliwings items
    if (newItem.isUnliwings) {
      setOrderItems((prevItems) => {
        const existingUnliwings = prevItems.find((item) => item.isUnliwings);

        if (existingUnliwings) {
          if (existingUnliwings.flavorHistory?.length > 0) {
            // Re-order: preserve original quantity and update history
            return prevItems.map((item) =>
              item.isUnliwings
                ? {
                    ...item,
                    selectedFlavors: [],
                    flavorHistory: [
                      ...(item.flavorHistory || []),
                      item.selectedFlavors,
                    ],
                    flavorOrderStatus: 'flavor_pending',
                  }
                : item
            );
          } else {
            // Initial order: allow quantity increase
            return prevItems.map((item) =>
              item.isUnliwings
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                    originalQuantity: item.quantity + 1,
                  }
                : item
            );
          }
        }

        // New Unliwings order
        return [
          ...prevItems,
          {
            ...newItem,
            quantity: 1,
            selectedFlavors: [],
            flavorHistory: [],
            originalQuantity: 1,
            flavorOrderStatus: 'flavor_pending',
          },
        ];
      });
      return;
    }

    // Handle Refresher items
    if (newItem.category === 'Refreshers') {
      if (!selectedSize) {
        toast({
          title: 'Select size',
          description: 'Please select a size first',
          variant: 'destructive',
        });
        return;
      }

      const itemId = `${newItem.id}_${selectedSize.size}`;
      const itemToAdd = {
        ...newItem,
        id: itemId,
        price: selectedSize.price,
        selectedSize: selectedSize.size,
      };

      setOrderItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === itemId);
        if (existingItem) {
          return prevItems.map((item) =>
            item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prevItems, { ...itemToAdd, quantity: 1 }];
      });
      return;
    }

    // Handle regular items
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === newItem.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { ...newItem, quantity: 1 }];
    });
  };

  const removeFromOrder = (itemId) => {
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevItems.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevItems.filter((item) => item.id !== itemId);
    });

    // Only clear flavors if removing last Unliwings order
    if (itemId === 'unliwings' && getItemQuantity('unliwings') <= 1) {
      setSelectedFlavors([]);
    }
  };

  const toggleFlavor = (flavor) => {
    setSelectedFlavors((prev) => {
      if (prev.includes(flavor)) {
        return prev.filter((f) => f !== flavor);
      }
      return [...prev, flavor];
    });
  };

  const toggleItemFlavor = (itemId, flavor) => {
    setItemFlavors((prev) => {
      const currentFlavors = prev[itemId] || [];
      const item = orderItems.find((item) => item.id === itemId);

      if (currentFlavors.includes(flavor)) {
        return {
          ...prev,
          [itemId]: currentFlavors.filter((f) => f !== flavor),
        };
      }

      // Check if max flavors limit is reached
      if (currentFlavors.length >= (item?.maxFlavors || 0)) {
        toast({
          title: 'Max flavors reached',
          description: `This item can only have ${item.maxFlavors} flavor${
            item.maxFlavors > 1 ? 's' : ''
          }`,
          variant: 'destructive',
        });
        return prev;
      }

      return {
        ...prev,
        [itemId]: [...currentFlavors, flavor],
      };
    });
  };

  const handleRefresherSelect = (item) => {
    setSelectedRefresher(item);
  };

  const handleCloseRefresher = () => {
    setSelectedRefresher(null);
  };

  const getItemQuantity = (itemId) => {
    const item = orderItems.find((item) => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Update submitOrder function
  const submitOrder = async () => {
    try {
      const cleanTableNumber = tableNumber?.replace('Table-', '');
      if (!cleanTableNumber) {
        toast({
          title: 'Error',
          description: 'Table number is required',
          variant: 'destructive',
        });
        return;
      }

      const existingUnliwings = orderItems.find(
        (item) => item.isUnliwings && item.flavorHistory?.length > 0
      );

      const orderWithFlavors = orderItems.map((item) => {
        if (item.isUnliwings) {
          const isReorder = item.flavorHistory?.length > 0;
          return {
            ...item,
            selectedFlavors,
            flavorHistory: isReorder
              ? [...item.flavorHistory, selectedFlavors]
              : [],
            originalQuantity: item.originalQuantity || item.quantity,
            flavorOrderStatus: 'flavor_pending',
            status: 'pending',
            price: item.price,
            originalOrderId: location.state?.orderId, // Add reference to original order
          };
        }

        return {
          ...item,
          selectedFlavors: itemFlavors[item.id] || [],
          total: item.price * item.quantity,
          status: 'pending',
          originalOrderId: location.state?.orderId, // Add reference to original order
        };
      });

      const orderData = {
        tableNumber: cleanTableNumber,
        items: orderWithFlavors,
        total: calculateTotal(orderWithFlavors),
        status: 'pending',
        isPaid: false,
        receiptNumber: null,
        originalOrderId: location.state?.orderId, // Add reference to original order
      };

      const response = await createOrder(orderData);
      if (!response._id) throw new Error('Failed to create order');

      // Update order context with only the new items
      dispatch({
        type: 'UPDATE_ITEMS',
        tableNumber,
        items: response.items,
        orderId: response._id,
        status: response.status,
        isPaid: response.isPaid,
      });

      navigate('/summary', {
        state: {
          tableNumber,
          orderId: response._id,
          items: response.items,
          status: response.status,
        },
      });
    } catch (error) {
      console.error('Order submission error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit order',
        variant: 'destructive',
      });
    }
  };

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menu</h1>
            {tableNumber && (
              <Badge variant="outline" className="mt-2">
                Table {tableNumber}
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-full">
          <Tabs defaultValue={categories[0]} className="w-full">
            <TabsList className="mb-4 flex flex-wrap">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="flex-1">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Menu tabs content */}
            {categories.map((category) => (
              <TabsContent key={category} value={category}>
                {/* Unliwings flavor selection */}
                {category === 'Unliwings' && (
                  <div className="mb-8">
                    {(getItemQuantity('unliwings') > 0 ||
                      hasActiveUnliwingsOrder) && (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-semibold">
                            Select Wing Flavors
                            {unliwingsHistory.length > 0 ? (
                              <span className="ml-2 text-sm text-muted-foreground">
                                (Reorder #{unliwingsHistory.length + 1})
                              </span>
                            ) : (
                              ` (${getItemQuantity('unliwings')} person${
                                getItemQuantity('unliwings') > 1 ? 's' : ''
                              })`
                            )}
                          </h2>
                          {unliwingsHistory.length > 0 && (
                            <Badge variant="outline">
                              Reorder #{unliwingsHistory.length + 1}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {WING_FLAVORS.map((flavor) => (
                            <Button
                              key={flavor}
                              variant={
                                selectedFlavors.includes(flavor)
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() => toggleFlavor(flavor)}
                              className="w-full"
                            >
                              {flavor}
                            </Button>
                          ))}
                        </div>
                        {unliwingsHistory.length > 0 && (
                          <div className="mt-4">
                            <h3 className="text-sm font-medium mb-2">
                              Previous Orders:
                            </h3>
                            {unliwingsHistory.map((flavors, index) => (
                              <div
                                key={index}
                                className="text-sm text-muted-foreground"
                              >
                                Order #{index + 1}: {flavors.join(', ')}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Refresher size selection */}
                {category === 'Refreshers' && selectedRefresher && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">
                        Select size for {selectedRefresher.name}
                      </h2>
                      <Button
                        variant="ghost"
                        onClick={handleCloseRefresher}
                        className="text-white bg-red-500 hover:bg-red-600 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2">
                      {selectedRefresher.sizes.map((size) => {
                        const sizedItemId = `${selectedRefresher.id}_${size.size}`;
                        const sizedQuantity = getItemQuantity(sizedItemId);

                        return (
                          <div key={size.size} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center p-2 border rounded-lg">
                              <div>
                                <p className="font-semibold">{size.size}</p>
                                <p className="text-sm text-muted-foreground">
                                  ₱{size.price.toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {sizedQuantity > 0 ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() =>
                                        removeFromOrder(sizedItemId)
                                      }
                                    >
                                      <MinusCircle className="h-4 w-4" />
                                    </Button>
                                    <span className="font-medium w-8 text-center">
                                      {sizedQuantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() =>
                                        addToOrder(selectedRefresher, size)
                                      }
                                    >
                                      <PlusCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      addToOrder(selectedRefresher, size)
                                    }
                                  >
                                    Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Flavor selection for other items */}
                {(category === 'Ala Carte' || category === 'Rice Meals') &&
                  orderItems
                    .filter(
                      (item) =>
                        item.maxFlavors > 0 && item.category === category
                    )
                    .map((item) => (
                      <div key={item.id} className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-semibold">
                            Select flavors for {item.name} ({item.quantity}x)
                          </h2>
                          <span className="text-sm text-muted-foreground">
                            ({(itemFlavors[item.id] || []).length}/
                            {item.maxFlavors} flavors)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {WING_FLAVORS.map((flavor) => (
                            <Button
                              key={`${item.id}_${flavor}`}
                              variant={
                                (itemFlavors[item.id] || []).includes(flavor)
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() => toggleItemFlavor(item.id, flavor)}
                              className="w-full"
                              disabled={
                                !(itemFlavors[item.id] || []).includes(
                                  flavor
                                ) &&
                                (itemFlavors[item.id] || []).length >=
                                  item.maxFlavors
                              }
                            >
                              {flavor}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}

                {/* Menu items grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuByCategory[category].map((item) => {
                    if (item.isUnliwings && hasActiveUnliwingsOrder) {
                      return null;
                    }

                    const quantity = getItemQuantity(item.id);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="overflow-hidden hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{item.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              </div>
                              {!item.sizes && (
                                <span className="font-semibold">
                                  ₱{item.price?.toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div className="mt-4">
                              {item.category === 'Refreshers' ? (
                                <Button
                                  className="w-full"
                                  variant="outline"
                                  onClick={() => handleRefresherSelect(item)}
                                >
                                  Select Size
                                </Button>
                              ) : (
                                <div>
                                  {quantity > 0 ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => removeFromOrder(item.id)}
                                      >
                                        <MinusCircle className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => addToOrder(item)}
                                      >
                                        <PlusCircle className="h-4 w-4" />
                                      </Button>
                                      <span className="font-medium w-8 text-center">
                                        {quantity}
                                      </span>
                                    </div>
                                  ) : (
                                    <Button
                                      className="w-full"
                                      variant="outline"
                                      onClick={() => addToOrder(item)}
                                    >
                                      Add to Order
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </ScrollArea>

        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-11/12 max-w-4xl bg-white shadow-lg p-4 rounded-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {totalItems} item{totalItems > 1 ? 's' : ''}
                </p>
                <p className="text-lg font-bold">₱{totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <Button onClick={submitOrder} className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Submit Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderMenu;
