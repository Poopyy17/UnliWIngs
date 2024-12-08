import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Utensils, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

const InitialChoice = () => {
  const navigate = useNavigate();

  const handleDineIn = () => {
    navigate('/scan-qr');
  };

  const handleTakeOut = () => {
    navigate('/order');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome!</h1>
        <p className="text-muted-foreground">
          Please select your dining preference
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full px-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={handleDineIn}
          >
            <CardContent className="flex flex-col items-center p-6">
              <Utensils className="h-12 w-12 mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">Dine In</h2>
              <p className="text-sm text-muted-foreground text-center">
                Scan QR code at your table
              </p>
              <Button size="lg" className="mt-6 w-full" onClick={handleDineIn}>
                Select
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={handleTakeOut}
          >
            <CardContent className="flex flex-col items-center p-6">
              <ShoppingBag className="h-12 w-12 mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">Take Out</h2>
              <p className="text-sm text-muted-foreground text-center">
                Order for pickup
              </p>
              <Button size="lg" className="mt-6 w-full" onClick={handleTakeOut}>
                Select
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default InitialChoice;
